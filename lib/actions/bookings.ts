"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { bookingErrorMessage, validateBookingInput } from "@/lib/booking-validation";

export type BookingState = {
  error?: string;
  success?: string;
  code?: string;
} | null;

export async function createBookingAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const carId = String(formData.get("car_id") ?? "");
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("customer_phone") ?? "").trim();
  const email = String(formData.get("customer_email") ?? "").trim();
  const pickupAt = String(formData.get("pickup_at") ?? "");
  const returnAt = String(formData.get("return_at") ?? "");
  const pickupLocation = String(formData.get("pickup_location") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const validated = validateBookingInput({ carId, name, phone, email, pickup: pickupAt, ret: returnAt, location: pickupLocation, note });
  if ("error" in validated) return validated;

  try {
    const supabase = await createClient();
    const { data: location, error: locationError } = await supabase.from("locations")
      .select("id").eq("name", pickupLocation).eq("active", true).limit(1).maybeSingle();
    if (locationError) return { error: "Chưa thể kiểm tra điểm nhận xe. Vui lòng thử lại." };
    if (!location) return { error: "Điểm nhận xe không còn hoạt động. Vui lòng chọn lại." };
    const { data, error } = await supabase.rpc("create_booking", {
      p_car_id: carId,
      p_customer_name: name,
      p_customer_phone: phone,
      p_customer_email: email || null,
      p_pickup_at: validated.pickupAt,
      p_return_at: validated.returnAt,
      p_pickup_location: pickupLocation,
      p_note: note || null,
    });

    if (error) return { error: bookingErrorMessage(error) };
    if (!data?.code) return { error: "Chưa nhận được mã đơn. Vui lòng liên hệ hỗ trợ trước khi đặt lại." };

    revalidatePath("/tai-khoan");
    revalidatePath("/xe");
    revalidatePath("/quan-tri/don");
    return {
      success: `Đã gửi yêu cầu thuê xe. Mã đơn ${data.code}.`,
      code: data.code as string,
    };
  } catch {
    return { error: "Kết nối bị gián đoạn. Vui lòng kiểm tra đơn của bạn trước khi thử lại." };
  }
}

export async function updateBookingStatusAction(formData: FormData) {
  const profile = await getProfile();
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    redirect("/dang-nhap?next=/quan-tri/don");
  }
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) redirect(`/quan-tri/don?loi=${encodeURIComponent(error.message)}`);
  if (!data) redirect("/quan-tri/don?loi=" + encodeURIComponent("Đơn không còn chờ xác nhận."));

  revalidatePath("/quan-tri/don");
  revalidatePath("/nhan-vien");
  revalidatePath("/ke-toan");
  revalidatePath("/tai-khoan", "layout");
  redirect("/quan-tri/don?capnhat=1");
}
