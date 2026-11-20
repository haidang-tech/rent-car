import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TripCar = { id: string; code: string; brand: string; model: string; seats: number; fuel: string; transmission: string; image_url: string | null; price_per_day: number; status: string };
export type Trip = { id: string; code: string; user_id: string; car_id: string; customer_name: string; pickup_at: string; return_at: string; pickup_location: string; days: number; unit_price: number; deposit: number; extras: number; total: number; status: string; created_at: string; policy_snapshot: { cancel_hours: number; refund_pct: number; name: string } | null; cars: TripCar | null };
export const getMyTrip = cache(async (code: string) => {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=" + encodeURIComponent(`/tai-khoan/${code}`));
  const db = await createClient();
  const { data, error } = await db.from("bookings").select("*, cars(id,code,brand,model,seats,fuel,transmission,image_url,price_per_day,status)").eq("code", code).eq("user_id", profile.id).maybeSingle();
  if (error) throw new Error("Không tải được chuyến thuê. Vui lòng thử lại.");
  if (!data) notFound();
  return { profile, db, trip: data as unknown as Trip, requestTime: Date.now() };
});
export const ACCOUNT_ROUTES = [
  ["", "Chi tiết chuyến"], ["ekyc", "Xác thực giấy tờ"], ["hop-dong", "Hợp đồng"], ["thanh-toan", "Tiền cọc"], ["gia-han", "Gia hạn"], ["doi-xe", "Đổi xe"], ["huy", "Hủy chuyến"], ["su-co", "Báo sự cố"], ["danh-gia", "Đánh giá"]
] as const;
