"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyTrip } from "@/lib/customer-portal";
import { validateImage, validateDateWindow } from "@/lib/validation";
import { parseVnDateTimeLocal } from "@/lib/time";

async function submit(form: FormData, route: string, rpc: string, params: Record<string, unknown>, uploads: string[] = [], bucket = "review-photos", context?: Awaited<ReturnType<typeof getMyTrip>>) {
  const code = String(form.get("code") || "");
  const { db, trip, profile } = context ?? await getMyTrip(code);
  const back = `/tai-khoan/${encodeURIComponent(trip.code)}/${route}`;
  const paths: string[] = [];
  let previousPaths: string[] = [];
  let rpcStarted = false;
  let definitelyFailed = false;
  const cleanup = async (items: string[]) => {
    if (!items.length) return;
    try {
      const { error } = await db.storage.from(bucket).remove(items);
      if (error) console.error("Portal image cleanup failed", { bucket, count: items.length });
    } catch {
      console.error("Portal image cleanup failed", { bucket, count: items.length });
    }
  };
  let problem = "";
  try {
    if (bucket === "kyc") {
      const { data, error } = await db.from("kyc_records").select("id_front_path,id_back_path,license_path,selfie_path").eq("booking_id", trip.id).maybeSingle();
      if (error) throw new Error("Không tải được hồ sơ giấy tờ hiện tại.");
      previousPaths = data ? Object.values(data).filter((path): path is string => typeof path === "string" && path.startsWith(`${profile.id}/`)) : [];
    }
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
    rpcStarted = true;
    const { error } = await db.rpc(rpc, { p_code: trip.code, ...params, ...(uploads.length ? { [bucket === "kyc" ? "p_paths" : "p_photos"]: paths } : {}) });
    if (error) {
      // A SQL error guarantees rollback; a lost network response does not.
      definitelyFailed = /^[A-Z0-9]{5}$/.test(error.code ?? "") && !error.code.startsWith("08") && error.code !== "40003";
      throw new Error(error.message);
    }
  } catch (error) {
    problem = error instanceof Error ? error.message : "Không thể gửi yêu cầu.";
    if (!rpcStarted || definitelyFailed) await cleanup(paths);
  }
  if (problem) redirect(`${back}?loi=${encodeURIComponent(problem)}`);
  // Only delete replaced KYC images after the database accepted the new paths.
  await cleanup(previousPaths.filter(path => !paths.includes(path)));
  revalidatePath("/tai-khoan", "layout");
  revalidatePath("/nhan-vien", "layout");
  revalidatePath("/ke-toan", "layout");
  redirect(`${back}?ok=1`);
}
export async function submitKycAction(form: FormData) {
  await submit(form, "ekyc", "submit_my_kyc", {}, ["id_front", "id_back", "license", "selfie"], "kyc");
}
export async function signMyContractAction(form: FormData) {
  if (form.get("accept") !== "on") redirect(`/tai-khoan/${encodeURIComponent(String(form.get("code") || ""))}/hop-dong?loi=${encodeURIComponent("Bạn cần đọc và đồng ý điều khoản.")}`);
  await submit(form, "hop-dong", "sign_my_contract", {});
}
export async function requestDepositAction(form: FormData) {
  await submit(form, "thanh-toan", "request_deposit", { p_method: String(form.get("method") || "") });
}
export async function requestExtensionAction(form: FormData) {
  const context = await getMyTrip(String(form.get("code") || ""));
  const { trip } = context;
  const value = String(form.get("desired_return_at") || "");
  // This form labels time explicitly as Vietnam time; do not use the server timezone.
  const end = parseVnDateTimeLocal(value) ?? "";
  const invalid = validateDateWindow(trip.return_at, end);
  if (invalid) redirect(`/tai-khoan/${encodeURIComponent(trip.code)}/gia-han?loi=${encodeURIComponent(invalid)}`);
  await submit(form, "gia-han", "submit_booking_request", { p_kind: "extension", p_reason: String(form.get("reason") || "Yêu cầu gia hạn"), p_return: end }, [], "review-photos", context);
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
