-- Lái Đi · rent car schema
-- Run with: supabase db push  (or paste into Supabase SQL editor)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Khách hàng',
  phone text,
  role text not null default 'customer' check (role in ('admin', 'staff', 'accountant', 'customer')),
  branch text default 'Đà Nẵng',
  status text not null default 'active' check (status in ('active', 'locked')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'khach'), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    case when new.raw_user_meta_data ->> 'role' in ('admin', 'staff', 'accountant') then 'customer' else 'customer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid()), 'anon') $$;

-- ---------------------------------------------------------------- catalogs
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null default 'hub' check (type in ('hub', 'airport', 'hotel', 'office')),
  address text,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plate text not null unique,
  brand text not null,
  model text not null,
  category text not null default 'suv',
  seats int not null default 5 check (seats between 2 and 30),
  transmission text not null default 'auto' check (transmission in ('auto', 'manual')),
  fuel text not null default 'electric' check (fuel in ('electric', 'petrol', 'diesel', 'hybrid')),
  year int,
  price_per_day numeric not null default 0 check (price_per_day >= 0),
  deposit numeric not null default 0 check (deposit >= 0),
  location_id uuid references public.locations (id) on delete set null,
  status text not null default 'available' check (status in ('available', 'rented', 'maintenance', 'unavailable')),
  odometer int not null default 0,
  battery int not null default 100 check (battery between 0 and 100),
  rating numeric(2, 1) default 4.8,
  image_url text,
  gallery text[] not null default '{}',
  features text[] not null default '{}',
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null default 'Ô tô tự lái',
  kind text not null default 'base' check (kind in ('base', 'holiday', 'surcharge')),
  amount numeric not null default 0,
  unit text default 'ngày',
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  deposit_type text not null default 'percent' check (deposit_type in ('fixed', 'percent')),
  deposit_value numeric not null default 0,
  fine_hold numeric not null default 0,
  cancel_hours int not null default 24,
  refund_pct int not null default 100 check (refund_pct between 0 and 100),
  effective_from date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  car_id uuid not null references public.cars (id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  pickup_location text not null default 'Đà Nẵng',
  return_location text,
  days int not null default 1 check (days >= 1),
  unit_price numeric not null default 0,
  deposit numeric not null default 0,
  extras numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'signed', 'handed_over', 'returned', 'completed', 'cancelled')),
  channel text not null default 'website',
  note text,
  created_at timestamptz not null default now(),
  constraint booking_dates_valid check (return_at > pickup_at)
);

create index if not exists bookings_car_window_idx on public.bookings (car_id, pickup_at, return_at);
create index if not exists bookings_user_idx on public.bookings (user_id);

create or replace function public.is_car_available(
  p_car_id uuid,
  p_pickup timestamptz,
  p_return timestamptz,
  p_exclude_booking uuid default null
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.bookings b
    where b.car_id = p_car_id
      and b.status in ('pending', 'confirmed', 'signed', 'handed_over')
      and b.id is distinct from p_exclude_booking
      and tstzrange(b.pickup_at, b.return_at, '[)') && tstzrange(p_pickup, p_return, '[)')
  );
$$;

create or replace function public.create_booking(
  p_car_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_pickup_at timestamptz,
  p_return_at timestamptz,
  p_pickup_location text,
  p_note text default null
)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_car public.cars;
  v_days int;
  v_code text;
  v_booking public.bookings;
begin
  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'Vui lòng nhập họ tên người thuê';
  end if;
  if p_customer_phone is null or length(regexp_replace(p_customer_phone, '\D', '', 'g')) < 9 then
    raise exception 'Số điện thoại không hợp lệ';
  end if;
  if p_return_at <= p_pickup_at then
    raise exception 'Ngày trả phải sau ngày nhận';
  end if;
  if p_pickup_at < now() - interval '1 day' then
    raise exception 'Thời gian nhận xe đã qua';
  end if;

  select * into v_car from public.cars where id = p_car_id and status in ('available', 'rented');
  if v_car.id is null then
    raise exception 'Xe không tồn tại hoặc đang ngừng khai thác';
  end if;

  if not public.is_car_available(p_car_id, p_pickup_at, p_return_at) then
    raise exception 'Xe đã có lịch trong khoảng thời gian này';
  end if;

  v_days := greatest(1, ceil(extract(epoch from (p_return_at - p_pickup_at)) / 86400)::int);
  v_code := 'LD-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  insert into public.bookings (
    code, user_id, car_id, customer_name, customer_phone, customer_email,
    pickup_at, return_at, pickup_location, return_location,
    days, unit_price, deposit, total, status, note
  ) values (
    v_code, auth.uid(), v_car.id, trim(p_customer_name), trim(p_customer_phone), p_customer_email,
    p_pickup_at, p_return_at, coalesce(nullif(p_pickup_location, ''), 'Đà Nẵng'), coalesce(nullif(p_pickup_location, ''), 'Đà Nẵng'),
    v_days, v_car.price_per_day, v_car.deposit, v_car.price_per_day * v_days + v_car.deposit, 'pending', p_note
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_code text)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
  where code = p_code and user_id = auth.uid()
  for update;

  if v_booking.id is null then
    raise exception 'Không tìm thấy đơn thuê của bạn';
  end if;
  if v_booking.status not in ('pending', 'confirmed', 'signed') then
    raise exception 'Đơn này không thể hủy trực tuyến';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------- operations
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  customer_signed boolean not null default false,
  signed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled')),
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_checks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('handover', 'return')),
  odometer int,
  battery int,
  accessories text,
  damage_note text,
  photos text[] not null default '{}',
  checked_by text,
  fees numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  booking_id uuid references public.bookings (id) on delete set null,
  type text not null check (type in ('deposit', 'rental', 'refund', 'expense', 'penalty')),
  method text not null default 'transfer' check (method in ('cash', 'transfer', 'card')),
  amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  car_id uuid not null references public.cars (id) on delete cascade,
  category text not null default 'Bảo dưỡng định kỳ',
  assignee text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'in_progress', 'completed')),
  estimate numeric not null default 0,
  actual numeric,
  notes text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  booking_id uuid references public.bookings (id) on delete set null,
  car_id uuid references public.cars (id) on delete set null,
  type text not null default 'Sự cố kỹ thuật',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'new' check (status in ('new', 'processing', 'resolved')),
  description text,
  replacement_car_id uuid references public.cars (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.fines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plate text not null,
  occurred_at timestamptz,
  booking_id uuid references public.bookings (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'verifying', 'waiting', 'resolved')),
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.cars enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.policies enable row level security;
alter table public.bookings enable row level security;
alter table public.contracts enable row level security;
alter table public.vehicle_checks enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_orders enable row level security;
alter table public.incidents enable row level security;
alter table public.fines enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select using (
    id = auth.uid() or public.current_user_role() in ('admin', 'staff', 'accountant')
  );

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "catalog read" on public.cars;
create policy "catalog read" on public.cars for select using (true);
drop policy if exists "cars write" on public.cars;
create policy "cars write" on public.cars for all
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "locations read" on public.locations;
create policy "locations read" on public.locations for select using (true);
drop policy if exists "locations write" on public.locations;
create policy "locations write" on public.locations for all
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "pricing read" on public.pricing_rules;
create policy "pricing read" on public.pricing_rules for select using (true);
drop policy if exists "pricing write" on public.pricing_rules;
create policy "pricing write" on public.pricing_rules for all
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "policies read" on public.policies;
create policy "policies read" on public.policies for select using (true);
drop policy if exists "policies write" on public.policies;
create policy "policies write" on public.policies for all
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

drop policy if exists "bookings read own" on public.bookings;
create policy "bookings read own" on public.bookings for select
  using (user_id = auth.uid() or public.current_user_role() in ('admin', 'staff', 'accountant'));

drop policy if exists "bookings staff update" on public.bookings;
create policy "bookings staff update" on public.bookings for update
  using (public.current_user_role() in ('admin', 'staff', 'accountant'))
  with check (public.current_user_role() in ('admin', 'staff', 'accountant'));

drop policy if exists "contracts read" on public.contracts;
create policy "contracts read" on public.contracts for select
  using (public.current_user_role() in ('admin', 'staff', 'accountant'));
drop policy if exists "contracts write" on public.contracts;
create policy "contracts write" on public.contracts for all
  using (public.current_user_role() in ('admin', 'accountant')) with check (public.current_user_role() in ('admin', 'accountant'));

drop policy if exists "checks read" on public.vehicle_checks;
create policy "checks read" on public.vehicle_checks for select
  using (public.current_user_role() in ('admin', 'staff', 'accountant'));
drop policy if exists "checks write" on public.vehicle_checks;
create policy "checks write" on public.vehicle_checks for all
  using (public.current_user_role() in ('admin', 'staff')) with check (public.current_user_role() in ('admin', 'staff'));

drop policy if exists "payments read" on public.payments;
create policy "payments read" on public.payments for select
  using (public.current_user_role() in ('admin', 'staff', 'accountant'));
drop policy if exists "payments write" on public.payments;
create policy "payments write" on public.payments for all
  using (public.current_user_role() in ('admin', 'accountant')) with check (public.current_user_role() in ('admin', 'accountant'));

drop policy if exists "maintenance read" on public.maintenance_orders;
create policy "maintenance read" on public.maintenance_orders for select
  using (public.current_user_role() in ('admin', 'staff', 'accountant'));
drop policy if exists "maintenance write" on public.maintenance_orders;
create policy "maintenance write" on public.maintenance_orders for all
  using (public.current_user_role() in ('admin', 'staff')) with check (public.current_user_role() in ('admin', 'staff'));

drop policy if exists "incidents read" on public.incidents;
create policy "incidents read" on public.incidents for select
  using (public.current_user_role() in ('admin', 'staff', 'accountant'));
drop policy if exists "incidents write" on public.incidents;
create policy "incidents write" on public.incidents for all
  using (public.current_user_role() in ('admin', 'staff')) with check (public.current_user_role() in ('admin', 'staff'));

drop policy if exists "fines read" on public.fines;
create policy "fines read" on public.fines for select
  using (public.current_user_role() in ('admin', 'accountant'));
drop policy if exists "fines write" on public.fines;
create policy "fines write" on public.fines for all
  using (public.current_user_role() in ('admin', 'accountant')) with check (public.current_user_role() in ('admin', 'accountant'));

-- profile created by trigger; grant only what is needed
grant usage on schema public to anon, authenticated;
grant select on public.cars, public.locations, public.pricing_rules, public.policies to anon, authenticated;
grant select on all tables in schema public to authenticated;
grant execute on function public.create_booking to anon, authenticated;
grant execute on function public.cancel_booking to authenticated;
grant execute on function public.is_car_available to anon, authenticated;
