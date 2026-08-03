-- Módulos operacionais complementares: compras, marketing e avaliações.
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text not null check (char_length(trim(description)) between 2 and 200),
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'planned' check (status in ('planned','ordered','received','cancelled')),
  expected_at date,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  channel text not null check (channel in ('whatsapp','instagram','email','other')),
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  budget numeric(12,2) not null default 0 check (budget >= 0),
  starts_at date,
  ends_at date,
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  source text not null default 'direct' check (source in ('direct','google','instagram','ifood','other')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index suppliers_org_idx on public.suppliers(organization_id);
create index purchases_org_created_idx on public.purchases(organization_id, created_at desc);
create index purchases_supplier_idx on public.purchases(supplier_id);
create index campaigns_org_created_idx on public.marketing_campaigns(organization_id, created_at desc);
create index reviews_org_created_idx on public.reviews(organization_id, created_at desc);
create index reviews_customer_idx on public.reviews(customer_id);
create index reviews_order_idx on public.reviews(order_id);

alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.reviews enable row level security;

create policy "members read suppliers" on public.suppliers for select to authenticated
  using (public.is_org_member(organization_id));
create policy "stock manages suppliers" on public.suppliers for insert to authenticated
  with check (public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));
create policy "stock updates suppliers" on public.suppliers for update to authenticated
  using (public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]))
  with check (public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));

create policy "members read purchases" on public.purchases for select to authenticated
  using (public.is_org_member(organization_id));
create policy "stock creates purchases" on public.purchases for insert to authenticated
  with check (public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));
create policy "stock updates purchases" on public.purchases for update to authenticated
  using (public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]))
  with check (public.has_org_role(organization_id,array['admin','manager','stock']::public.app_role[]));

create policy "members read campaigns" on public.marketing_campaigns for select to authenticated
  using (public.is_org_member(organization_id));
create policy "management creates campaigns" on public.marketing_campaigns for insert to authenticated
  with check (public.has_org_role(organization_id,array['admin','manager']::public.app_role[]));
create policy "management updates campaigns" on public.marketing_campaigns for update to authenticated
  using (public.has_org_role(organization_id,array['admin','manager']::public.app_role[]))
  with check (public.has_org_role(organization_id,array['admin','manager']::public.app_role[]));

create policy "members read reviews" on public.reviews for select to authenticated
  using (public.is_org_member(organization_id));
create policy "management creates reviews" on public.reviews for insert to authenticated
  with check (public.has_org_role(organization_id,array['admin','manager']::public.app_role[]));
create policy "management updates reviews" on public.reviews for update to authenticated
  using (public.has_org_role(organization_id,array['admin','manager']::public.app_role[]))
  with check (public.has_org_role(organization_id,array['admin','manager']::public.app_role[]));

grant select,insert,update on public.suppliers,public.purchases,public.marketing_campaigns,public.reviews to authenticated;
