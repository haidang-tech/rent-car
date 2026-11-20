"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const locationsPath = "/quan-tri/diem-nhan";
const employeesPath = "/quan-tri/nhan-vien";
const estimatesPath = "/ke-toan/duyet-du-toan";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?loi=${encodeURIComponent(message)}`);
}

async function requireRole(roles: Role[], path: string) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active" || !roles.includes(profile.role)) {
    redirect(`/dang-nhap?next=${encodeURIComponent(path)}`);
  }
  return profile;
}

export async function saveLocationAction(formData: FormData) {
  await requireRole(["admin"], locationsPath);
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if ((id && !uuid.test(id)) || !/^[A-Z0-9_-]{2,40}$/.test(code)) {
    fail(locationsPath, "Mã điểm cần 2–40 ký tự chữ, số, gạch ngang hoặc gạch dưới.");
  }
  if (name.length < 2 || name.length > 150 || address.length > 500 || note.length > 1000) {
    fail(locationsPath, "Kiểm tra tên điểm, địa chỉ và độ dài ghi chú.");
  }
  if (!["hub", "airport", "hotel", "office"].includes(type)) fail(locationsPath, "Loại điểm không hợp lệ.");
  const payload = { code, name, type, address: address || null, note: note || null, active: formData.get("active") === "on" };
  const supabase = await createClient();
  const query = id
    ? supabase.from("locations").update(payload).eq("id", id)
    : supabase.from("locations").insert(payload);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) fail(locationsPath, error.code === "23505" ? "Mã điểm đã tồn tại." : error.message);
  if (!data) fail(locationsPath, "Không tìm thấy điểm giao nhận hoặc không có quyền cập nhật.");
  revalidatePath(locationsPath);
  revalidatePath("/xe");
  revalidatePath("/");
  redirect(`${locationsPath}?ok=1`);
}

export async function toggleLocationAction(formData: FormData) {
  await requireRole(["admin"], locationsPath);
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "");
  if (!uuid.test(id) || !["true", "false"].includes(active)) fail(locationsPath, "Thông tin điểm giao nhận không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("locations").update({ active: active === "true" }).eq("id", id).select("id").maybeSingle();
  if (error) fail(locationsPath, error.message);
  if (!data) fail(locationsPath, "Điểm giao nhận không còn tồn tại.");
  revalidatePath(locationsPath);
  revalidatePath("/xe");
  revalidatePath("/");
  redirect(`${locationsPath}?ok=1`);
}

export async function updateEmployeeAccessAction(formData: FormData) {
  const actor = await requireRole(["admin"], employeesPath);
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!uuid.test(id) || !["admin", "staff", "accountant", "customer"].includes(role) || !["active", "locked"].includes(status)) {
    fail(employeesPath, "Vai trò hoặc trạng thái tài khoản không hợp lệ.");
  }
  if (id === actor.id && (role !== "admin" || status !== "active")) fail(employeesPath, "Không thể tự khóa hoặc hạ quyền tài khoản đang sử dụng.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", { p_id: id, p_role: role, p_status: status });
  if (error) fail(employeesPath, error.message);
  revalidatePath(employeesPath);
  redirect(`${employeesPath}?luu=1`);
}

export async function approveEstimateAction(formData: FormData) {
  await requireRole(["admin", "accountant"], estimatesPath);
  const id = String(formData.get("id") ?? "");
  if (!uuid.test(id)) fail(estimatesPath, "Mã lệnh bảo dưỡng không hợp lệ.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_maintenance_estimate", { p_id: id });
  if (error) fail(estimatesPath, error.message);
  revalidatePath(estimatesPath);
  revalidatePath("/nhan-vien/bao-duong");
  redirect(`${estimatesPath}?ok=1`);
}
