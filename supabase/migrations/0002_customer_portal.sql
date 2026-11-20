-- Lái Đi · customer portal: eKYC, contract signing, booking requests, reviews
-- Run with: supabase db push  (or paste into the Supabase SQL editor)
-- Depends on 0001_init.sql.

-- ---------------------------------------------------------------- tables
create table if not exists public.kyc_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  id_front_path text,
  id_back_path text,
  license_path text,
  selfie_path text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('extension', 'exchange', 'cancellation')),
  desired_return_at timestamptz,
  replacement_car_id uuid references public.cars (id) on delete set null,
  reason text,
  fee numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete cascade,
  car_rating int not null check (car_rating between 1 and 5),
  service_rating int not null check (service_rating between 1 and 5),
  comment text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.incidents add column if not exists photos text[] not null default '{}';

create index if not exists kyc_user_idx on public.kyc_records (user_id);
create index if not exists requests_booking_idx on public.booking_requests (booking_id);
create index if not exists requests_status_idx on public.booking_requests (status, kind);
create index if not exists reviews_car_idx on public.reviews (car_id);

-- ---------------------------------------------------------------- RPCs
create or replace function public.request_deposit(p_code text, p_method text default 'transfer')
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_payment public.payments;
begin
  if p_method not in ('cash', 'transfer', 'card') then
    raise exception 'Phương thức thanh toán không hợp lệ';
  end if;

  select * into v_booking from public.bookings
  where code = p_code and user_id = auth.uid();

  if v_booking.id is null then
    raise exception 'Không tìm thấy đơn thuê của bạn';
  end if;
  if v_booking.status not in ('pending', 'confirmed', 'signed') then
    raise exception 'Đơn này không thể đặt cọc trực tuyến';
  end if;

  select * into v_payment from public.payments
  where booking_id = v_booking.id and type = 'deposit' and status in ('pending', 'paid')
  order by created_at
  limit 1;

  if v_payment.id is not null then
    return v_payment;
  end if;

  insert into public.payments (code, booking_id, type, method, amount, status, note)
  values (
    'PT-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'),
    v_booking.id, 'deposit', p_method, v_booking.deposit, 'pending', 'Khách đặt cọc trực tuyến'
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.sign_my_contract(p_code text)
returns public.contracts
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_contract public.contracts;
begin
  select * into v_booking from public.bookings
  where code = p_code and user_id = auth.uid();

  if v_booking.id is null then
    raise exception 'Không tìm thấy đơn thuê của bạn';
  end if;
  if v_booking.status not in ('pending', 'confirmed', 'signed') then
    raise exception 'Đơn này không thể ký hợp đồng';
  end if;

  select * into v_contract from public.contracts
  where booking_id = v_booking.id
  order by created_at
  limit 1;

  if v_contract.id is null then
    insert into public.contracts (code, booking_id, customer_signed, signed_at, status)
    values (
      'HD-' || replace(v_booking.code, 'LD-', ''),
      v_booking.id, true, now(), 'pending'
    )
    returning * into v_contract;
  else
    update public.contracts
    set customer_signed = true,
        signed_at = coalesce(signed_at, now())
    where id = v_contract.id
    returning * into v_contract;
  end if;

  return v_contract;
end;
$$;

create or replace function public.cancel_my_booking(p_code text, p_reason text default null)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  v_booking := public.cancel_booking(p_code);

  insert into public.booking_requests (
    code, booking_id, user_id, kind, reason, status, decided_by, decided_at
  ) values (
    'YC-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'),
    v_booking.id, auth.uid(), 'cancellation', nullif(p_reason, ''), 'approved', auth.uid(), now()
  );

  return v_booking;
end;
$$;

create or replace function public.refresh_car_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_car uuid;
  v_avg numeric;
begin
  v_car := coalesce(new.car_id, old.car_id);
  select round(avg(car_rating)::numeric, 1) into v_avg from public.reviews where car_id = v_car;
  if v_avg is not null then
    update public.cars set rating = v_avg where id = v_car;
  end if;
  return null;
end;
$$;

drop trigger if exists reviews_rating on public.reviews;
create trigger reviews_rating
  after insert or update of car_rating or delete on public.reviews
  for each row execute function public.refresh_car_rating();

-- ---------------------------------------------------------------- RLS
alter table public.kyc_records enable row level security;
alter table public.booking_requests enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "kyc read" on public.kyc_records;
create policy "kyc read" on public.kyc_records for select
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'staff', 'accountant')
  );

drop policy if exists "kyc insert own" on public.kyc_records;
create policy "kyc insert own" on public.kyc_records for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "kyc review" on public.kyc_records;
create policy "kyc review" on public.kyc_records for update
  using (public.current_user_role() in ('admin', 'staff'))
  with check (public.current_user_role() in ('admin', 'staff'));

drop policy if exists "requests read" on public.booking_requests;
create policy "requests read" on public.booking_requests for select
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'staff', 'accountant')
  );

drop policy if exists "requests insert own" on public.booking_requests;
create policy "requests insert own" on public.booking_requests for insert
  with check (
    user_id = auth.uid()
    and kind in ('extension', 'exchange')
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
        and b.status in ('pending', 'confirmed', 'signed', 'handed_over')
    )
  );

drop policy if exists "requests decide" on public.booking_requests;
create policy "requests decide" on public.booking_requests for update
  using (public.current_user_role() in ('admin', 'staff'))
  with check (public.current_user_role() in ('admin', 'staff'));

drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);

drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
        and b.car_id = car_id
        and b.status = 'completed'
    )
  );

drop policy if exists "incidents read own" on public.incidents;
create policy "incidents read own" on public.incidents for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = incidents.booking_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "incidents insert own" on public.incidents;
create policy "incidents insert own" on public.incidents for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('kyc', 'kyc', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;

drop policy if exists "kyc upload own" on storage.objects;
create policy "kyc upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc read own" on storage.objects;
create policy "kyc read own" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc read staff" on storage.objects;
create policy "kyc read staff" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and public.current_user_role() in ('admin', 'staff', 'accountant'));

drop policy if exists "review photos upload own" on storage.objects;
create policy "review photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "review photos read" on storage.objects;
create policy "review photos read" on storage.objects for select
  using (bucket_id = 'review-photos');

drop policy if exists "incident photos upload own" on storage.objects;
create policy "incident photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "incident photos read own" on storage.objects;
create policy "incident photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "incident photos read staff" on storage.objects;
create policy "incident photos read staff" on storage.objects for select to authenticated
  using (bucket_id = 'incident-photos' and public.current_user_role() in ('admin', 'staff', 'accountant'));

-- ---------------------------------------------------------------- grants
grant select, insert, update on public.kyc_records to authenticated;
grant select, insert, update on public.booking_requests to authenticated;
grant select, insert on public.reviews to anon, authenticated;
grant select, insert on public.incidents to authenticated;

grant execute on function public.request_deposit to authenticated;
grant execute on function public.sign_my_contract to authenticated;
grant execute on function public.cancel_my_booking to authenticated;
