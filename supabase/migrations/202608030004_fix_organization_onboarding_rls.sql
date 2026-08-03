-- O criador precisa enxergar a organização recém-inserida para que a
-- política de criação da primeira associação de administrador possa validá-la.
drop policy "members read organizations" on public.organizations;

create policy "owners and members read organizations"
on public.organizations for select to authenticated
using (
  created_by = (select auth.uid())
  or public.is_org_member(id)
);
