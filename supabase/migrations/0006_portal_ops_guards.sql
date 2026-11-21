begin;

-- Shared monetary and car odometer checks are installed by 0005.
alter table public.vehicle_checks add constraint vehicle_checks_odometer_nonnegative check (odometer is null or odometer >= 0);

create or replace function public.record_handover(
  p_booking_id uuid,
  p_odometer int,
  p_battery int,
  p_accessories text,
  p_damage_note text,
  p_checked_by text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_role text := public.current_user_role();
begin
  if v_role not in ('admin', 'staff') then
    raise exception 'Không có quyền bàn giao xe';
  end if;
  if p_odometer is null or p_odometer < 0 then raise exception 'ODO không hợp lệ'; end if;
  if p_battery is null or p_battery < 0 or p_battery > 100 then raise exception 'Mức pin không hợp lệ'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Không tìm thấy đơn thuê'; end if;
  if v_booking.status <> 'signed' then raise exception 'Chỉ bàn giao đơn đã ký hợp đồng'; end if;

  insert into public.vehicle_checks(
    booking_id, kind, odometer, battery, accessories, damage_note, checked_by
  ) values (
    v_booking.id, 'handover', p_odometer, p_battery,
    left(coalesce(p_accessories, ''), 2000), left(coalesce(p_damage_note, ''), 2000),
    left(coalesce(nullif(p_checked_by, ''), 'Nhân viên'), 200)
  );

  update public.bookings set status = 'handed_over' where id = v_booking.id;
  update public.cars
  set status = 'rented', odometer = p_odometer, battery = p_battery
  where id = v_booking.car_id;
end;
$$;

create or replace function public.record_return(
  p_booking_id uuid,
  p_odometer int,
  p_battery int,
  p_fees numeric,
  p_damage_note text,
  p_checked_by text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_handover public.vehicle_checks;
  v_role text := public.current_user_role();
begin
  if v_role not in ('admin', 'staff') then raise exception 'Không có quyền tiếp nhận xe trả'; end if;
  if p_odometer is null or p_odometer < 0 then raise exception 'ODO không hợp lệ'; end if;
  if p_battery is null or p_battery < 0 or p_battery > 100 then raise exception 'Mức pin không hợp lệ'; end if;
  if p_fees is null or p_fees < 0 then raise exception 'Phí phát sinh không hợp lệ'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Không tìm thấy đơn thuê'; end if;
  if v_booking.status <> 'handed_over' then raise exception 'Chỉ tiếp nhận đơn đang ở trạng thái đang thuê'; end if;

  select * into v_handover
  from public.vehicle_checks
  where booking_id = v_booking.id and kind = 'handover'
  order by created_at desc limit 1
  for update;

  if v_handover.id is not null and p_odometer < v_handover.odometer then
    raise exception 'ODO trả xe không được nhỏ hơn ODO lúc bàn giao';
  end if;

  insert into public.vehicle_checks(
    booking_id, kind, odometer, battery, damage_note, checked_by, fees
  ) values (
    v_booking.id, 'return', p_odometer, p_battery,
    left(coalesce(p_damage_note, ''), 2000),
    left(coalesce(nullif(p_checked_by, ''), 'Nhân viên'), 200),
    p_fees
  );

  update public.bookings set status = 'returned' where id = v_booking.id;
  update public.cars
  set status = case when p_fees > 0 then 'maintenance' else 'available' end,
      odometer = p_odometer, battery = p_battery
  where id = v_booking.car_id;

  if p_fees > 0 then
    insert into public.payments(code, booking_id, type, method, amount, status, paid_at, note)
    values(
      'PC-' || replace(gen_random_uuid()::text, '-', ''),
      v_booking.id, 'penalty', 'cash', p_fees, 'paid', now(),
      'Phí phát sinh khi trả xe'
    );
  end if;
end;
$$;

create or replace function public.settle_deposit(
  p_booking_id uuid,
  p_deduction numeric,
  p_refund numeric,
  p_note text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_deposit numeric;
  v_role text := public.current_user_role();
begin
  if v_role not in ('admin', 'accountant') then raise exception 'Không có quyền quyết toán cọc'; end if;
  if p_deduction is null or p_deduction < 0 then raise exception 'Tiền cấn trừ không hợp lệ'; end if;
  if p_refund is null or p_refund < 0 then raise exception 'Tiền hoàn không hợp lệ'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Không tìm thấy đơn thuê'; end if;
  if v_booking.status <> 'returned' then raise exception 'Chỉ quyết toán đơn đã trả xe'; end if;

  select coalesce(sum(amount), 0) into v_deposit
  from public.payments
  where booking_id = v_booking.id and type = 'deposit' and status = 'paid';
  if v_deposit < v_booking.deposit then raise exception 'Chưa thu đủ tiền cọc để quyết toán'; end if;
  if p_refund + p_deduction > v_deposit then raise exception 'Tổng hoàn cọc và cấn trừ vượt quá cọc đã thu'; end if;

  if p_refund > 0 then
    insert into public.payments(code, booking_id, type, method, amount, status, paid_at, note)
    values(
      'PT-' || replace(gen_random_uuid()::text, '-', ''),
      v_booking.id, 'refund', 'transfer', p_refund, 'paid', now(),
      left(concat_ws(' · ', nullif(p_note, ''), 'Cấn trừ ' || p_deduction::text), 2000)
    );
  end if;
  update public.bookings set status = 'completed' where id = v_booking.id;
end;
$$;

create or replace function public.admin_cancel_booking(
  p_booking_id uuid,
  p_reason text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_role text := public.current_user_role();
begin
  if v_role not in ('admin', 'staff', 'accountant') then raise exception 'Không có quyền hủy đơn'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Cần nhập lý do hủy đơn'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Không tìm thấy đơn thuê'; end if;
  if v_booking.status not in ('pending', 'confirmed', 'signed') then raise exception 'Trạng thái đơn không cho phép hủy'; end if;

  update public.bookings set status = 'cancelled', note = left(concat_ws(E'\n', note, '[Hủy]: ' || trim(p_reason)), 2000)
  where id = v_booking.id;
  update public.contracts set status = 'cancelled' where booking_id = v_booking.id;
  update public.payments set status = 'cancelled' where booking_id = v_booking.id and status = 'pending';
end;
$$;

create or replace function public.complete_maintenance(p_id uuid, p_actual numeric)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_order public.maintenance_orders;
  v_role text := public.current_user_role();
begin
  if v_role not in ('admin', 'staff') then raise exception 'Không có quyền nghiệm thu bảo dưỡng'; end if;
  if p_actual is null or p_actual < 0 then raise exception 'Chi phí thực tế không hợp lệ'; end if;
  select * into v_order from public.maintenance_orders where id = p_id for update;
  if v_order.id is null then raise exception 'Không tìm thấy lệnh bảo dưỡng'; end if;
  if v_order.status <> 'in_progress' then raise exception 'Lệnh không đang thực hiện'; end if;

  update public.maintenance_orders set status = 'completed', actual = p_actual where id = v_order.id;
  if not exists (
    select 1 from public.bookings
    where car_id = v_order.car_id
      and status in ('pending', 'confirmed', 'signed', 'handed_over')
  ) then
    update public.cars set status = 'available' where id = v_order.car_id;
  end if;
end;
$$;

create or replace function public.create_maintenance_order(
  p_car_id uuid,
  p_category text,
  p_assignee text,
  p_estimate numeric,
  p_notes text
) returns void language plpgsql security definer set search_path = public
as $$
declare v_role text := public.current_user_role();
begin
  if v_role not in ('admin', 'staff') then raise exception 'Không có quyền tạo lệnh bảo dưỡng'; end if;
  if p_car_id is null or not exists(select 1 from public.cars where id = p_car_id) then raise exception 'Xe không tồn tại'; end if;
  if p_estimate is null or p_estimate < 0 then raise exception 'Dự toán không hợp lệ'; end if;

  insert into public.maintenance_orders(code, car_id, category, assignee, estimate, notes, status)
  values(
    'BD-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0'),
    p_car_id, left(coalesce(nullif(trim(p_category), ''), 'Bảo dưỡng định kỳ'), 200),
    left(coalesce(p_assignee, ''), 200), p_estimate, left(coalesce(p_notes, ''), 2000), 'pending'
  );
  update public.cars set status = 'maintenance'
  where id = p_car_id and status <> 'rented';
end;
$$;

revoke all on function
  public.record_handover(uuid,int,int,text,text,text),
  public.record_return(uuid,int,int,numeric,text,text),
  public.settle_deposit(uuid,numeric,numeric,text),
  public.admin_cancel_booking(uuid,text),
  public.complete_maintenance(uuid,numeric),
  public.create_maintenance_order(uuid,text,text,numeric,text)
from public, anon;
grant execute on function public.record_handover(uuid,int,int,text,text,text) to authenticated;
grant execute on function public.record_return(uuid,int,int,numeric,text,text) to authenticated;
grant execute on function public.settle_deposit(uuid,numeric,numeric,text) to authenticated;
grant execute on function public.admin_cancel_booking(uuid,text) to authenticated;
grant execute on function public.complete_maintenance(uuid,numeric) to authenticated;
grant execute on function public.create_maintenance_order(uuid,text,text,numeric,text) to authenticated;

commit;
