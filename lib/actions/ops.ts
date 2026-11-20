"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { syncBookingReadiness } from "@/lib/booking-flow";

const num = (v: FormDataEntryValue | null, fallback = 0) =>
  v === null || v === "" ? fallback : Number(v);

async function guard(roles: string[], fallback: string) {
  const profile = await getProfile();
  if (!profile || !roles.includes(profile.role)) {
    redirect("/dang-nhap?next=" + encodeURIComponent(fallback));
  }
  return profile;
}

export async function recordHandoverAction(formData: FormData) {
  const profile = await guard(["admin", "staff"], "/nhan-vien");
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const odometer = num(formData.get("odometer"));
  const battery = num(formData.get("battery"), 100);
  const accessories = String(formData.get("accessories") ?? "");
  const damageNote = String(formData.get("damage_note") ?? "");
  const back = String(formData.get("back") ?? "/nhan-vien");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, car_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) redirect(back + "?loi=" + encodeURIComponent("Không tìm thấy đơn thuê"));

  const { error } = await supabase.from("vehicle_checks").insert({
    booking_id: bookingId,
    kind: "handover",
    odometer,
    battery,
    accessories,
    damage_note: damageNote,
    checked_by: profile.full_name,
  });
  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

  await supabase
    .from("bookings")
    .update({ status: "handed_over" })
    .eq("id", bookingId);
  await supabase
    .from("cars")
    .update({ status: "rented", odometer, battery })
    .eq("id", booking.car_id);

  revalidatePath("/nhan-vien");
  revalidatePath("/quan-tri/don");
  redirect(back + "?giao=1");
}

export async function recordReturnAction(formData: FormData) {
  const profile = await guard(["admin", "staff"], "/nhan-vien");
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const odometer = num(formData.get("odometer"));
  const battery = num(formData.get("battery"), 100);
  const fees = num(formData.get("fees"));
  const damageNote = String(formData.get("damage_note") ?? "");
  const back = String(formData.get("back") ?? "/nhan-vien");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, car_id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) redirect(back + "?loi=" + encodeURIComponent("Không tìm thấy đơn thuê"));

  const { error } = await supabase.from("vehicle_checks").insert({
    booking_id: bookingId,
    kind: "return",
    odometer,
    battery,
    damage_note: damageNote,
    fees,
    checked_by: profile.full_name,
  });
  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

  await supabase
    .from("bookings")
    .update({ status: "returned" })
    .eq("id", bookingId);
  await supabase
    .from("cars")
    .update({ status: fees > 0 ? "maintenance" : "available", odometer, battery })
    .eq("id", booking.car_id);

  if (fees > 0) {
    await supabase.from("payments").insert({
      code: `PC-${Date.now().toString().slice(-8)}`,
      booking_id: bookingId,
      type: "penalty",
      method: "cash",
      amount: fees,
      status: "paid",
      paid_at: new Date().toISOString(),
      note: "Phí phát sinh khi trả xe",
    });
  }

  revalidatePath("/nhan-vien");
  revalidatePath("/quan-tri/don");
  redirect(back + "?tra=1");
}

export async function saveMaintenanceAction(formData: FormData) {
  await guard(["admin", "staff"], "/nhan-vien");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");
  const actual = formData.get("actual") ? num(formData.get("actual")) : null;
  const { error } = id
    ? await supabase
        .from("maintenance_orders")
        .update({ status, actual })
        .eq("id", id)
    : await supabase.from("maintenance_orders").insert({
        code: `BD-${Date.now().toString().slice(-6)}`,
        car_id: String(formData.get("car_id") ?? ""),
        category: String(formData.get("category") ?? "Bảo dưỡng định kỳ"),
        assignee: String(formData.get("assignee") ?? ""),
        estimate: num(formData.get("estimate")),
        notes: String(formData.get("notes") ?? ""),
        status: "pending",
      });
  if (error) redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent(error.message));
  revalidatePath("/nhan-vien/bao-duong");
  redirect("/nhan-vien/bao-duong?luu=1");
}

export async function saveIncidentAction(formData: FormData) {
  await guard(["admin", "staff"], "/nhan-vien");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = id
    ? await supabase
        .from("incidents")
        .update({ status: String(formData.get("status") ?? "new") })
        .eq("id", id)
    : await supabase.from("incidents").insert({
        code: `SC-${Date.now().toString().slice(-6)}`,
        booking_id: String(formData.get("booking_id") || "") || null,
        car_id: String(formData.get("car_id") || "") || null,
        type: String(formData.get("type") ?? "Sự cố kỹ thuật"),
        severity: String(formData.get("severity") ?? "medium"),
        description: String(formData.get("description") ?? ""),
      });
  if (error) redirect("/nhan-vien/su-co?loi=" + encodeURIComponent(error.message));
  revalidatePath("/nhan-vien/su-co");
  redirect("/nhan-vien/su-co?luu=1");
}

export async function signContractAction(formData: FormData) {
  await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("contracts")
    .update({ status: "active", signed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect("/ke-toan?loi=" + encodeURIComponent(error.message));
  revalidatePath("/ke-toan");
  redirect("/ke-toan?ky=1");
}

export async function savePaymentAction(formData: FormData) {
  const profile = await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { data: payment, error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .select("booking_id, type")
      .maybeSingle();
    if (error) redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent(error.message));

    if (payment?.booking_id && payment.type === "deposit") {
      await syncBookingReadiness(payment.booking_id);
    }
  } else {
    const type = String(formData.get("type") ?? "income");
    const { error } = await supabase.from("payments").insert({
      code: `${type === "expense" ? "PC" : "PT"}-${Date.now().toString().slice(-8)}`,
      booking_id: String(formData.get("booking_id") || "") || null,
      type: type === "income" ? "rental" : type,
      method: String(formData.get("method") ?? "transfer"),
      amount: num(formData.get("amount")),
      status: "paid",
      paid_at: new Date().toISOString(),
      note: `${String(formData.get("note") ?? "")} · ${profile.full_name}`,
    });
    if (error) redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent(error.message));
  }
  revalidatePath("/ke-toan/thu-chi");
  redirect("/ke-toan/thu-chi?luu=1");
}

export async function saveFineAction(formData: FormData) {
  await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = id
    ? await supabase
        .from("fines")
        .update({ status: String(formData.get("status") ?? "resolved") })
        .eq("id", id)
    : await supabase.from("fines").insert({
        code: `PN-${Date.now().toString().slice(-6)}`,
        plate: String(formData.get("plate") ?? ""),
        occurred_at: formData.get("occurred_at")
          ? new Date(String(formData.get("occurred_at"))).toISOString()
          : null,
        amount: num(formData.get("amount")),
        note: String(formData.get("note") ?? ""),
        status: "new",
      });
  if (error) redirect("/ke-toan/phat-nguoi?loi=" + encodeURIComponent(error.message));
  revalidatePath("/ke-toan/phat-nguoi");
  redirect("/ke-toan/phat-nguoi?luu=1");
}

export async function settleDepositAction(formData: FormData) {
  const profile = await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const refund = num(formData.get("refund"));
  const deduction = num(formData.get("deduction"));
  const back = String(formData.get("back") ?? "/ke-toan/quyet-toan");

  await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);
  const { error } = await supabase.from("payments").insert({
    code: `PC-${Date.now().toString().slice(-8)}`,
    booking_id: bookingId,
    type: "refund",
    method: "transfer",
    amount: refund,
    status: "paid",
    paid_at: new Date().toISOString(),
    note: `Quyết toán cọc · cấn trừ ${deduction.toLocaleString("vi-VN")} ₫ · ${profile.full_name}`,
  });
  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

  revalidatePath("/ke-toan/quyet-toan");
  revalidatePath("/ke-toan/thu-chi");
  redirect(back + "?quyettoan=1");
}

// ------------------------------------------------------------------ customer requests
export async function verifyKycAction(formData: FormData) {
  const profile = await guard(["admin", "staff"], "/nhan-vien/yeu-cau");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "verify");
  const note = String(formData.get("note") ?? "").trim();
  const back = String(formData.get("back") ?? "/nhan-vien/yeu-cau");

  const { data: kyc } = await supabase
    .from("kyc_records")
    .select("id, booking_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!kyc) redirect(back + "?loi=" + encodeURIComponent("Không tìm thấy hồ sơ eKYC"));

  const { error } = await supabase
    .from("kyc_records")
    .update({
      status: decision === "verify" ? "verified" : "rejected",
      note: note || null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

  if (decision === "verify") await syncBookingReadiness(kyc.booking_id);

  revalidatePath(back);
  revalidatePath("/tai-khoan");
  redirect(back + "?capnhat=1");
}

export async function decideRequestAction(formData: FormData) {
  const profile = await guard(["admin", "staff"], "/nhan-vien/yeu-cau");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "reject");
  const back = String(formData.get("back") ?? "/nhan-vien/yeu-cau");

  const { data: request } = await supabase
    .from("booking_requests")
    .select("id, kind, booking_id, desired_return_at, replacement_car_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    redirect(back + "?loi=" + encodeURIComponent("Yêu cầu không còn ở trạng thái chờ duyệt"));
  }

  if (decision === "approve") {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, car_id, pickup_at, return_at, days, unit_price, deposit")
      .eq("id", request.booking_id)
      .maybeSingle();

    if (!booking) redirect(back + "?loi=" + encodeURIComponent("Không tìm thấy đơn thuê"));

    if (request.kind === "extension" && request.desired_return_at) {
      const { data: free } = await supabase.rpc("is_car_available", {
        p_car_id: booking.car_id,
        p_pickup: booking.pickup_at,
        p_return: request.desired_return_at,
        p_exclude_booking: booking.id,
      });
      if (free === false) {
        redirect(back + "?loi=" + encodeURIComponent("Xe đã có lịch trong thời gian gia hạn"));
      }

      const days = Math.max(
        1,
        Math.ceil(
          (new Date(request.desired_return_at).getTime() - new Date(booking.pickup_at).getTime()) /
            86_400_000,
        ),
      );
      const { error } = await supabase
        .from("bookings")
        .update({
          return_at: request.desired_return_at,
          days,
          total: days * Number(booking.unit_price) + Number(booking.deposit),
        })
        .eq("id", booking.id);
      if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));
    }

    if (request.kind === "exchange" && request.replacement_car_id) {
      const { data: car } = await supabase
        .from("cars")
        .select("id, price_per_day")
        .eq("id", request.replacement_car_id)
        .maybeSingle();
      if (!car) redirect(back + "?loi=" + encodeURIComponent("Xe thay thế không tồn tại"));

      const days = Math.max(
        1,
        Math.ceil(
          (new Date(booking.return_at).getTime() - new Date(booking.pickup_at).getTime()) /
            86_400_000,
        ),
      );
      const { error } = await supabase
        .from("bookings")
        .update({
          car_id: car.id,
          days,
          unit_price: car.price_per_day,
          total: days * Number(car.price_per_day) + Number(booking.deposit),
        })
        .eq("id", booking.id);
      if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));
    }
  }

  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

  revalidatePath(back);
  revalidatePath("/tai-khoan");
  revalidatePath("/nhan-vien");
  redirect(back + "?capnhat=1");
}

export async function approveEstimateAction(formData: FormData) {
  await guard(["admin", "accountant"], "/ke-toan/duyet-du-toan");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase
    .from("maintenance_orders")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    redirect("/ke-toan/duyet-du-toan?loi=" + encodeURIComponent(error.message));
  }

  revalidatePath("/ke-toan/duyet-du-toan");
  revalidatePath("/nhan-vien/bao-duong");
  redirect("/ke-toan/duyet-du-toan?duyet=1");
}
