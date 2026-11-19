"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type AuthState } from "@/lib/actions/auth";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signInAction,
    null,
  );

  return (
    <>
      <form action={action}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="username" placeholder="ban@example.com" required />
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {state?.error ? <p className="form-message error">{state.error}</p> : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      <p className="auth-switch">
        Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link>
      </p>
      <div className="demo-hint">
        <strong>Tài khoản demo</strong>
        <br />
        Khách: khach@laidi.vn · Nhân viên: nhanvien@laidi.vn
        <br />
        Kế toán: ketoan@laidi.vn · Admin: admin@laidi.vn
        <br />
        Mật khẩu chung: <code>Laidi@2026</code>
      </div>
    </>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    null,
  );

  return (
    <>
      <form action={action}>
        <label className="field">
          <span>Họ và tên</span>
          <input name="full_name" autoComplete="name" required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Số điện thoại</span>
          <input name="phone" inputMode="tel" autoComplete="tel" required />
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <input name="password" type="password" autoComplete="new-password" minLength={6} required />
        </label>
        {state?.error ? <p className="form-message error">{state.error}</p> : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </button>
      </form>
      <p className="auth-switch">
        Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link>
      </p>
    </>
  );
}
