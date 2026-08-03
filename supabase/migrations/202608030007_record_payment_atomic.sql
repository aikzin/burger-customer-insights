create or replace function public.record_payment(
  p_order_id uuid,
  p_method text,
  p_amount numeric
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  already_paid numeric(12,2);
  new_payment_id uuid := gen_random_uuid();
  new_total_paid numeric(12,2);
begin
  select * into target_order from public.orders where id = p_order_id for update;
  if not found or not public.has_org_role(
    target_order.organization_id,
    array['admin','manager','cashier']::public.app_role[]
  ) then
    raise exception 'permission_denied';
  end if;

  if p_amount <= 0 or p_method not in ('cash','pix','credit_card','debit_card','voucher') then
    raise exception 'invalid_payment';
  end if;

  select coalesce(sum(amount),0) into already_paid
  from public.payments where order_id = p_order_id and status = 'paid';

  if already_paid + p_amount > target_order.total then
    raise exception 'payment_exceeds_total';
  end if;

  insert into public.payments (id,order_id,method,amount,status,paid_at)
  values (new_payment_id,p_order_id,p_method,p_amount,'paid',now());

  new_total_paid := already_paid + p_amount;
  update public.orders
  set payment_status = case
    when new_total_paid = total then 'paid'::public.payment_status
    else 'partially_paid'::public.payment_status
  end
  where id = p_order_id;

  return new_payment_id;
end;
$$;

revoke all on function public.record_payment(uuid,text,numeric) from public, anon;
grant execute on function public.record_payment(uuid,text,numeric) to authenticated;
