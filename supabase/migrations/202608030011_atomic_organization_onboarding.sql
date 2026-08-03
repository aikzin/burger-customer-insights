create or replace function public.create_organization(p_name text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := btrim(p_name);
  organization_id uuid;
  organization_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(normalized_name) < 2 or char_length(normalized_name) > 120 then
    raise exception 'Organization name must have between 2 and 120 characters'
      using errcode = '23514';
  end if;

  select member.organization_id, organization.name
    into organization_id, organization_name
  from public.organization_members as member
  join public.organizations as organization on organization.id = member.organization_id
  where member.user_id = current_user_id
    and member.active
  limit 1;

  if organization_id is not null then
    return jsonb_build_object('id', organization_id, 'name', organization_name);
  end if;

  insert into public.organizations (name, created_by)
  values (normalized_name, current_user_id)
  returning id, name into organization_id, organization_name;

  insert into public.organization_members (organization_id, user_id, role)
  values (organization_id, current_user_id, 'admin');

  return jsonb_build_object('id', organization_id, 'name', organization_name);
end;
$$;

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
