-- Fase 1: base multiempresa, autenticação, perfis e entidades operacionais centrais.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin','manager','cashier','kitchen','stock');
create type public.order_status as enum ('received','confirmed','preparing','ready','out_for_delivery','delivered','cancelled');
create type public.payment_status as enum ('pending','paid','partially_paid','refunded','cancelled');
create type public.delivery_status as enum ('not_applicable','pending','dispatched','delivered','failed');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, role public.app_role not null,
  active boolean not null default true, primary key (organization_id,user_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, phone text not null, email text, birth_date date, address jsonb not null default '{}'::jsonb,
  preferences text, dietary_restrictions text, notes text, marketing_consent boolean not null default false,
  anonymized_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, phone)
);
create table public.categories (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, name text not null, unique(organization_id,name));
create table public.products (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, name text not null, sale_price numeric(12,2) not null check(sale_price >= 0),
  active boolean not null default true, preparation_minutes integer check(preparation_minutes >= 0), image_path text, created_at timestamptz not null default now()
);
create table public.ingredients (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, unit text not null, stock_quantity numeric(14,3) not null default 0 check(stock_quantity >= 0),
  minimum_stock numeric(14,3) not null default 0 check(minimum_stock >= 0), average_cost numeric(12,4) not null default 0 check(average_cost >= 0), unique(organization_id,name)
);
create table public.recipe_items (
  product_id uuid not null references public.products(id) on delete cascade, ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,3) not null check(quantity > 0), primary key(product_id,ingredient_id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null, attendant_id uuid references public.profiles(id) on delete set null,
  channel text not null, operational_status public.order_status not null default 'received', payment_status public.payment_status not null default 'pending',
  delivery_status public.delivery_status not null default 'not_applicable', subtotal numeric(12,2) not null default 0 check(subtotal >= 0),
  discount numeric(12,2) not null default 0 check(discount >= 0), delivery_fee numeric(12,2) not null default 0 check(delivery_fee >= 0),
  total numeric(12,2) generated always as (subtotal - discount + delivery_fee) stored,
  cancellation_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(operational_status <> 'cancelled' or nullif(trim(cancellation_reason),'') is not null), check(discount <= subtotal)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict, quantity integer not null check(quantity > 0),
  unit_price numeric(12,2) not null check(unit_price >= 0), unit_cost numeric(12,4) check(unit_cost >= 0), notes text
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  method text not null, amount numeric(12,2) not null check(amount > 0), status public.payment_status not null default 'pending', paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null, entity text not null, entity_id uuid, action text not null,
  changes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index customers_org_idx on public.customers(organization_id);
create index orders_org_created_idx on public.orders(organization_id,created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index products_org_idx on public.products(organization_id);
create index organization_members_user_idx on public.organization_members(user_id) where active;
create index products_category_idx on public.products(category_id);
create index recipe_items_ingredient_idx on public.recipe_items(ingredient_id);
create index orders_customer_idx on public.orders(customer_id);
create index orders_attendant_idx on public.orders(attendant_id);
create index order_items_product_idx on public.order_items(product_id);
create index payments_order_idx on public.payments(order_id);
create index audit_log_org_created_idx on public.audit_log(organization_id,created_at desc);
create index audit_log_actor_idx on public.audit_log(actor_id);

create or replace function private.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(coalesce(new.email,'Usuário'),'@',1)));
  return new;
end;
$$;
revoke all on function private.create_profile_for_auth_user() from public,anon,authenticated;
create trigger auth_user_created_profile after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
revoke all on function private.set_updated_at() from public,anon,authenticated;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function private.set_updated_at();

create or replace function public.is_org_member(org_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=(select auth.uid()) and m.active);
$$;
create or replace function public.has_org_role(org_id uuid, allowed public.app_role[]) returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=(select auth.uid()) and m.active and m.role=any(allowed));
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

create policy "members read organizations" on public.organizations for select to authenticated using(public.is_org_member(id));
create policy "users read own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "users read own memberships" on public.organization_members for select to authenticated using(user_id=(select auth.uid()));

create policy "members read customers" on public.customers for select to authenticated using(public.is_org_member(organization_id));
create policy "sales manage customers" on public.customers for all to authenticated using(public.has_org_role(organization_id,array['admin','manager','cashier']::public.app_role[])) with check(public.has_org_role(organization_id,array['admin','manager','cashier']::public.app_role[]));
create policy "members read categories" on public.categories for select to authenticated using(public.is_org_member(organization_id));
create policy "management manages categories" on public.categories for all to authenticated using(public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[])) with check(public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));
create policy "members read products" on public.products for select to authenticated using(public.is_org_member(organization_id));
create policy "management manages products" on public.products for all to authenticated using(public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[])) with check(public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));
create policy "members read ingredients" on public.ingredients for select to authenticated using(public.is_org_member(organization_id));
create policy "stock manages ingredients" on public.ingredients for all to authenticated using(public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[])) with check(public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));
create policy "members read orders" on public.orders for select to authenticated using(public.is_org_member(organization_id));
create policy "sales creates orders" on public.orders for insert to authenticated with check(public.has_org_role(organization_id,array['admin','manager','cashier']::public.app_role[]));
create policy "operations updates orders" on public.orders for update to authenticated using(public.has_org_role(organization_id,array['admin','manager','cashier','kitchen']::public.app_role[])) with check(public.has_org_role(organization_id,array['admin','manager','cashier','kitchen']::public.app_role[]));
create policy "members read audit" on public.audit_log for select to authenticated using(public.has_org_role(organization_id,array['admin','manager']::public.app_role[]));

-- Child rows inherit organization access through their parent.
create policy "members access recipes" on public.recipe_items for select to authenticated using(exists(select 1 from public.products p where p.id=product_id and public.is_org_member(p.organization_id)));
create policy "stock manages recipes" on public.recipe_items for all to authenticated using(exists(select 1 from public.products p where p.id=product_id and public.has_org_role(p.organization_id,array['admin','manager','stock']::public.app_role[]))) with check(exists(select 1 from public.products p where p.id=product_id and public.has_org_role(p.organization_id,array['admin','manager','stock']::public.app_role[])));
create policy "members access order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and public.is_org_member(o.organization_id)));
create policy "sales manages order items" on public.order_items for all to authenticated using(exists(select 1 from public.orders o where o.id=order_id and public.has_org_role(o.organization_id,array['admin','manager','cashier']::public.app_role[]))) with check(exists(select 1 from public.orders o where o.id=order_id and public.has_org_role(o.organization_id,array['admin','manager','cashier']::public.app_role[])));
create policy "finance accesses payments" on public.payments for all to authenticated using(exists(select 1 from public.orders o where o.id=order_id and public.has_org_role(o.organization_id,array['admin','manager','cashier']::public.app_role[]))) with check(exists(select 1 from public.orders o where o.id=order_id and public.has_org_role(o.organization_id,array['admin','manager','cashier']::public.app_role[])));

grant usage on schema public to authenticated;
grant select on public.organizations,public.organization_members,public.audit_log to authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update on public.customers,public.categories,public.products,public.ingredients,public.orders,public.order_items,public.payments to authenticated;
grant select,insert,update,delete on public.recipe_items to authenticated;
