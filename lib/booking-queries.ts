import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type Profile } from "@/lib/auth";

export type BookingCar = {
  id: string;
  code: string;
  brand: string;
  model: string;
  plate: string;
  seats: number;
  transmission: string;
  fuel: string;
  image_url: string | null;
  price_per_day: number;
  deposit: number;
};

export type OwnedBooking = {
  id: string;
  code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  pickup_at: string;
  return_at: string;
  pickup_location: string;
  days: number;
  unit_price: number;
  deposit: number;
  extras: number;
  total: number;
  note: string | null;
  car_id: string;
  created_at: string;
  cars: BookingCar | null;
};

export type ContractRow = {
  id: string;
  code: string;
  status: string;
  customer_signed: boolean;
  signed_at: string | null;
};

export type KycRow = {
  id: string;
  status: string;
  note: string | null;
  id_front_path: string | null;
  id_back_path: string | null;
  license_path: string | null;
  selfie_path: string | null;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  code: string;
  type: string;
  method: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type RequestRow = {
  id: string;
  code: string;
  kind: string;
  desired_return_at: string | null;
  replacement_car_id: string | null;
  reason: string | null;
  fee: number;
  status: string;
  created_at: string;
  cars?: { model: string; plate: string } | null;
};

export type ReviewRow = {
  id: string;
  car_rating: number;
  service_rating: number;
  comment: string | null;
  photo_paths: string[];
  created_at: string;
};

export const BOOKING_SELECT =
  "id, code, status, customer_name, customer_phone, customer_email, pickup_at, return_at, pickup_location, days, unit_price, deposit, extras, total, note, car_id, created_at, cars(id, code, brand, model, plate, seats, transmission, fuel, image_url, price_per_day, deposit)";

export async function requireCustomer(next: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return profile;
}

export async function getOwnedBooking(code: string) {
  const profile = await requireCustomer(`/tai-khoan/${code}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("code", code)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!data) notFound();

  return { profile, supabase, booking: data as unknown as OwnedBooking };
}

export async function getBookingContext(code: string) {
  const { profile, supabase, booking } = await getOwnedBooking(code);

  const [contract, kyc, payments, requests, review, policies] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, code, status, customer_signed, signed_at")
      .eq("booking_id", booking.id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("kyc_records")
      .select("id, status, note, id_front_path, id_back_path, license_path, selfie_path, created_at")
      .eq("booking_id", booking.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, code, type, method, amount, status, paid_at, created_at")
      .eq("booking_id", booking.id)
      .order("created_at"),
    supabase
      .from("booking_requests")
      .select("id, code, kind, desired_return_at, replacement_car_id, reason, fee, status, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, car_rating, service_rating, comment, photo_paths, created_at")
      .eq("booking_id", booking.id)
      .maybeSingle(),
    supabase
      .from("policies")
      .select("name, deposit_type, deposit_value, fine_hold, cancel_hours, refund_pct, effective_from")
      .eq("active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const paymentRows = (payments.data ?? []) as PaymentRow[];
  const deposit = paymentRows.find((p) => p.type === "deposit") ?? null;

  return {
    profile,
    supabase,
    booking,
    contract: (contract.data as ContractRow | null) ?? null,
    kyc: (kyc.data as KycRow | null) ?? null,
    payments: paymentRows,
    deposit,
    requests: (requests.data ?? []) as RequestRow[],
    review: (review.data as ReviewRow | null) ?? null,
    policy: policies.data,
  };
}
