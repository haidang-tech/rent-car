"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export type BookingState = {
  error?: string;
  success?: string;
  code?: string;
} | null;

export async function createBookingAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const supabase = await createClient();
  const carId = String(formData.get("car_id") ?? "");
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("customer_phone") ?? "").trim();
  const email = String(formData.get("customer_email") ?? "").trim();
  const pickupAt = String(formData.get("pickup_at") ?? "");
  const returnAt = String(formData.get("return_at") ?? "");
  const pickupLocation = String(formData.get("pickup_location") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!carId || !pickupAt || !returnAt) {
    return { error: "Vui lòng chọn xe và thời gian thuê." };
  }

  const { data, error } = await supabase.rpc("create_booking", {
    p_car_id: carId,
    p_customer_name: name,
    p_customer_phone: phone,
    p_customer_email: email || null,
    p_pickup_at: new Date(pickupAt).toISOString(),
    p_return_at: new Date(returnAt).toISOString(),
    p_pickup_location: pickupLocation,
    p_note: note || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/tai-khoan");
  revalidatePath("/xe");
  revalidatePath("/quan-tri/don");
  return {
    success: `Đã gửi yêu cầu thuê xe. Mã đơn ${data.code}.`,
    code: data.code as string,
  };
}

export async function cancelBookingAction(formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "");
  const { error } = await supabase.rpc("cancel_booking", { p_code: code });
  if (error) redirect(`/tai-khoan?loi=${encodeURIComponent(error.message)}`);
  revalidatePath("/tai-khoan");
  revalidatePath("/quan-tri/don");
  redirect("/tai-khoan?huy=1");
}

export async function updateBookingStatusAction(formData: FormData) {
  const profile = await getProfile();
  if (!profile || !["admin", "staff", "accountant"].includes(profile.role)) {
    redirect("/dang-nhap");
  }
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const back = String(formData.get("back") ?? "/quan-tri/don");

  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) redirect(`${back}?loi=${encodeURIComponent(error.message)}`);

  if (status === "signed") {
    await supabase
      .from("contracts")
      .upsert(
        {
          code: `HD-${String(formData.get("code") ?? "").replace("LD-", "")}`,
          booking_id: id,
          customer_signed: true,
          signed_at: new Date().toISOString(),
          status: "active",
        },
        { onConflict: "code" },
      );
  }

  revalidatePath("/quan-tri/don");
  revalidatePath("/nhan-vien");
  revalidatePath("/ke-toan");
  revalidatePath(back);
  redirect(`${back}?capnhat=1`);
}
