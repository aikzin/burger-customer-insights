-- Permite que um usuário autenticado crie com segurança sua primeira organização.
alter table public.organizations
  add column created_by uuid references public.profiles(id) on delete restrict;

create policy "users create organizations"
on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "owners create first admin membership"
on public.organization_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'admin'::public.app_role
  and exists (
    select 1 from public.organizations organization
    where organization.id = organization_id
      and organization.created_by = (select auth.uid())
  )
);

grant insert on public.organizations, public.organization_members to authenticated;
