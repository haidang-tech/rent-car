-- Integration test for a disposable LOCAL Supabase database after migrations 0001–0005.
-- Run as postgres: psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/booking-integrity.sql
-- All fixtures and mutations are rolled back. Do not run against production.
begin;

do $$
declare
  customer uuid:=gen_random_uuid(); staff uuid:=gen_random_uuid();
  car1 uuid:=gen_random_uuid(); car2 uuid:=gen_random_uuid(); location uuid:=gen_random_uuid();
  b public.bookings; adjacent public.bookings; c public.contracts; p public.payments;
  req uuid; rejected boolean; location_name text:='Integrity test '||gen_random_uuid()::text;
  start_at timestamptz:=now()+interval '2 days';
begin
  insert into auth.users(id,email) values(customer,customer::text||'@example.test'),(staff,staff::text||'@example.test');
  update public.profiles set role='staff' where id=staff;
  insert into public.locations(id,code,name) values(location,location::text,location_name);
  insert into public.cars(id,code,plate,brand,model,price_per_day,deposit,location_id)
    values(car1,car1::text,car1::text,'Test','One',100,1000,location),
          (car2,car2::text,car2::text,'Test','Two',200,2000,location);
  perform set_config('request.jwt.claim.sub',customer::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);

  b:=public.create_booking(car1,'Khách thử','0905123456',null,start_at,start_at+interval '1 day',location_name,null);
  if b.days<>1 or b.deposit<>1000 or b.total<>1100 or b.user_id<>customer then raise exception 'Incorrect booking price/owner'; end if;
  adjacent:=public.create_booking(car1,'Khách thử','0905123456',null,start_at+interval '1 day',start_at+interval '2 days',location_name,null);
  if adjacent.id is null then raise exception 'Adjacent [) booking should succeed'; end if;

  rejected:=false;
  begin
    insert into public.bookings(code,car_id,customer_name,customer_phone,pickup_at,return_at)
      values(gen_random_uuid()::text,car1,'Overlap','0905123456',start_at,start_at+interval '1 hour');
  exception when exclusion_violation then rejected:=true;
  end;
  if not rejected then raise exception 'Direct overlapping write was accepted'; end if;

  rejected:=false;
  begin
    perform public.create_booking(car2,'Khách thử','0905123456',null,start_at,start_at+interval '31 days',location_name,null);
  exception when raise_exception then rejected:=true;
  end;
  if not rejected then raise exception '31-day booking was accepted'; end if;

  update public.locations set active=false where id=location;
  rejected:=false;
  begin
    perform public.create_booking(car2,'Khách thử','0905123456',null,start_at,start_at+interval '1 day',location_name,null);
  exception when raise_exception then rejected:=true;
  end;
  if not rejected then raise exception 'Inactive pickup location was accepted'; end if;
  update public.locations set active=true where id=location;

  update public.profiles set status='locked' where id=customer;
  rejected:=false;
  begin
    perform public.create_booking(car2,'Khách thử','0905123456',null,start_at,start_at+interval '1 day',location_name,null);
  exception when raise_exception then rejected:=true;
  end;
  if not rejected then raise exception 'Locked customer booking was accepted'; end if;
  update public.profiles set status='active' where id=customer;

  insert into public.booking_requests(code,booking_id,user_id,kind,replacement_car_id,reason)
    values(gen_random_uuid()::text,b.id,customer,'exchange',car2,'Đổi xe') returning id into req;
  perform set_config('request.jwt.claim.sub',staff::text,true);
  rejected:=false;
  begin
    perform public.decide_booking_request(req,false,' ');
  exception when raise_exception then rejected:=true;
  end;
  if not rejected then raise exception 'Reject without reason was accepted'; end if;
  perform public.decide_booking_request(req,true,'Đồng ý');
  select * into b from public.bookings where id=b.id;
  if b.car_id<>car2 or b.deposit<>2000 or b.total<>2200 then raise exception 'Exchange did not update deposit and price'; end if;

  -- Failed approval must leave both the request and booking unchanged.
  perform set_config('request.jwt.claim.sub',customer::text,true);
  perform public.create_booking(car2,'Khách thử','0905123456',null,start_at+interval '2 days',start_at+interval '3 days',location_name,null);
  insert into public.booking_requests(code,booking_id,user_id,kind,desired_return_at,reason)
    values(gen_random_uuid()::text,b.id,customer,'extension',start_at+interval '3 days','Gia hạn') returning id into req;
  perform set_config('request.jwt.claim.sub',staff::text,true);
  rejected:=false;
  begin
    perform public.decide_booking_request(req,true,'Đồng ý');
  exception when raise_exception then rejected:=true;
  end;
  if not rejected then raise exception 'Conflicting extension approved'; end if;
  if (select status from public.booking_requests where id=req)<>'pending'
    or (select return_at from public.bookings where id=b.id)<>start_at+interval '1 day' then
    raise exception 'Failed approval was not atomic';
  end if;

  -- A cancelled contract retaining the old deterministic code cannot block signing.
  update public.bookings set status='confirmed' where id=b.id;
  update public.contracts set status='cancelled' where booking_id=b.id;
  insert into public.contracts(code,booking_id,status) values('HD-'||b.code,b.id,'cancelled');
  insert into public.kyc_records(booking_id,user_id,status) values(b.id,customer,'verified');
  perform set_config('request.jwt.claim.sub',customer::text,true);
  c:=public.sign_my_contract(b.code);
  if c.id is null or not c.customer_signed or c.code='HD-'||b.code then raise exception 'Contract code collision regression'; end if;
  if (public.sign_my_contract(b.code)).id<>c.id then raise exception 'Signing should be idempotent'; end if;
  insert into public.payments(code,booking_id,type,amount,status) values(gen_random_uuid()::text,b.id,'deposit',1000,'paid');
  p:=public.request_deposit(b.code,'transfer');
  if p.amount<>1000 or p.status<>'pending' then raise exception 'Additional deposit must equal unpaid balance'; end if;
  if (public.request_deposit(b.code,'transfer')).id<>p.id then raise exception 'Deposit request should be idempotent'; end if;

  rejected:=false;
  begin
    update public.payments set amount=-1 where id=p.id;
  exception when check_violation then rejected:=true;
  end;
  if not rejected then raise exception 'Negative payment accepted'; end if;
  rejected:=false;
  begin
    update public.cars set odometer=-1 where id=car1;
  exception when check_violation then rejected:=true;
  end;
  if not rejected then raise exception 'Negative odometer accepted'; end if;
  if to_regprocedure('public.cancel_booking(text)') is not null then raise exception 'Obsolete cancellation RPC remains'; end if;
  raise notice 'Booking integrity integration assertions passed';
end $$;

rollback;
