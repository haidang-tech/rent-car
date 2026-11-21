"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { parseVnDateTimeLocal } from "@/lib/time";

const num = (v: FormDataEntryValue | null, fallback = 0) =>
  v === null || v === "" ? fallback : Number(v);

async function guard(roles: string[], fallback: string) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active" || !roles.includes(profile.role)) {
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

  if (!bookingId || odometer < 0 || battery < 0 || battery > 100) {
    redirect(back + "?loi=" + encodeURIComponent("Thông tin bàn giao không hợp lệ"));
  }
  const { error } = await supabase.rpc("record_handover", {
    p_booking_id: bookingId,
    p_odometer: odometer,
    p_battery: battery,
    p_accessories: accessories,
    p_damage_note: damageNote,
    p_checked_by: profile.full_name,
  });
  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

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

  if (!bookingId || odometer < 0 || battery < 0 || battery > 100 || fees < 0) {
    redirect(back + "?loi=" + encodeURIComponent("Thông tin trả xe không hợp lệ"));
  }
  const { error } = await supabase.rpc("record_return", {
    p_booking_id: bookingId,
    p_odometer: odometer,
    p_battery: battery,
    p_fees: fees,
    p_damage_note: damageNote,
    p_checked_by: profile.full_name,
  });
  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

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
  if (id) {
  if (status === "completed") {
    if (actual === null || actual < 0) {
      redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent("Chi phí thực tế không hợp lệ."));
    }
    const { error } = await supabase.rpc("complete_maintenance", { p_id: id, p_actual: actual });
    if (error) redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent(error.message));
  } else if (status === "in_progress") {
    const { data, error } = await supabase
      .from("maintenance_orders")
      .update({ status: "in_progress" })
      .eq("id", id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();
    if (error) redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent(error.message));
    if (!data) redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent("Lệnh bảo dưỡng không còn ở trạng thái đã duyệt."));
  } else {
    redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent("Chuyển trạng thái bảo dưỡng không hợp lệ."));
  }
  } else {
  const estimate = num(formData.get("estimate"));
  if (estimate < 0) redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent("Dự toán không hợp lệ."));
  const { error } = await supabase.rpc("create_maintenance_order", {
    p_car_id: String(formData.get("car_id") ?? ""),
    p_category: String(formData.get("category") ?? "Bảo dưỡng định kỳ"),
    p_assignee: String(formData.get("assignee") ?? ""),
    p_estimate: estimate,
    p_notes: String(formData.get("notes") ?? ""),
  });
    if (error) redirect("/nhan-vien/bao-duong?loi=" + encodeURIComponent(error.message));
  }
  revalidatePath("/nhan-vien/bao-duong");
  revalidatePath("/ke-toan/duyet-du-toan");
  redirect("/nhan-vien/bao-duong?luu=1");
}

export async function saveIncidentAction(formData: FormData) {
  await guard(["admin", "staff"], "/nhan-vien");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new");
  const severity = String(formData.get("severity") ?? "medium");
  if (id && !["new", "processing", "resolved"].includes(status)) {
    redirect("/nhan-vien/su-co?loi=" + encodeURIComponent("Trạng thái sự cố không hợp lệ."));
  }
  if (!id && !["low", "medium", "high"].includes(severity)) {
    redirect("/nhan-vien/su-co?loi=" + encodeURIComponent("Mức độ sự cố không hợp lệ."));
  }
  const { error } = id
    ? await supabase
        .from("incidents")
        .update({ status })
        .eq("id", id)
    : await supabase.from("incidents").insert({
        code: `SC-${Date.now().toString().slice(-6)}`,
        booking_id: String(formData.get("booking_id") || "") || null,
        car_id: String(formData.get("car_id") || "") || null,
        type: String(formData.get("type") ?? "Sự cố kỹ thuật"),
        severity,
        replacement_car_id: String(formData.get("replacement_car_id") || "") || null,
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
  const { data, error } = await supabase
    .from("contracts")
    .update({ status: "active" })
    .eq("id", id)
    .eq("status", "pending")
    .eq("customer_signed", true)
    .select("id")
    .maybeSingle();
  if (error) redirect("/ke-toan?loi=" + encodeURIComponent(error.message));
  if (!data) redirect("/ke-toan?loi=" + encodeURIComponent("Chỉ có thể duyệt hợp đồng đang chờ và đã được khách xác nhận."));
  revalidatePath("/ke-toan");
  revalidatePath("/tai-khoan", "layout");
  revalidatePath("/nhan-vien", "layout");
  redirect("/ke-toan?ky=1");
}

export async function savePaymentAction(formData: FormData) {
  const profile = await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent(error.message));
  } else {
    const type = String(formData.get("type") ?? "income");
    const amount = num(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent("Số tiền phải lớn hơn 0."));
    }
    if (!["income", "expense", "refund"].includes(type)) {
      redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent("Loại phiếu không hợp lệ."));
    }
    const { error } = await supabase.from("payments").insert({
      code: `${type === "expense" ? "PC" : "PT"}-${Date.now().toString().slice(-8)}`,
      booking_id: String(formData.get("booking_id") || "") || null,
      type: type === "income" ? "rental" : type,
      method: String(formData.get("method") ?? "transfer"),
      amount,
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
  const status = String(formData.get("status") ?? "resolved");
  if (id && !["new", "verifying", "waiting", "resolved"].includes(status)) {
    redirect("/ke-toan/phat-nguoi?loi=" + encodeURIComponent("Trạng thái phạt nguội không hợp lệ."));
  }
  const rawOccurred = formData.get("occurred_at");
  const occurredIso = rawOccurred ? parseVnDateTimeLocal(String(rawOccurred)) : null;
  const amount = num(formData.get("amount"));
  if (!id && (!Number.isFinite(amount) || amount < 0)) {
    redirect("/ke-toan/phat-nguoi?loi=" + encodeURIComponent("Số tiền phạt không hợp lệ."));
  }
  if (rawOccurred && !occurredIso) {
    redirect("/ke-toan/phat-nguoi?loi=" + encodeURIComponent("Thời gian vi phạm không hợp lệ."));
  }
  const { error } = id
    ? await supabase
        .from("fines")
        .update({ status })
        .eq("id", id)
    : await supabase.from("fines").insert({
        code: `PN-${Date.now().toString().slice(-6)}`,
        plate: String(formData.get("plate") ?? ""),
        booking_id: String(formData.get("booking_id") || "") || null,
        occurred_at: occurredIso,
        amount,
        note: String(formData.get("note") ?? ""),
        status: "new",
      });
  if (error) redirect("/ke-toan/phat-nguoi?loi=" + encodeURIComponent(error.message));
  revalidatePath("/ke-toan/phat-nguoi");
  redirect("/ke-toan/phat-nguoi?luu=1");
}

export async function settleDepositAction(formData: FormData) {
  await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const refund = num(formData.get("refund"));
  const deduction = num(formData.get("deduction"));
  const back = String(formData.get("back") ?? "/ke-toan/quyet-toan");

  if (!bookingId || refund < 0 || deduction < 0) {
    redirect(back + "?loi=" + encodeURIComponent("Thông tin quyết toán không hợp lệ"));
  }
  const { error } = await supabase.rpc("settle_deposit", {
    p_booking_id: bookingId,
    p_deduction: deduction,
    p_refund: refund,
    p_note: String(formData.get("note") ?? "Quyết toán cọc"),
  });
  if (error) redirect(back + "?loi=" + encodeURIComponent(error.message));

  revalidatePath("/ke-toan/quyet-toan");
  revalidatePath("/ke-toan/thu-chi");
  redirect(back + "?quyettoan=1");
}

export async function cancelPaymentAction(formData: FormData) {
  await guard(["admin", "accountant"], "/ke-toan");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent("Thiếu mã phiếu."));
  const { data, error } = await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent(error.message));
  if (!data) redirect("/ke-toan/thu-chi?loi=" + encodeURIComponent("Chỉ hủy phiếu đang chờ xử lý."));
  revalidatePath("/ke-toan/thu-chi");
  redirect("/ke-toan/thu-chi?huy=1");
}

export async function adminCancelBookingAction(formData: FormData) {
  await guard(["admin", "staff", "accountant"], "/quan-tri/don");
  const supabase = await createClient();
  const bookingId = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!bookingId || reason.length < 3) {
    redirect("/quan-tri/don?loi=" + encodeURIComponent("Cần mã đơn và lý do hủy từ 3 ký tự."));
  }
  const { error } = await supabase.rpc("admin_cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  if (error) redirect("/quan-tri/don?loi=" + encodeURIComponent(error.message));
  revalidatePath("/quan-tri/don");
  revalidatePath("/nhan-vien");
  revalidatePath("/tai-khoan", "layout");
  redirect("/quan-tri/don?huy=1");
}

