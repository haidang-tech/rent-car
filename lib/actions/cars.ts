"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { vnDateKey } from "@/lib/time";

async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.status !== "active" || profile.role !== "admin") redirect("/dang-nhap?next=/quan-tri");
  return profile;
}

const num = (v: FormDataEntryValue | null, fallback = 0) =>
  v === null || v === "" ? fallback : Number(v);

export async function saveCarAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    code: String(formData.get("code") ?? "").trim(),
    plate: String(formData.get("plate") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    category: String(formData.get("category") ?? "SUV"),
    seats: num(formData.get("seats"), 5),
    transmission: String(formData.get("transmission") ?? "auto"),
    fuel: String(formData.get("fuel") ?? "electric"),
    year: num(formData.get("year"), new Date().getFullYear()),
    price_per_day: num(formData.get("price_per_day")),
    deposit: num(formData.get("deposit")),
    status: String(formData.get("status") ?? "available"),
    image_url: String(formData.get("image_url") ?? "/images/vf5.png"),
    description: String(formData.get("description") ?? ""),
    features: String(formData.get("features") ?? "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
  };

  if (!payload.code || !payload.plate || !payload.model) {
    redirect("/quan-tri/xe?loi=" + encodeURIComponent("Nhập mã xe, biển số và mẫu xe"));
  }
  if (!/^\/images\/.+/.test(payload.image_url)) {
    redirect("/quan-tri/xe?loi=" + encodeURIComponent("Ảnh xe phải là đường dẫn /images/..."));
  }
  if (!Number.isFinite(payload.seats) || payload.seats < 2 || payload.seats > 30 ||
      !Number.isFinite(payload.year) || payload.year < 1980 || payload.year > new Date().getFullYear() + 2 ||
      !Number.isFinite(payload.price_per_day) || payload.price_per_day < 0 ||
      !Number.isFinite(payload.deposit) || payload.deposit < 0) {
    redirect("/quan-tri/xe?loi=" + encodeURIComponent("Thông tin xe hoặc giá trị số không hợp lệ"));
  }
  if (!["available", "rented", "maintenance", "unavailable"].includes(payload.status)) {
    redirect("/quan-tri/xe?loi=" + encodeURIComponent("Trạng thái xe không hợp lệ"));
  }

  const { error } = id
    ? await supabase.from("cars").update(payload).eq("id", id)
    : await supabase.from("cars").insert(payload);

  if (error) redirect("/quan-tri/xe?loi=" + encodeURIComponent(error.message));

  revalidatePath("/quan-tri/xe");
  revalidatePath("/xe");
  redirect("/quan-tri/xe?luu=1");
}

export async function deleteCarAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("cars").delete().eq("id", id);
  if (error) {
    redirect("/quan-tri/xe?loi=" + encodeURIComponent("Không thể xóa xe đang có đơn thuê"));
  }
  revalidatePath("/quan-tri/xe");
  redirect("/quan-tri/xe?xoa=1");
}

export async function savePricingAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    scope: String(formData.get("scope") ?? "Toàn đội xe"),
    kind: String(formData.get("kind") ?? "base"),
    amount: num(formData.get("amount")),
    unit: String(formData.get("unit") ?? "ngày"),
    active: formData.get("active") === "on",
    start_date: String(formData.get("start_date") ?? "") || null,
    end_date: String(formData.get("end_date") ?? "") || null,
  };
  if (!payload.name.trim() || !Number.isFinite(payload.amount) || payload.amount < 0) {
    redirect("/quan-tri/bang-gia?loi=" + encodeURIComponent("Tên hoặc số tiền quy tắc giá không hợp lệ"));
  }
  if (!["base", "holiday", "surcharge"].includes(payload.kind) ||
      !["ngày", "lượt", "giờ"].includes(payload.unit)) {
    redirect("/quan-tri/bang-gia?loi=" + encodeURIComponent("Loại quy tắc giá không hợp lệ"));
  }
  if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
    redirect("/quan-tri/bang-gia?loi=" + encodeURIComponent("Ngày kết thúc phải sau ngày bắt đầu"));
  }
  const { error } = id
    ? await supabase.from("pricing_rules").update(payload).eq("id", id)
    : await supabase.from("pricing_rules").insert(payload);
  if (error) redirect("/quan-tri/bang-gia?loi=" + encodeURIComponent(error.message));
  revalidatePath("/quan-tri/bang-gia");
  redirect("/quan-tri/bang-gia?luu=1");
}

export async function savePolicyAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const effectiveFrom = String(formData.get("effective_from") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    redirect("/quan-tri/chinh-sach?loi=" + encodeURIComponent("Ngày hiệu lực không hợp lệ"));
  }
  if (vnDateKey(`${effectiveFrom}T00:00:00+07:00`) !== effectiveFrom) {
    redirect("/quan-tri/chinh-sach?loi=" + encodeURIComponent("Ngày hiệu lực không hợp lệ"));
  }
  const depositType = String(formData.get("deposit_type") ?? "percent");
  const depositValue = num(formData.get("deposit_value"));
  const fineHold = num(formData.get("fine_hold"));
  const cancelHours = num(formData.get("cancel_hours"), 24);
  const refundPct = num(formData.get("refund_pct"), 100);
  if (!["fixed", "percent"].includes(depositType) ||
      ![depositValue, fineHold, cancelHours, refundPct].every(Number.isFinite) ||
      depositValue < 0 || (depositType === "percent" && depositValue > 100) ||
      fineHold < 0 || cancelHours < 0 || refundPct < 0 || refundPct > 100) {
    redirect("/quan-tri/chinh-sach?loi=" + encodeURIComponent("Giá trị chính sách không hợp lệ"));
  }
  const { error: deactivateError } = await supabase
    .from("policies")
    .update({ active: false })
    .eq("active", true);
  if (deactivateError) redirect("/quan-tri/chinh-sach?loi=" + encodeURIComponent(deactivateError.message));
  const { error } = await supabase.from("policies").insert({
    name: String(formData.get("name") ?? "Chính sách mới"),
    deposit_type: depositType,
    deposit_value: depositValue,
    fine_hold: fineHold,
    cancel_hours: cancelHours,
    refund_pct: refundPct,
    effective_from: effectiveFrom,
    active: true,
  });
  if (error) redirect("/quan-tri/chinh-sach?loi=" + encodeURIComponent(error.message));
  revalidatePath("/quan-tri/chinh-sach");
  redirect("/quan-tri/chinh-sach?luu=1");
}

export async function deletePricingAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/quan-tri/bang-gia?loi=" + encodeURIComponent("Thiếu quy tắc giá."));
  const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
  if (error) redirect("/quan-tri/bang-gia?loi=" + encodeURIComponent(error.message));
  revalidatePath("/quan-tri/bang-gia");
  redirect("/quan-tri/bang-gia?xoa=1");
}

