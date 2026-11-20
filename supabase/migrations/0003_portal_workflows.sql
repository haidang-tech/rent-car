-- Complete the portal with guarded, atomic workflows. Apply after 0002.
begin;
create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id=auth.uid() and status='active'),'anon')
$$;

-- A customer must not promote/unlock their own account through the old self-update policy.
drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated
using (public.current_user_role()='admin') with check (public.current_user_role()='admin');
grant update on public.profiles to authenticated;

create or replace function public.admin_update_profile(p_id uuid,p_role text,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_user_role()<>'admin' then raise exception 'Không có quyền quản lý tài khoản'; end if;
  perform id from public.profiles order by id for update;
  if p_role not in ('admin','staff','accountant','customer') or p_status not in ('active','locked') then raise exception 'Vai trò hoặc trạng thái không hợp lệ'; end if;
  if p_id=auth.uid() and (p_role<>'admin' or p_status<>'active') then raise exception 'Không thể tự khóa hoặc hạ quyền tài khoản đang dùng'; end if;
  if not exists(select 1 from public.profiles where id=p_id) then raise exception 'Không tìm thấy tài khoản'; end if;
  if (p_role<>'admin' or p_status<>'active') and not exists(select 1 from public.profiles where id<>p_id and role='admin' and status='active') then raise exception 'Cần giữ ít nhất một quản trị viên hoạt động'; end if;
  update public.profiles set role=p_role,status=p_status where id=p_id;
end $$;
create or replace function public.approve_maintenance_estimate(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_user_role() not in ('admin','accountant') then raise exception 'Không có quyền duyệt dự toán'; end if;
  update public.maintenance_orders set status='approved' where id=p_id and status='pending';
  if not found then raise exception 'Dự toán không còn ở trạng thái chờ duyệt'; end if;
end $$;
create or replace function public.guard_maintenance_status() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_role text:=public.current_user_role();
begin
 if auth.role()='service_role' then return new; end if;
 if tg_op='INSERT' then
  if new.status<>'pending' then raise exception 'Lệnh bảo dưỡng mới phải chờ duyệt dự toán'; end if;
  return new;
 end if;
 if new.status is not distinct from old.status then return new; end if;
 if old.status='pending' and new.status='approved' and v_role in ('admin','accountant') then return new; end if;
 if old.status='approved' and new.status='in_progress' and v_role in ('admin','staff') then return new; end if;
 if old.status='in_progress' and new.status='completed' and v_role in ('admin','staff') then return new; end if;
 raise exception 'Chuyển trạng thái dự toán bảo dưỡng không hợp lệ';
end $$;
drop trigger if exists maintenance_status_guard on public.maintenance_orders;
create trigger maintenance_status_guard before insert or update on public.maintenance_orders
for each row execute function public.guard_maintenance_status();

alter table public.booking_requests drop constraint if exists booking_requests_kind_check;
alter table public.booking_requests add constraint booking_requests_kind_check check(kind in ('extension','exchange','cancellation','incident'));
alter table public.booking_requests add column if not exists photo_paths text[] not null default '{}';
alter table public.booking_requests add column if not exists decision_note text;
alter table public.contracts add column if not exists terms_snapshot jsonb;
alter table public.contracts add column if not exists accepted_version text;
alter table public.bookings add column if not exists policy_snapshot jsonb;

-- Policies below are meaningless unless RLS is enabled on the new tables.
alter table public.kyc_records enable row level security;
alter table public.booking_requests enable row level security;
alter table public.reviews enable row level security;

create or replace function public.capture_booking_policy() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.policy_snapshot is null then
    select to_jsonb(p) into new.policy_snapshot from public.policies p where active and effective_from<=new.pickup_at::date order by effective_from desc,created_at desc limit 1;
  end if;
  return new;
end $$;
drop trigger if exists booking_policy_snapshot on public.bookings;
create trigger booking_policy_snapshot before insert on public.bookings for each row execute function public.capture_booking_policy();

-- Private buckets and immutable uploads; MIME/size limits also enforced by Storage.
update storage.buckets set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id in ('kyc','review-photos');
drop policy if exists "review photos read" on storage.objects;
create policy "review photos owner or staff" on storage.objects for select to authenticated using
(bucket_id='review-photos' and public.current_user_role()<>'anon' and ((storage.foldername(name))[1]=auth.uid()::text or public.current_user_role() in ('admin','staff','accountant')));
drop policy if exists "kyc upload own" on storage.objects;
create policy "kyc upload own" on storage.objects for insert to authenticated with check
(bucket_id='kyc' and public.current_user_role()<>'anon' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "kyc read owner or staff" on storage.objects;
create policy "kyc read owner or staff" on storage.objects for select to authenticated using
(bucket_id='kyc' and public.current_user_role()<>'anon' and ((storage.foldername(name))[1]=auth.uid()::text or public.current_user_role() in ('admin','staff')));
drop policy if exists "review photos upload own" on storage.objects;
create policy "review photos upload own" on storage.objects for insert to authenticated with check
(bucket_id='review-photos' and public.current_user_role()<>'anon' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.owns_portal_booking(p_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select public.current_user_role()<>'anon' and exists(select 1 from public.bookings where id=p_id and user_id=auth.uid())
$$;
drop policy if exists "contracts read" on public.contracts;
create policy "contracts read" on public.contracts for select to authenticated using(public.owns_portal_booking(booking_id) or public.current_user_role() in ('admin','staff','accountant'));
drop policy if exists "payments read" on public.payments;
create policy "payments read" on public.payments for select to authenticated using(public.owns_portal_booking(booking_id) or public.current_user_role() in ('admin','staff','accountant'));
drop policy if exists "kyc read" on public.kyc_records;
create policy "kyc read" on public.kyc_records for select to authenticated using(public.owns_portal_booking(booking_id) or public.current_user_role() in ('admin','staff'));
drop policy if exists "requests read" on public.booking_requests;
create policy "requests read" on public.booking_requests for select to authenticated using(public.owns_portal_booking(booking_id) or public.current_user_role() in ('admin','staff','accountant'));
-- Customer mutations go exclusively through checked RPCs, never trusting submitted statuses/fees.
revoke insert,update,delete on public.kyc_records,public.booking_requests,public.reviews from anon,authenticated;
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select to authenticated using(public.owns_portal_booking(booking_id) or public.current_user_role() in ('admin','staff','accountant'));
revoke execute on function public.cancel_booking(text) from public,anon,authenticated;

create or replace function public.validate_portal_paths(p_paths text[],p_bucket text) returns void
language plpgsql security definer set search_path=public as $$
declare p text;
begin
 foreach p in array p_paths loop
  if p is null or p not like auth.uid()::text||'/%' or not exists(select 1 from storage.objects where bucket_id=p_bucket and name=p) then raise exception 'Ảnh chưa tải lên hoặc không thuộc tài khoản của bạn'; end if;
 end loop;
end $$;
revoke all on function public.validate_portal_paths(text[],text) from public,anon,authenticated;

create or replace function public.submit_my_kyc(p_code text,p_paths text[])
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings;
begin
 select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
 if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
 if b.status not in ('pending','confirmed') then raise exception 'Đơn không còn nhận hồ sơ xác thực'; end if;
 if coalesce(array_length(p_paths,1),0)<>4 then raise exception 'Cần đủ bốn ảnh'; end if;
 perform public.validate_portal_paths(p_paths,'kyc');
 if exists(select 1 from public.kyc_records where booking_id=b.id and status in ('pending','verified')) then raise exception 'Hồ sơ đang duyệt hoặc đã được duyệt'; end if;
 insert into public.kyc_records(booking_id,user_id,id_front_path,id_back_path,license_path,selfie_path)
 values(b.id,auth.uid(),p_paths[1],p_paths[2],p_paths[3],p_paths[4])
 on conflict(booking_id) do update set id_front_path=excluded.id_front_path,id_back_path=excluded.id_back_path,license_path=excluded.license_path,selfie_path=excluded.selfie_path,status='pending',note=null,reviewed_by=null,reviewed_at=null;
end $$;
create or replace function public.verify_kyc(p_id uuid,p_approved boolean,p_note text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if public.current_user_role() not in ('admin','staff') then raise exception 'Không có quyền duyệt giấy tờ'; end if;
 if p_approved is null then raise exception 'Thiếu quyết định'; end if;
 if not p_approved and length(trim(coalesce(p_note,'')))<3 then raise exception 'Cần lý do từ chối'; end if;
 update public.kyc_records set status=case when p_approved then 'verified' else 'rejected' end,note=left(p_note,2000),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id and status='pending';
 if not found then raise exception 'Hồ sơ không còn chờ duyệt'; end if;
end $$;
create or replace function public.sign_my_contract(p_code text)
returns public.contracts language plpgsql security definer set search_path=public as $$
declare b public.bookings; c public.contracts;
begin
 select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
 if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
 if b.status not in ('confirmed','signed') then raise exception 'Chờ nhân viên xác nhận đơn trước khi ký'; end if;
 if not exists(select 1 from public.kyc_records where booking_id=b.id and status='verified') then raise exception 'Giấy tờ cần được duyệt trước khi ký'; end if;
 select * into c from public.contracts where booking_id=b.id and status<>'cancelled' order by created_at desc limit 1;
 if c.customer_signed then return c; end if;
 if c.id is null then
  insert into public.contracts(code,booking_id,customer_signed,signed_at,terms_snapshot,accepted_version)
  values('HD-'||b.code,b.id,true,now(),to_jsonb(b),'portal-v1') returning * into c;
 else
  update public.contracts set customer_signed=true,signed_at=now(),terms_snapshot=to_jsonb(b),accepted_version='portal-v1' where id=c.id returning * into c;
 end if;
 return c;
end $$;
create or replace function public.request_deposit(p_code text,p_method text default 'transfer')
returns public.payments language plpgsql security definer set search_path=public as $$
declare b public.bookings; p public.payments;
begin
 if p_method is null or p_method not in ('cash','transfer') then raise exception 'Chỉ hỗ trợ ghi nhận tiền mặt hoặc chuyển khoản, chưa có cổng thanh toán'; end if;
 select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
 if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
 if b.status not in ('confirmed','signed') then raise exception 'Đơn chưa sẵn sàng đặt cọc'; end if;
 if not exists(select 1 from public.contracts where booking_id=b.id and customer_signed and status<>'cancelled') then raise exception 'Cần xác nhận hợp đồng trước khi đặt cọc'; end if;
 select * into p from public.payments where booking_id=b.id and type='deposit' and status in ('pending','paid') order by created_at limit 1;
 if p.id is not null then return p; end if;
 insert into public.payments(code,booking_id,type,method,amount,status,note)
 values('PT-'||gen_random_uuid()::text,b.id,'deposit',p_method,b.deposit,'pending','Khách yêu cầu ghi nhận cọc; kế toán phải đối chiếu tiền thực nhận') returning * into p;
 return p;
end $$;

create or replace function public.submit_booking_request(p_code text,p_kind text,p_reason text,p_return timestamptz default null,p_car uuid default null,p_photos text[] default '{}')
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings; fee numeric:=0; pol jsonb;
begin
 select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
 if b.id is null or public.current_user_role()='anon' then raise exception 'Không tìm thấy đơn của bạn'; end if;
 if p_kind is null or p_kind not in ('extension','exchange','cancellation','incident') or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Yêu cầu hoặc lý do không hợp lệ'; end if;
 if b.status not in ('pending','confirmed','signed','handed_over') then raise exception 'Đơn không còn nhận yêu cầu điều chỉnh'; end if;
 if p_kind='cancellation' and b.status='handed_over' then raise exception 'Xe đã bàn giao, cần liên hệ cơ sở để trả xe'; end if;
 if exists(select 1 from public.booking_requests where booking_id=b.id and kind=p_kind and status='pending') then raise exception 'Đã có yêu cầu cùng loại đang chờ xử lý'; end if;
 if p_kind='extension' and (p_return is null or p_return<=b.return_at) then raise exception 'Ngày trả mới phải sau ngày trả hiện có'; end if;
 if p_kind='exchange' and (p_car is null or p_car=b.car_id or not exists(select 1 from public.cars where id=p_car and status in ('available','rented'))) then raise exception 'Chọn xe thay thế đang khai thác'; end if;
 if coalesce(array_length(p_photos,1),0)>4 then raise exception 'Tối đa bốn ảnh'; end if;
 perform public.validate_portal_paths(p_photos,'review-photos');
 if p_kind='cancellation' then
  pol:=b.policy_snapshot;
  if pol is null then select to_jsonb(p) into pol from public.policies p where active and effective_from<=b.created_at::date order by effective_from desc,created_at desc limit 1; end if;
  if pol is null then raise exception 'Chưa có chính sách hủy áp dụng, vui lòng liên hệ cơ sở'; end if;
  fee:=b.deposit*(1-case when b.pickup_at-now()>=make_interval(hours=>(pol->>'cancel_hours')::int) then (pol->>'refund_pct')::numeric/100 else 0 end);
 end if;
 insert into public.booking_requests(code,booking_id,user_id,kind,reason,desired_return_at,replacement_car_id,photo_paths,fee)
 values('YC-'||gen_random_uuid()::text,b.id,auth.uid(),p_kind,left(p_reason,2000),p_return,p_car,p_photos,fee);
end $$;

create or replace function public.decide_booking_request(p_id uuid,p_approve boolean,p_note text)
returns void language plpgsql security definer set search_path=public as $$
declare r public.booking_requests; b public.bookings; c public.cars; newdays int; newtotal numeric;
begin
 if public.current_user_role() not in ('admin','staff') then raise exception 'Không có quyền xử lý yêu cầu'; end if;
 if p_approve is null then raise exception 'Thiếu quyết định'; end if;
 select * into r from public.booking_requests where id=p_id for update;
 if r.id is null or r.status<>'pending' then raise exception 'Yêu cầu không còn chờ xử lý'; end if;
 select * into b from public.bookings where id=r.booking_id for update;
 if p_approve then
  if b.status not in ('pending','confirmed','signed','handed_over') then raise exception 'Trạng thái đơn đã thay đổi'; end if;
  if r.kind='extension' then
   perform id from public.cars where id=b.car_id for update;
   if r.desired_return_at<=b.return_at or not public.is_car_available(b.car_id,b.pickup_at,r.desired_return_at,b.id) then raise exception 'Thời gian mới không hợp lệ hoặc trùng lịch xe'; end if;
   newdays:=ceil(extract(epoch from(r.desired_return_at-b.pickup_at))/86400);
   newtotal:=newdays*b.unit_price+b.deposit+b.extras;
   update public.bookings set return_at=r.desired_return_at,days=newdays,total=newtotal where id=b.id;
   update public.booking_requests set fee=newtotal-b.total where id=r.id;
  elsif r.kind='exchange' then
   if b.status='handed_over' then raise exception 'Xe đã bàn giao: cần biên bản trả và bàn giao xe thay thế tại cơ sở'; end if;
   perform id from public.cars where id in (b.car_id,r.replacement_car_id) order by id for update;
   select * into c from public.cars where id=r.replacement_car_id;
   if c.id is null or c.status not in ('available','rented') or not public.is_car_available(c.id,b.pickup_at,b.return_at,b.id) then raise exception 'Xe thay thế không còn trống'; end if;
   newtotal:=b.days*c.price_per_day+b.deposit+b.extras;
   update public.bookings set car_id=c.id,unit_price=c.price_per_day,total=newtotal,status=case when status='signed' then 'confirmed' else status end where id=b.id;
   update public.booking_requests set fee=newtotal-b.total where id=r.id;
  elsif r.kind='cancellation' then
   if b.status='handed_over' then raise exception 'Xe đã được bàn giao'; end if;
   update public.bookings set status='cancelled' where id=b.id;
   update public.contracts set status='cancelled' where booking_id=b.id;
   update public.payments set status='cancelled' where booking_id=b.id and status='pending';
  elsif r.kind='incident' then
   insert into public.incidents(code,booking_id,car_id,description,photos) values('SC-'||r.id::text,b.id,b.car_id,r.reason,r.photo_paths);
  end if;
  if r.kind in ('extension','exchange') then
   update public.contracts set status='cancelled' where booking_id=b.id and status<>'cancelled';
   insert into public.contracts(code,booking_id,terms_snapshot) select 'PL-'||r.id::text,id,to_jsonb(bookings) from public.bookings where id=b.id;
   -- Before pickup the customer must accept the changed terms again.
   update public.bookings set status='confirmed' where id=b.id and status='signed';
  end if;
 end if;
 update public.booking_requests set status=case when p_approve then 'approved' else 'rejected' end,decided_by=auth.uid(),decided_at=now(),decision_note=left(p_note,2000) where id=r.id;
end $$;

create or replace function public.submit_my_review(p_code text,p_car_rating int,p_service_rating int,p_comment text,p_photos text[] default '{}')
returns void language plpgsql security definer set search_path=public as $$
declare b public.bookings;
begin
 select * into b from public.bookings where code=p_code and user_id=auth.uid() for update;
 if b.id is null or public.current_user_role()='anon' or b.status<>'completed' then raise exception 'Chỉ đánh giá chuyến thuê của bạn đã hoàn tất'; end if;
 if coalesce(array_length(p_photos,1),0)>4 then raise exception 'Tối đa bốn ảnh'; end if;
 perform public.validate_portal_paths(p_photos,'review-photos');
 insert into public.reviews(booking_id,user_id,car_id,car_rating,service_rating,comment,photo_paths)
 values(b.id,auth.uid(),b.car_id,p_car_rating,p_service_rating,left(p_comment,2000),p_photos);
end $$;

create or replace function public.booking_workflow_guard() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if public.current_user_role()='anon' and auth.uid() is not null then raise exception 'Tài khoản đã bị khóa'; end if;
 if new.status<>old.status then
  if not ((old.status='pending' and new.status in ('confirmed','cancelled')) or
          (old.status='confirmed' and new.status in ('signed','cancelled')) or
          (old.status='signed' and new.status in ('confirmed','handed_over','cancelled')) or
          (old.status='handed_over' and new.status='returned') or
          (old.status='returned' and new.status='completed')) then raise exception 'Chuyển trạng thái đơn không hợp lệ'; end if;
  if new.status in ('signed','handed_over') and (
   not exists(select 1 from public.kyc_records where booking_id=new.id and status='verified') or
   not exists(select 1 from public.contracts where booking_id=new.id and customer_signed and status='active') or
   coalesce((select sum(amount) from public.payments where booking_id=new.id and type='deposit' and status='paid'),0)<new.deposit
  ) then raise exception 'Cần giấy tờ đã duyệt, hợp đồng có hiệu lực và đủ tiền cọc'; end if;
 end if;
 return new;
end $$;
drop trigger if exists enforce_booking_workflow on public.bookings;
create trigger enforce_booking_workflow before update on public.bookings for each row execute function public.booking_workflow_guard();

-- Internal helper cannot be called directly by customers.
create or replace function public.refresh_booking_readiness(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform id from public.bookings where id=p_id for update;
 update public.bookings b set status='signed' where id=p_id and status='confirmed'
 and exists(select 1 from public.kyc_records where booking_id=b.id and status='verified')
 and exists(select 1 from public.contracts where booking_id=b.id and customer_signed and status='active')
 and coalesce((select sum(amount) from public.payments where booking_id=b.id and type='deposit' and status='paid'),0)>=b.deposit;
end $$;
revoke all on function public.refresh_booking_readiness(uuid) from public,anon,authenticated;
create or replace function public.payment_contract_readiness() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 perform public.refresh_booking_readiness(new.booking_id); return new;
end $$;
drop trigger if exists payment_ready on public.payments;
create trigger payment_ready after insert or update on public.payments for each row execute function public.payment_contract_readiness();
drop trigger if exists contract_ready on public.contracts;
create trigger contract_ready after insert or update on public.contracts for each row execute function public.payment_contract_readiness();

-- Explicit privileges; PostgreSQL otherwise grants function EXECUTE to PUBLIC.
revoke all on function public.admin_update_profile(uuid,text,text),public.approve_maintenance_estimate(uuid),public.owns_portal_booking(uuid),public.submit_my_kyc(text,text[]),public.verify_kyc(uuid,boolean,text),public.sign_my_contract(text),public.request_deposit(text,text),public.submit_booking_request(text,text,text,timestamptz,uuid,text[]),public.decide_booking_request(uuid,boolean,text),public.submit_my_review(text,int,int,text,text[]) from public,anon;
grant execute on function public.admin_update_profile(uuid,text,text),public.approve_maintenance_estimate(uuid),public.owns_portal_booking(uuid),public.submit_my_kyc(text,text[]),public.verify_kyc(uuid,boolean,text),public.sign_my_contract(text),public.request_deposit(text,text),public.submit_booking_request(text,text,text,timestamptz,uuid,text[]),public.decide_booking_request(uuid,boolean,text),public.submit_my_review(text,int,int,text,text[]) to authenticated;
commit;
