"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
async function decide(form: FormData, kyc: boolean) {
  const profile = await getProfile();
  if (!profile || !['admin','staff'].includes(profile.role)) redirect('/dang-nhap');
  const back = kyc ? '/nhan-vien/ekyc' : '/nhan-vien/yeu-cau';
  const db = await createClient();
  const approved = form.get('decision')==='approve';
  const { error } = await db.rpc(kyc ? 'verify_kyc' : 'decide_booking_request', {
    p_id: String(form.get('id') || ''), [kyc ? 'p_approved' : 'p_approve']: approved, p_note: String(form.get('note') || '')
  });
  if (error) redirect(`${back}?loi=${encodeURIComponent(error.message)}`);
  revalidatePath('/nhan-vien','layout'); revalidatePath('/tai-khoan','layout'); revalidatePath('/quan-tri','layout');
  redirect(`${back}?ok=1`);
}
export async function verifyKycAction(form: FormData) { await decide(form,true); }
export async function decideRequestAction(form: FormData) { await decide(form,false); }
