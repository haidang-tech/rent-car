"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyTrip } from "@/lib/customer-portal";
import { validateImage, validateDateWindow } from "@/lib/validation";

async function submit(form: FormData, route: string, rpc: string, params: Record<string, unknown>, uploads: string[] = [], bucket = "review-photos") {
  const code = String(form.get("code") || "");
  const { db, trip, profile } = await getMyTrip(code);
  const back = `/tai-khoan/${encodeURIComponent(trip.code)}/${route}`;
  const paths: string[] = [];
  let problem = "";
  try {
    for (const name of uploads) {
      const file = form.get(name);
      if (!(file instanceof File) || !file.size) { if (bucket === "kyc") throw new Error("Cần đủ bốn ảnh giấy tờ."); continue; }
      const invalid = validateImage(file);
      if (invalid) throw new Error(invalid);
      const path = `${profile.id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
      const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("Tải ảnh thất bại. Vui lòng thử lại.");
      paths.push(path);
    }
    const { error } = await db.rpc(rpc, { p_code: trip.code, ...params, ...(uploads.length ? { [bucket === "kyc" ? "p_paths" : "p_photos"]: paths } : {}) });
    if (error) throw new Error(error.message);
  } catch (error) {
    problem = error instanceof Error ? error.message : "Không thể gửi yêu cầu.";
    if (paths.length) await db.storage.from(bucket).remove(paths);
  }
  if (problem) redirect(`${back}?loi=${encodeURIComponent(problem)}`);
  revalidatePath("/tai-khoan", "layout");
  revalidatePath("/nhan-vien", "layout");
  revalidatePath("/ke-toan", "layout");
  redirect(`${back}?ok=1`);
}
export async function submitKycAction(form: FormData) {
  await submit(form, "ekyc", "submit_my_kyc", {}, ["id_front", "id_back", "license", "selfie"], "kyc");
}
export async function signMyContractAction(form: FormData) {
  if (form.get("accept") !== "on") throw new Error("Bạn cần đọc và đồng ý điều khoản.");
  await submit(form, "hop-dong", "sign_my_contract", {});
}
export async function requestDepositAction(form: FormData) {
  await submit(form, "thanh-toan", "request_deposit", { p_method: String(form.get("method") || "") });
}
export async function requestExtensionAction(form: FormData) {
  const { trip } = await getMyTrip(String(form.get("code") || ""));
  const value = String(form.get("desired_return_at") || "");
  // This form labels time explicitly as Vietnam time; do not use the server timezone.
  const end = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? value + ":00+07:00" : "";
  const invalid = validateDateWindow(trip.return_at, end);
  if (invalid) redirect(`/tai-khoan/${encodeURIComponent(trip.code)}/gia-han?loi=${encodeURIComponent(invalid)}`);
  await submit(form, "gia-han", "submit_booking_request", { p_kind: "extension", p_reason: String(form.get("reason") || "Yêu cầu gia hạn"), p_return: new Date(end).toISOString() });
}
export async function requestExchangeAction(form: FormData) {
  await submit(form, "doi-xe", "submit_booking_request", { p_kind: "exchange", p_reason: String(form.get("reason") || ""), p_car: String(form.get("replacement_car_id") || "") });
}
export async function requestCancellationAction(form: FormData) {
  await submit(form, "huy", "submit_booking_request", { p_kind: "cancellation", p_reason: String(form.get("reason") || "") });
}
export async function reportIncidentAction(form: FormData) {
  await submit(form, "su-co", "submit_booking_request", { p_kind: "incident", p_reason: `${String(form.get("type") || "")} · ${String(form.get("location") || "")} · ${String(form.get("reason") || "")}` }, ["photo"]);
}
export async function submitReviewAction(form: FormData) {
  await submit(form, "danh-gia", "submit_my_review", { p_car_rating: Number(form.get("car_rating")), p_service_rating: Number(form.get("service_rating")), p_comment: String(form.get("comment") || "") }, ["photo"]);
}
