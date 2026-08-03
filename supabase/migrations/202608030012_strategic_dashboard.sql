-- Base analítica para decisões de preço, operação, clientes e estoque.

alter table public.organizations
  add column if not exists target_food_cost_percent numeric(5,2) not null default 35
    check (target_food_cost_percent between 5 and 95),
  add column if not exists target_prep_minutes integer not null default 20
    check (target_prep_minutes between 1 and 240),
  add column if not exists target_delivery_minutes integer not null default 45
    check (target_delivery_minutes between 1 and 480);

grant update(target_food_cost_percent, target_prep_minutes, target_delivery_minutes)
  on public.organizations to authenticated;

alter table public.orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists delivered_at timestamptz;

create or replace function public.capture_order_stage_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.operational_status is distinct from old.operational_status then
    case new.operational_status
      when 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now());
      when 'preparing' then new.preparing_at := coalesce(new.preparing_at, now());
      when 'ready' then new.ready_at := coalesce(new.ready_at, now());
      when 'out_for_delivery' then new.dispatched_at := coalesce(new.dispatched_at, now());
      when 'delivered' then new.delivered_at := coalesce(new.delivered_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$;

drop trigger if exists capture_order_stage_timestamps on public.orders;
create trigger capture_order_stage_timestamps
before update of operational_status on public.orders
for each row execute function public.capture_order_stage_timestamps();

create or replace function public.save_product_recipe(
  p_product_id uuid,
  p_items jsonb
) returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_requested integer := 0;
  v_valid integer := 0;
  v_cost numeric(12,4) := 0;
begin
  select organization_id into v_organization_id
  from public.products
  where id = p_product_id;

  if v_organization_id is null or not public.has_org_role(
    v_organization_id,
    array['admin','manager','stock']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_recipe';
  end if;

  select count(*) into v_requested
  from jsonb_array_elements(p_items);

  select count(*) into v_valid
  from (
    select (value->>'ingredient_id')::uuid as ingredient_id,
           (value->>'quantity')::numeric as quantity
    from jsonb_array_elements(p_items)
  ) item
  join public.ingredients ingredient
    on ingredient.id = item.ingredient_id
   and ingredient.organization_id = v_organization_id
  where item.quantity > 0;

  if v_valid <> v_requested then
    raise exception 'invalid_recipe_items';
  end if;

  delete from public.recipe_items where product_id = p_product_id;

  insert into public.recipe_items (product_id, ingredient_id, quantity)
  select p_product_id, item.ingredient_id, item.quantity
  from (
    select (value->>'ingredient_id')::uuid as ingredient_id,
           (value->>'quantity')::numeric as quantity
    from jsonb_array_elements(p_items)
  ) item;

  select coalesce(sum(recipe.quantity * ingredient.average_cost), 0)
    into v_cost
  from public.recipe_items recipe
  join public.ingredients ingredient on ingredient.id = recipe.ingredient_id
  where recipe.product_id = p_product_id;

  return round(v_cost, 4);
end;
$$;

revoke all on function public.save_product_recipe(uuid,jsonb) from public, anon;
grant execute on function public.save_product_recipe(uuid,jsonb) to authenticated;

create or replace function public.create_order(
  p_organization_id uuid,
  p_customer_id uuid,
  p_channel text,
  p_items jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_order_id uuid := gen_random_uuid();
  calculated_subtotal numeric(12,2);
  requested_items integer;
  valid_items integer;
begin
  if not public.has_org_role(
    p_organization_id,
    array['admin','manager','cashier']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if p_channel not in ('counter','delivery','pickup','whatsapp') then
    raise exception 'invalid_channel';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  select count(*) into requested_items from jsonb_array_elements(p_items);

  select count(*), sum(product.sale_price * item.quantity)
    into valid_items, calculated_subtotal
  from (
    select (value->>'product_id')::uuid as product_id,
           (value->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  ) item
  join public.products product
    on product.id = item.product_id
   and product.organization_id = p_organization_id
   and product.active
  where item.quantity > 0;

  if valid_items <> requested_items then
    raise exception 'invalid_order_items';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id and organization_id = p_organization_id
  ) then
    raise exception 'invalid_customer';
  end if;

  insert into public.orders (
    id, organization_id, customer_id, attendant_id, channel, subtotal
  ) values (
    new_order_id, p_organization_id, p_customer_id, auth.uid(), p_channel, calculated_subtotal
  );

  insert into public.order_items (order_id, product_id, quantity, unit_price, unit_cost)
  select new_order_id,
         product.id,
         item.quantity,
         product.sale_price,
         case when recipe.recipe_count > 0 then recipe.recipe_cost else null end
  from (
    select (value->>'product_id')::uuid as product_id,
           (value->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  ) item
  join public.products product
    on product.id = item.product_id
   and product.organization_id = p_organization_id
  left join lateral (
    select count(*) as recipe_count,
           coalesce(sum(recipe_item.quantity * ingredient.average_cost), 0) as recipe_cost
    from public.recipe_items recipe_item
    join public.ingredients ingredient on ingredient.id = recipe_item.ingredient_id
    where recipe_item.product_id = product.id
  ) recipe on true;

  return new_order_id;
end;
$$;

revoke all on function public.create_order(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.create_order(uuid,uuid,text,jsonb) to authenticated;

create or replace function public.get_business_dashboard(
  p_organization_id uuid,
  p_period_days integer default 30
) returns jsonb
language plpgsql
security invoker
stable
set search_path = ''
as $$
declare
  v_days integer := case when p_period_days in (7, 30, 90) then p_period_days else 30 end;
  v_now timestamptz := now();
  v_start timestamptz;
  v_previous_start timestamptz;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_target_food_cost numeric;
  v_target_prep integer;
  v_target_delivery integer;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'permission_denied';
  end if;

  v_start := v_now - make_interval(days => v_days);
  v_previous_start := v_start - make_interval(days => v_days);

  select target_food_cost_percent, target_prep_minutes, target_delivery_minutes
    into v_target_food_cost, v_target_prep, v_target_delivery
  from public.organizations
  where id = p_organization_id;

  return (
    with current_orders as (
      select * from public.orders
      where organization_id = p_organization_id and created_at >= v_start
    ),
    previous_orders as (
      select * from public.orders
      where organization_id = p_organization_id
        and created_at >= v_previous_start and created_at < v_start
    ),
    paid_current as (
      select * from current_orders where payment_status = 'paid'
    ),
    paid_previous as (
      select * from previous_orders where payment_status = 'paid'
    ),
    all_paid_customer_orders as (
      select id, customer_id, total, created_at,
             lag(created_at) over (partition by customer_id order by created_at) as previous_order_at
      from public.orders
      where organization_id = p_organization_id
        and payment_status = 'paid'
        and customer_id is not null
    ),
    customer_lifetime as (
      select customer_id, count(*) as lifetime_orders
      from all_paid_customer_orders
      group by customer_id
    ),
    current_customer_metrics as (
      select customer.id,
             customer.name,
             count(paid.id) as orders,
             coalesce(sum(paid.total), 0) as revenue,
             max(paid.created_at) as last_order_at,
             coalesce(lifetime.lifetime_orders, 0) as lifetime_orders
      from public.customers customer
      left join paid_current paid on paid.customer_id = customer.id
      left join customer_lifetime lifetime on lifetime.customer_id = customer.id
      where customer.organization_id = p_organization_id
      group by customer.id, customer.name, lifetime.lifetime_orders
    ),
    recipe_costs as (
      select product.id as product_id,
             count(recipe.ingredient_id) as ingredient_count,
             coalesce(sum(recipe.quantity * ingredient.average_cost), 0) as recipe_cost
      from public.products product
      left join public.recipe_items recipe on recipe.product_id = product.id
      left join public.ingredients ingredient on ingredient.id = recipe.ingredient_id
      where product.organization_id = p_organization_id
      group by product.id
    ),
    product_metrics as (
      select product.id,
             product.name,
             product.sale_price,
             product.active,
             recipe.ingredient_count,
             recipe.recipe_cost,
             coalesce(sum(item.quantity) filter (where paid.id is not null), 0) as units,
             coalesce(sum(item.quantity * item.unit_price) filter (where paid.id is not null), 0) as revenue,
             case
               when count(item.id) filter (where paid.id is not null) > 0
                and count(item.id) filter (where paid.id is not null and item.unit_cost is not null)
                    = count(item.id) filter (where paid.id is not null)
               then coalesce(sum(item.quantity * (item.unit_price - item.unit_cost)) filter (where paid.id is not null), 0)
               else null
             end as gross_margin
      from public.products product
      join recipe_costs recipe on recipe.product_id = product.id
      left join public.order_items item on item.product_id = product.id
      left join paid_current paid on paid.id = item.order_id
      where product.organization_id = p_organization_id
      group by product.id, product.name, product.sale_price, product.active,
               recipe.ingredient_count, recipe.recipe_cost
    ),
    movement_days as (
      select generate_series(v_today - (v_days - 1), v_today, interval '1 day')::date as day
    ),
    movement as (
      select day.day,
             count(paid.id) as orders,
             coalesce(sum(paid.total), 0) as revenue
      from movement_days day
      left join paid_current paid
        on (paid.created_at at time zone 'America/Sao_Paulo')::date = day.day
      group by day.day
      order by day.day
    ),
    channel_metrics as (
      select channel, count(*) as orders, coalesce(sum(total), 0) as revenue
      from paid_current
      group by channel
    ),
    stock_metrics as (
      select ingredient.id,
             ingredient.name,
             ingredient.unit,
             ingredient.stock_quantity,
             ingredient.minimum_stock,
             ingredient.average_cost,
             coalesce(usage.daily_usage, 0) as daily_usage,
             case when coalesce(usage.daily_usage, 0) > 0
               then round(ingredient.stock_quantity / usage.daily_usage, 1)
               else null
             end as coverage_days
      from public.ingredients ingredient
      left join lateral (
        select sum(order_item.quantity * recipe.quantity) / greatest(v_days, 1) as daily_usage
        from public.recipe_items recipe
        join public.order_items order_item on order_item.product_id = recipe.product_id
        join paid_current paid on paid.id = order_item.order_id
        where recipe.ingredient_id = ingredient.id
      ) usage on true
      where ingredient.organization_id = p_organization_id
    )
    select jsonb_build_object(
      'generated_at', v_now,
      'period_days', v_days,
      'targets', jsonb_build_object(
        'food_cost_percent', v_target_food_cost,
        'prep_minutes', v_target_prep,
        'delivery_minutes', v_target_delivery
      ),
      'kpis', jsonb_build_object(
        'revenue_today', (
          select coalesce(sum(total), 0) from public.orders
          where organization_id = p_organization_id and payment_status = 'paid'
            and (created_at at time zone 'America/Sao_Paulo')::date = v_today
        ),
        'revenue_week', (
          select coalesce(sum(total), 0) from public.orders
          where organization_id = p_organization_id and payment_status = 'paid'
            and (created_at at time zone 'America/Sao_Paulo')::date >= date_trunc('week', v_today::timestamp)::date
        ),
        'revenue_month', (
          select coalesce(sum(total), 0) from public.orders
          where organization_id = p_organization_id and payment_status = 'paid'
            and (created_at at time zone 'America/Sao_Paulo')::date >= date_trunc('month', v_today::timestamp)::date
        ),
        'revenue', (select coalesce(sum(total), 0) from paid_current),
        'revenue_previous', (select coalesce(sum(total), 0) from paid_previous),
        'orders', (select count(*) from current_orders where operational_status <> 'cancelled'),
        'orders_previous', (select count(*) from previous_orders where operational_status <> 'cancelled'),
        'paid_orders', (select count(*) from paid_current),
        'ticket', (select coalesce(avg(total), 0) from paid_current),
        'ticket_previous', (select coalesce(avg(total), 0) from paid_previous),
        'identified_order_rate', (
          select case when count(*) = 0 then 0
            else round(100.0 * count(*) filter (where customer_id is not null) / count(*), 1)
          end from paid_current
        ),
        'repeat_customer_rate', (
          select case when count(*) = 0 then 0
            else round(100.0 * count(*) filter (where lifetime_orders > 1) / count(*), 1)
          end
          from current_customer_metrics where orders > 0
        ),
        'average_rating', (
          select round(avg(rating), 1) from public.reviews
          where organization_id = p_organization_id and created_at >= v_start
        ),
        'reviews_count', (
          select count(*) from public.reviews
          where organization_id = p_organization_id and created_at >= v_start
        ),
        'average_return_days', (
          select round(avg(extract(epoch from (created_at - previous_order_at)) / 86400.0), 1)
          from all_paid_customer_orders where previous_order_at is not null
        ),
        'gross_margin', (
          select case
            when count(item.id) = 0 or count(item.id) filter (where item.unit_cost is not null) <> count(item.id)
              then null
            else coalesce(sum(item.quantity * (item.unit_price - item.unit_cost)), 0)
          end
          from public.order_items item join paid_current paid on paid.id = item.order_id
        )
      ),
      'movement', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'date', day, 'orders', orders, 'revenue', revenue
        ) order by day), '[]'::jsonb) from movement
      ),
      'products', (
        select coalesce(jsonb_agg(to_jsonb(ranked) order by ranked.revenue desc), '[]'::jsonb)
        from (
          select id, name, sale_price, units, revenue, gross_margin
          from product_metrics
          where units > 0
          order by revenue desc, units desc
          limit 8
        ) ranked
      ),
      'pricing', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id,
          'name', name,
          'sale_price', sale_price,
          'recipe_cost', recipe_cost,
          'ingredient_count', ingredient_count,
          'food_cost_percent', case when ingredient_count > 0 and sale_price > 0
            then round(100.0 * recipe_cost / sale_price, 1) else null end,
          'suggested_price', case when ingredient_count > 0 and v_target_food_cost > 0
            then round(recipe_cost / (v_target_food_cost / 100.0), 2) else null end
        ) order by
          case when ingredient_count = 0 then 0 else 1 end,
          case when sale_price > 0 then recipe_cost / sale_price else 0 end desc
        ), '[]'::jsonb)
        from product_metrics where active
      ),
      'customers', (
        select coalesce(jsonb_agg(to_jsonb(ranked) order by ranked.revenue desc), '[]'::jsonb)
        from (
          select id, name, orders, revenue, last_order_at, lifetime_orders
          from current_customer_metrics
          where orders > 0
          order by revenue desc, orders desc
          limit 6
        ) ranked
      ),
      'channels', (
        select coalesce(jsonb_agg(to_jsonb(channel_metrics) order by revenue desc), '[]'::jsonb)
        from channel_metrics
      ),
      'payment_methods', (
        select coalesce(jsonb_agg(to_jsonb(methods) order by methods.revenue desc), '[]'::jsonb)
        from (
          select payment.method, count(*) as payments, coalesce(sum(payment.amount), 0) as revenue
          from public.payments payment
          join paid_current paid on paid.id = payment.order_id
          where payment.status = 'paid'
          group by payment.method
        ) methods
      ),
      'operations', jsonb_build_object(
        'active_orders', (
          select count(*) from public.orders
          where organization_id = p_organization_id
            and operational_status not in ('delivered','cancelled')
        ),
        'late_active_orders', (
          select count(*) from public.orders
          where organization_id = p_organization_id
            and operational_status not in ('delivered','cancelled')
            and created_at < v_now - make_interval(mins => v_target_prep)
        ),
        'cancellation_rate', (
          select case when count(*) = 0 then 0
            else round(100.0 * count(*) filter (where operational_status = 'cancelled') / count(*), 1)
          end from current_orders
        ),
        'average_prep_minutes', (
          select round(avg(extract(epoch from (ready_at - preparing_at)) / 60.0), 1)
          from current_orders where ready_at is not null and preparing_at is not null and ready_at >= preparing_at
        ),
        'average_delivery_minutes', (
          select round(avg(extract(epoch from (delivered_at - dispatched_at)) / 60.0), 1)
          from current_orders where delivered_at is not null and dispatched_at is not null and delivered_at >= dispatched_at
        ),
        'average_cycle_minutes', (
          select round(avg(extract(epoch from (coalesce(delivered_at, updated_at) - created_at)) / 60.0), 1)
          from current_orders where operational_status = 'delivered'
        ),
        'timed_prep_orders', (
          select count(*) from current_orders where ready_at is not null and preparing_at is not null
        ),
        'timed_delivery_orders', (
          select count(*) from current_orders where delivered_at is not null and dispatched_at is not null
        ),
        'status_mix', (
          select coalesce(jsonb_agg(to_jsonb(statuses) order by statuses.orders desc), '[]'::jsonb)
          from (
            select operational_status as status, count(*) as orders
            from current_orders group by operational_status
          ) statuses
        )
      ),
      'inventory', jsonb_build_object(
        'stock_value', (select coalesce(sum(stock_quantity * average_cost), 0) from stock_metrics),
        'low_stock_count', (select count(*) from stock_metrics where stock_quantity <= minimum_stock),
        'alerts', (
          select coalesce(jsonb_agg(to_jsonb(alerts) order by alerts.coverage_days nulls last), '[]'::jsonb)
          from (
            select id, name, unit, stock_quantity, minimum_stock, coverage_days
            from stock_metrics
            where stock_quantity <= minimum_stock or (coverage_days is not null and coverage_days <= 7)
            order by coverage_days nulls last
            limit 8
          ) alerts
        )
      ),
      'data_quality', jsonb_build_object(
        'recipe_coverage', (
          select case when count(*) = 0 then 0
            else round(100.0 * count(*) filter (where ingredient_count > 0) / count(*), 1)
          end from product_metrics where active
        ),
        'cost_coverage', (
          select case when count(item.id) = 0 then 0
            else round(100.0 * count(item.id) filter (where item.unit_cost is not null) / count(item.id), 1)
          end from public.order_items item join paid_current paid on paid.id = item.order_id
        ),
        'identified_order_coverage', (
          select case when count(*) = 0 then 0
            else round(100.0 * count(*) filter (where customer_id is not null) / count(*), 1)
          end from paid_current
        ),
        'timing_coverage', (
          select case when count(*) filter (where operational_status = 'delivered') = 0 then 0
            else round(100.0 * count(*) filter (
              where operational_status = 'delivered' and preparing_at is not null and ready_at is not null
            ) / count(*) filter (where operational_status = 'delivered'), 1)
          end from current_orders
        )
      )
    )
  );
end;
$$;

revoke all on function public.get_business_dashboard(uuid,integer) from public, anon;
grant execute on function public.get_business_dashboard(uuid,integer) to authenticated;
