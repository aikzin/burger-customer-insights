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

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select new_order_id, product.id, item.quantity, product.sale_price
  from (
    select (value->>'product_id')::uuid as product_id,
           (value->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items)
  ) item
  join public.products product on product.id = item.product_id;

  return new_order_id;
end;
$$;

revoke all on function public.create_order(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.create_order(uuid,uuid,text,jsonb) to authenticated;
