import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/tai-khoan");
  const { next } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Đăng nhập</h1>
        <p>Đăng nhập để quản lý đơn thuê và lịch trình của bạn.</p>
        <SignInForm next={next} />
      </div>
    </div>
  );
}
