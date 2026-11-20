"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/dang-nhap?next=/quan-tri");
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

export async function saveEmployeeAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "staff");
  const { error } = await supabase
    .from("profiles")
    .update({ role, branch: String(formData.get("branch") ?? "Đà Nẵng") })
    .eq("id", id);
  if (error) redirect("/quan-tri/nhan-vien?loi=" + encodeURIComponent(error.message));
  revalidatePath("/quan-tri/nhan-vien");
  redirect("/quan-tri/nhan-vien?luu=1");
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
  };
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
  const { error } = await supabase.from("policies").insert({
    name: String(formData.get("name") ?? "Chính sách mới"),
    deposit_type: String(formData.get("deposit_type") ?? "percent"),
    deposit_value: num(formData.get("deposit_value")),
    fine_hold: num(formData.get("fine_hold")),
    cancel_hours: num(formData.get("cancel_hours"), 24),
    refund_pct: num(formData.get("refund_pct"), 100),
    effective_from: String(formData.get("effective_from") ?? new Date().toISOString().slice(0, 10)),
    active: true,
  });
  if (error) redirect("/quan-tri/chinh-sach?loi=" + encodeURIComponent(error.message));
  revalidatePath("/quan-tri/chinh-sach");
  redirect("/quan-tri/chinh-sach?luu=1");
}

export async function saveLocationAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "hub"),
    address: String(formData.get("address") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    active: formData.get("active") !== "off",
  };

  if (!payload.code || !payload.name) {
    redirect("/quan-tri/diem-nhan?loi=" + encodeURIComponent("Nhập mã điểm và tên điểm nhận xe"));
  }

  const { error } = id
    ? await supabase.from("locations").update(payload).eq("id", id)
    : await supabase.from("locations").insert(payload);

  if (error) redirect("/quan-tri/diem-nhan?loi=" + encodeURIComponent(error.message));

  revalidatePath("/quan-tri/diem-nhan");
  revalidatePath("/xe");
  redirect("/quan-tri/diem-nhan?luu=1");
}

export async function toggleLocationAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";

  const { error } = await supabase.from("locations").update({ active }).eq("id", id);
  if (error) redirect("/quan-tri/diem-nhan?loi=" + encodeURIComponent(error.message));

  revalidatePath("/quan-tri/diem-nhan");
  revalidatePath("/xe");
  redirect("/quan-tri/diem-nhan?luu=1");
}

export async function toggleProfileStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "active");

  if (id === admin.id) {
    redirect("/quan-tri/nhan-vien?loi=" + encodeURIComponent("Không thể khóa tài khoản đang đăng nhập"));
  }

  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) redirect("/quan-tri/nhan-vien?loi=" + encodeURIComponent(error.message));

  revalidatePath("/quan-tri/nhan-vien");
  redirect("/quan-tri/nhan-vien?luu=1");
}
