-- Booking integrity and Vietnam-time contracts. Apply after 0004.
-- Existing overlapping bookings / negative amounts must be reconciled before applying.
-- Fail atomically rather than deleting or changing existing business records.
begin;

create extension if not exists btree_gist;

alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    car_id with =,
    tstzrange(pickup_at, return_at, '[)') with &&
  ) where (status in ('pending','confirmed','signed','handed_over'));

alter table public.payments add constraint payments_amount_nonnegative check (amount >= 0);
alter table public.vehicle_checks add constraint vehicle_checks_fees_nonnegative check (fees >= 0);
alter table public.fines add constraint fines_amount_nonnegative check (amount >= 0);
alter table public.pricing_rules add constraint pricing_rules_amount_nonnegative check (amount >= 0);
alter table public.maintenance_orders add constraint maintenance_estimate_nonnegative check (estimate >= 0);
alter table public.maintenance_orders add constraint maintenance_actual_nonnegative check (actual >= 0);
alter table public.cars add constraint cars_odometer_nonnegative check (odometer >= 0);

-- Storage upload paths start with auth.uid(). Permit rollback of failed submissions.
create policy "kyc delete own" on storage.objects for delete to authenticated using (
  bucket_id='kyc' and public.current_user_role()<>'anon'
  and (storage.foldername(name))[1]=auth.uid()::text
);
create policy "review photos delete own" on storage.objects for delete to authenticated using (
  bucket_id='review-photos' and public.current_user_role()<>'anon'
  and (storage.foldername(name))[1]=auth.uid()::text
);

-- A single cancellation path: submit_booking_request -> decide_booking_request.
-- The old immediate cancellation RPC has been revoked since 0003 and has no callers.
drop function if exists public.cancel_booking(text);

create or replace function public.capture_booking_policy() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.policy_snapshot is null then
    select to_jsonb(p) into new.policy_snapshot from public.policies p
    where active and effective_from <= (new.pickup_at at time zone 'Asia/Ho_Chi_Minh')::date
    order by effective_from desc,created_at desc limit 1;
  end if;
  return new;
end $$;

create or replace function public.create_booking(
  p_car_id uuid, p_customer_name text, p_customer_phone text, p_customer_email text,
  p_pickup_at timestamptz, p_return_at timestamptz, p_pickup_location text,
  p_note text default null
) returns public.bookings
language plpgsql security definer set search_path=public as $$
declare
  v_car public.cars;
  v_booking public.bookings;
  v_days int;
  v_constraint text;
  v_location text;
begin
  if auth.uid() is not null then
    perform id from public.profiles where id=auth.uid() and status='active' for share;
    if not found then raise exception 'Tài khoản không hoạt động hoặc đã bị khóa'; end if;
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) not between 2 and 120
    or p_customer_name ~ '[[:cntrl:]]' then
    raise exception 'Họ tên phải có từ 2 đến 120 ký tự và không chứa ký tự điều khiển';
  end if;
  if p_customer_phone is null or trim(p_customer_phone) !~ '^(0[0-9]{9}|\+84[0-9]{9})$' then
    raise exception 'Số điện thoại không hợp lệ';
  end if;
  if nullif(trim(p_customer_email),'') is not null and (
    length(trim(p_customer_email))>254 or trim(p_customer_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then raise exception 'Email không hợp lệ'; end if;
  if length(coalesce(p_note,''))>2000 then raise exception 'Ghi chú tối đa 2000 ký tự'; end if;
  if p_pickup_at is null or p_return_at is null or not isfinite(p_pickup_at) or not isfinite(p_return_at)
    or p_return_at<=p_pickup_at then raise exception 'Thời gian trả phải sau thời gian nhận hợp lệ'; end if;
  if p_pickup_at<now()-interval '1 day' then raise exception 'Thời gian nhận xe đã qua quá một ngày'; end if;
  if p_return_at-p_pickup_at>interval '30 days' then raise exception 'Thời gian thuê tối đa 30 ngày'; end if;

  select name into v_location from public.locations
    where name=trim(p_pickup_location) and active order by id limit 1 for share;
  if not found then raise exception 'Điểm nhận xe không còn hoạt động'; end if;
  -- Serializes RPC bookings for the same car; exclusion also protects direct writes.
  select * into v_car from public.cars where id=p_car_id for update;
  if v_car.id is null or v_car.status not in ('available','rented') then
    raise exception 'Xe không tồn tại hoặc đang ngừng khai thác';
  end if;
  if not public.is_car_available(p_car_id,p_pickup_at,p_return_at) then
    raise exception 'Xe đã có lịch trong khoảng thời gian này';
  end if;
  v_days:=ceil(extract(epoch from(p_return_at-p_pickup_at))/86400)::int;
  for attempt in 1..5 loop
    begin
      insert into public.bookings (
        code,user_id,car_id,customer_name,customer_phone,customer_email,
        pickup_at,return_at,pickup_location,return_location,
        days,unit_price,deposit,total,status,note
      ) values (
        'LD-'||to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
        auth.uid(),v_car.id,trim(p_customer_name),trim(p_customer_phone),nullif(trim(p_customer_email),''),
        p_pickup_at,p_return_at,v_location,v_location,
        v_days,v_car.price_per_day,v_car.deposit,v_car.price_per_day*v_days+v_car.deposit,'pending',nullif(trim(p_note),'')
      ) returning * into v_booking;
      return v_booking;
    exception when unique_violation then
      get stacked diagnostics v_constraint=constraint_name;
      if v_constraint<>'bookings_code_key' then raise; end if;
    end;
  end loop;
  raise exception 'Chưa thể tạo mã đơn, vui lòng thử lại';
exception when exclusion_violation then
  raise exception 'Xe vừa có lịch trong khoảng thời gian này, vui lòng chọn xe hoặc thời gian khác';
end $$;

create or replace function public.sign_my_contract(p_code text)
returns public.contracts language plpgsql security definer set search_path=public as $$
declare b public.bookings; c public.contracts; v_constraint text;
begin
  select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
  if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
  if b.status not in ('confirmed','signed') then raise exception 'Chờ nhân viên xác nhận đơn trước khi ký'; end if;
  if not exists(select 1 from public.kyc_records where booking_id=b.id and status='verified') then
    raise exception 'Giấy tờ cần được duyệt trước khi ký';
  end if;
  select * into c from public.contracts where booking_id=b.id and status<>'cancelled'
    order by created_at desc,id desc limit 1 for update;
  if c.customer_signed then return c; end if;
  if c.id is not null then
    update public.contracts set customer_signed=true,signed_at=now(),terms_snapshot=to_jsonb(b),accepted_version='portal-v1'
      where id=c.id returning * into c;
    return c;
  end if;
  for attempt in 1..5 loop
    begin
      insert into public.contracts(code,booking_id,customer_signed,signed_at,terms_snapshot,accepted_version)
      values('HD-'||gen_random_uuid()::text,b.id,true,now(),to_jsonb(b),'portal-v1') returning * into c;
      return c;
    exception when unique_violation then
      get stacked diagnostics v_constraint=constraint_name;
      if v_constraint<>'contracts_code_key' then raise; end if;
    end;
  end loop;
  raise exception 'Chưa thể tạo mã hợp đồng, vui lòng thử lại';
end $$;

create or replace function public.decide_booking_request(p_id uuid,p_approve boolean,p_note text)
returns void language plpgsql security definer set search_path=public as $$
declare r public.booking_requests; b public.bookings; c public.cars; newdays int; newtotal numeric;
begin
  if public.current_user_role() not in ('admin','staff') then raise exception 'Không có quyền xử lý yêu cầu'; end if;
  if p_approve is null then raise exception 'Thiếu quyết định'; end if;
  if not p_approve and length(trim(coalesce(p_note,'')))<3 then raise exception 'Cần lý do từ chối ít nhất 3 ký tự'; end if;
  select * into r from public.booking_requests where id=p_id for update;
  if r.id is null or r.status<>'pending' then raise exception 'Yêu cầu không còn chờ xử lý'; end if;
  select * into b from public.bookings where id=r.booking_id for update;
  if p_approve then
    if b.status not in ('pending','confirmed','signed','handed_over') then raise exception 'Trạng thái đơn đã thay đổi'; end if;
    if r.kind='extension' then
      perform id from public.cars where id=b.car_id for update;
      if r.desired_return_at is null or not isfinite(r.desired_return_at) or r.desired_return_at<=b.return_at
        or r.desired_return_at-b.pickup_at>interval '30 days' then
        raise exception 'Thời gian gia hạn không hợp lệ hoặc vượt quá tổng 30 ngày';
      end if;
      if not public.is_car_available(b.car_id,b.pickup_at,r.desired_return_at,b.id) then raise exception 'Thời gian mới trùng lịch xe'; end if;
      newdays:=ceil(extract(epoch from(r.desired_return_at-b.pickup_at))/86400)::int;
      newtotal:=newdays*b.unit_price+b.deposit+b.extras;
      update public.bookings set return_at=r.desired_return_at,days=newdays,total=newtotal where id=b.id;
      update public.booking_requests set fee=newtotal-b.total where id=r.id;
    elsif r.kind='exchange' then
      if b.status='handed_over' then raise exception 'Xe đã bàn giao: cần biên bản trả và bàn giao xe thay thế tại cơ sở'; end if;
      perform id from public.cars where id in (b.car_id,r.replacement_car_id) order by id for update;
      select * into c from public.cars where id=r.replacement_car_id;
      if c.id is null or c.id=b.car_id or c.status not in ('available','rented')
        or not public.is_car_available(c.id,b.pickup_at,b.return_at,b.id) then raise exception 'Xe thay thế không còn trống'; end if;
      newtotal:=b.days*c.price_per_day+c.deposit+b.extras;
      update public.bookings set car_id=c.id,unit_price=c.price_per_day,deposit=c.deposit,total=newtotal,
        status=case when status='signed' then 'confirmed' else status end where id=b.id;
      update public.booking_requests set fee=newtotal-b.total where id=r.id;
      -- Paid receipts remain historical facts; discard stale unconfirmed deposit requests.
      update public.payments set status='cancelled' where booking_id=b.id and type='deposit' and status='pending';
    elsif r.kind='cancellation' then
      if b.status='handed_over' then raise exception 'Xe đã được bàn giao'; end if;
      update public.bookings set status='cancelled' where id=b.id;
      update public.contracts set status='cancelled' where booking_id=b.id;
      update public.payments set status='cancelled' where booking_id=b.id and status='pending';
    elsif r.kind='incident' then
      insert into public.incidents(code,booking_id,car_id,description,photos)
        values('SC-'||r.id::text,b.id,b.car_id,r.reason,r.photo_paths);
    end if;
    if r.kind in ('extension','exchange') then
      update public.contracts set status='cancelled' where booking_id=b.id and status<>'cancelled';
      insert into public.contracts(code,booking_id,terms_snapshot)
        select 'PL-'||r.id::text,id,to_jsonb(bookings) from public.bookings where id=b.id;
      update public.bookings set status='confirmed' where id=b.id and status='signed';
    end if;
  end if;
  update public.booking_requests set status=case when p_approve then 'approved' else 'rejected' end,
    decided_by=auth.uid(),decided_at=now(),decision_note=left(trim(p_note),2000) where id=r.id;
exception when exclusion_violation then
  raise exception 'Lịch xe vừa thay đổi và bị trùng, vui lòng kiểm tra lại trước khi duyệt';
end $$;

-- A changed car can require an additional deposit; never rewrite a paid receipt.
create or replace function public.request_deposit(p_code text,p_method text default 'transfer')
returns public.payments language plpgsql security definer set search_path=public as $$
declare b public.bookings; p public.payments; outstanding numeric;
begin
  if p_method is null or p_method not in ('cash','transfer') then
    raise exception 'Chỉ hỗ trợ ghi nhận tiền mặt hoặc chuyển khoản, chưa có cổng thanh toán';
  end if;
  select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
  if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
  if b.status not in ('confirmed','signed') then raise exception 'Đơn chưa sẵn sàng đặt cọc'; end if;
  if not exists(select 1 from public.contracts where booking_id=b.id and customer_signed and status<>'cancelled') then
    raise exception 'Cần xác nhận hợp đồng trước khi đặt cọc';
  end if;
  select b.deposit-coalesce(sum(amount),0) into outstanding from public.payments
    where booking_id=b.id and type='deposit' and status='paid';
  if outstanding<=0 then
    select * into p from public.payments where booking_id=b.id and type='deposit' and status='paid'
      order by created_at desc,id desc limit 1;
    return p;
  end if;
  select * into p from public.payments where booking_id=b.id and type='deposit' and status='pending'
    order by created_at,id limit 1 for update;
  if p.id is not null then
    update public.payments set amount=outstanding where id=p.id returning * into p;
    return p;
  end if;
  insert into public.payments(code,booking_id,type,method,amount,status,note)
    values('PT-'||gen_random_uuid()::text,b.id,'deposit',p_method,outstanding,'pending',
      'Khách yêu cầu ghi nhận cọc; kế toán phải đối chiếu tiền thực nhận') returning * into p;
  return p;
end $$;

create or replace function public.submit_booking_request(
  p_code text,p_kind text,p_reason text,p_return timestamptz default null,p_car uuid default null,p_photos text[] default '{}'
) returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings; fee numeric:=0; pol jsonb;
begin
  select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
  if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
  if p_kind is null or p_kind not in ('extension','exchange','cancellation','incident')
    or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Yêu cầu hoặc lý do không hợp lệ'; end if;
  if b.status not in ('pending','confirmed','signed','handed_over') then raise exception 'Đơn không còn nhận yêu cầu điều chỉnh'; end if;
  if p_kind='cancellation' and b.status='handed_over' then raise exception 'Xe đã bàn giao, cần liên hệ cơ sở để trả xe'; end if;
  if exists(select 1 from public.booking_requests where booking_id=b.id and kind=p_kind and status='pending') then
    raise exception 'Đã có yêu cầu cùng loại đang chờ xử lý';
  end if;
  if p_kind='extension' and (p_return is null or not isfinite(p_return) or p_return<=b.return_at
    or p_return-b.pickup_at>interval '30 days') then raise exception 'Ngày trả mới phải sau ngày trả hiện có và tổng thời gian thuê tối đa 30 ngày'; end if;
  if p_kind='exchange' and (p_car is null or p_car=b.car_id
    or not exists(select 1 from public.cars where id=p_car and status in ('available','rented'))) then raise exception 'Chọn xe thay thế đang khai thác'; end if;
  if coalesce(array_length(p_photos,1),0)>4 then raise exception 'Tối đa bốn ảnh'; end if;
  perform public.validate_portal_paths(coalesce(p_photos,'{}'),'review-photos');
  if p_kind='cancellation' then
    pol:=b.policy_snapshot;
    if pol is null then
      select to_jsonb(p) into pol from public.policies p
      where active and effective_from <= (b.pickup_at at time zone 'Asia/Ho_Chi_Minh')::date
      order by effective_from desc,created_at desc limit 1;
    end if;
    if pol is null then raise exception 'Chưa có chính sách hủy áp dụng, vui lòng liên hệ cơ sở'; end if;
    fee:=b.deposit*(1-case when b.pickup_at-now()>=make_interval(hours=>(pol->>'cancel_hours')::int)
      then (pol->>'refund_pct')::numeric/100 else 0 end);
  end if;
  insert into public.booking_requests(code,booking_id,user_id,kind,reason,desired_return_at,replacement_car_id,photo_paths,fee)
    values('YC-'||gen_random_uuid()::text,b.id,auth.uid(),p_kind,left(p_reason,2000),p_return,p_car,coalesce(p_photos,'{}'),fee);
end $$;

revoke all on function public.create_booking(uuid,text,text,text,timestamptz,timestamptz,text,text) from public;
grant execute on function public.create_booking(uuid,text,text,text,timestamptz,timestamptz,text,text) to anon,authenticated;
revoke all on function public.sign_my_contract(text),public.request_deposit(text,text),public.decide_booking_request(uuid,boolean,text),
  public.submit_booking_request(text,text,text,timestamptz,uuid,text[]) from public,anon;
grant execute on function public.sign_my_contract(text),public.request_deposit(text,text),public.decide_booking_request(uuid,boolean,text),
  public.submit_booking_request(text,text,text,timestamptz,uuid,text[]) to authenticated;

commit;
