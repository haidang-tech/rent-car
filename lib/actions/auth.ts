"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_HOME, type Role } from "@/lib/auth";
import { safeAuthNext } from "@/lib/auth-redirect";
import { validPhone } from "@/lib/booking-validation";

export type AuthState = { error?: string; success?: string } | null;

const normalize = (message: string) => {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email hoặc mật khẩu không đúng.",
    "Email not confirmed": "Email chưa được xác thực.",
    "User already registered": "Email này đã có tài khoản.",
  };
  return map[message] ?? message;
};

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: normalize(error.message) };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active" || !Object.hasOwn(ROLE_HOME, profile.role)) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: profile?.status === "locked" ? "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ." : "Không tìm thấy hồ sơ hoạt động. Vui lòng liên hệ hỗ trợ." };
  }
  const role = profile.role as Role;
  redirect(safeAuthNext(next, ROLE_HOME[role]));
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) return { error: "Vui lòng nhập họ tên." };
  if (!validPhone(phone)) return { error: "Số điện thoại cần có 10 chữ số bắt đầu bằng 0 hoặc dùng mã +84." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email không hợp lệ." };
  if (password.length < 6) return { error: "Mật khẩu cần ít nhất 6 ký tự." };

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });
  if (createError) {
    return {
      error: createError.message.includes("already")
        ? "Email này đã có tài khoản."
        : createError.message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Tạo tài khoản thành công, hãy đăng nhập lại." };

  redirect("/tai-khoan");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
