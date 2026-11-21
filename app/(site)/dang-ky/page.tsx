import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth-forms";
import { getSession, getProfile, ROLE_HOME } from "@/lib/auth";

export const metadata = { title: "Đăng ký" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    const profile = await getProfile();
    redirect(profile ? ROLE_HOME[profile.role] : "/auth/reset-session");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Tạo tài khoản</h1>
        <p>Đặt xe nhanh hơn và theo dõi toàn bộ chuyến đi của bạn.</p>
        <SignUpForm />
      </div>
    </div>
  );
}
