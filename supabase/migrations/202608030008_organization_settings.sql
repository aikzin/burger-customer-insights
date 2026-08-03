create policy "admins update organizations"
on public.organizations for update to authenticated
using (public.has_org_role(id,array['admin']::public.app_role[]))
with check (public.has_org_role(id,array['admin']::public.app_role[]));

grant update(name) on public.organizations to authenticated;
