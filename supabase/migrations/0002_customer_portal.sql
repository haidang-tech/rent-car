-- Lái Đi · customer portal schema: eKYC, contract add-ons, booking requests, reviews.
-- Run with: supabase db push  (or paste into the Supabase SQL editor)
-- Depends on 0001_init.sql. Workflows, RLS policies and grants live in 0003.

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
  kind text not null check (kind in ('extension', 'exchange', 'cancellation', 'incident')),
  desired_return_at timestamptz,
  replacement_car_id uuid references public.cars (id) on delete set null,
  reason text,
  photo_paths text[] not null default '{}',
  fee numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
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
alter table public.contracts add column if not exists terms_snapshot jsonb;
alter table public.contracts add column if not exists accepted_version text;
alter table public.bookings add column if not exists policy_snapshot jsonb;

create index if not exists kyc_user_idx on public.kyc_records (user_id);
create index if not exists requests_booking_idx on public.booking_requests (booking_id);
create index if not exists requests_status_idx on public.booking_requests (status, kind);
create index if not exists reviews_car_idx on public.reviews (car_id);

-- ---------------------------------------------------------------- rating
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
-- Policies and column grants are defined in 0003; RLS must be on before then.
alter table public.kyc_records enable row level security;
alter table public.booking_requests enable row level security;
alter table public.reviews enable row level security;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc', 'kyc', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
