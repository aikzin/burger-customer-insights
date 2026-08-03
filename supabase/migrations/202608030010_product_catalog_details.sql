-- Preserva a composição e a chamada comercial dos itens do cardápio.
alter table public.products
  add column if not exists description text,
  add column if not exists sales_hook text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_organization_name_unique'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_organization_name_unique
      unique (organization_id, name);
  end if;
end
$$;
