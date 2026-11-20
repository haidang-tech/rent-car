import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, ROLE_HOME } from "@/lib/auth";
import { BOOKING_SELECT, type OwnedBooking } from "@/lib/booking-queries";
import { BOOKING_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đơn của tôi" };

const QUICK_ACTIONS = [
  { segment: "ekyc", label: "eKYC", icon: "▣" },
  { segment: "hop-dong", label: "Hợp đồng", icon: "▤" },
  { segment: "thanh-toan", label: "Đặt cọc", icon: "▱" },
  { segment: "gia-han", label: "Gia hạn", icon: "◷" },
  { segment: "doi-xe", label: "Đổi xe", icon: "⇄" },
  { segment: "huy", label: "Hủy chuyến", icon: "⊗" },
  { segment: "su-co", label: "Sự cố", icon: "△" },
  { segment: "danh-gia", label: "Đánh giá", icon: "☆" },
];

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ huy?: string; loc?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=/tai-khoan");
  const { huy, loc } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as unknown as OwnedBooking[];
  const active = bookings.filter((b) =>
    ["pending", "confirmed", "signed", "handed_over"].includes(b.status),
  );
  const current = active[0] ?? null;
  const shown = loc === "active" ? active : loc === "done" ? bookings.filter((b) => !active.includes(b)) : bookings;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span>Tài khoản</span>
          </div>
          <h1>Xin chào, {profile.full_name}</h1>
          <p>Quản lý đơn thuê, hoàn tất eKYC, ký hợp đồng và theo dõi chuyến đi.</p>
        </div>
      </section>

      <div className="container account-grid">
        <aside className="profile-card">
          <div className="avatar">{profile.full_name.charAt(0).toUpperCase()}</div>
          <h2>{profile.full_name}</h2>
          <p>{profile.phone || "Chưa cập nhật số điện thoại"}</p>
          <p style={{ marginTop: 6 }}>{profile.branch}</p>
          <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
            <Link className="button ghost small" href="/xe">
              Đặt xe mới
            </Link>
            {profile.role !== "customer" ? (
              <Link className="button small" href={ROLE_HOME[profile.role]}>
                Bảng điều khiển
              </Link>
            ) : null}
          </div>
        </aside>

        <div>
          {huy ? <p className="form-message success">Đã hủy đơn thuê.</p> : null}

          {current ? (
            <section className="quick-actions" aria-labelledby="quick-title">
              <div className="quick-head">
                <div>
                  <h2 id="quick-title" style={{ fontSize: 18 }}>
                    Chuyến {current.code}
                  </h2>
                  <p className="muted small">
                    {dateTime(current.pickup_at)} → {dateTime(current.return_at)}
                  </p>
                </div>
                <Link className="button ghost small" href={`/tai-khoan/${current.code}`}>
                  Chi tiết chuyến
                </Link>
              </div>
              <div className="quick-grid">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.segment} href={`/tai-khoan/${current.code}/${action.segment}`}>
                    <span aria-hidden="true">{action.icon}</span>
                    {action.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="section-head" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 22 }}>Đơn đang hoạt động</h2>
              <p>{active.length} đơn cần theo dõi</p>
            </div>
            <div className="filters">
              {[
                ["", "Tất cả"],
                ["active", "Đang xử lý"],
                ["done", "Đã kết thúc"],
              ].map(([value, label]) => (
                <Link
                  key={label}
                  className={`chip ${(loc ?? "") === value ? "active" : ""}`}
                  href={value ? `/tai-khoan?loc=${value}` : "/tai-khoan"}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="booking-list" style={{ marginBottom: 34 }}>
            {shown.length ? (
              shown.map((booking) => (
                <article className="booking-row" key={booking.id}>
                  <Image
                    className="thumb"
                    src={booking.cars?.image_url || "/images/vf5.png"}
                    alt=""
                    width={76}
                    height={54}
                  />
                  <div>
                    <h3>
                      {booking.cars?.brand} {booking.cars?.model} · {booking.code}
                    </h3>
                    <p className="meta">
                      {dateTime(booking.pickup_at)} → {dateTime(booking.return_at)} ·{" "}
                      {booking.pickup_location}
                    </p>
                  </div>
                  <div className="booking-side">
                    <span className={`badge ${BOOKING_STATUS[booking.status]?.tone ?? "muted"}`}>
                      {BOOKING_STATUS[booking.status]?.label ?? booking.status}
                    </span>
                    <strong>{currency(booking.total)}</strong>
                    <Link className="link-button small" href={`/tai-khoan/${booking.code}`}>
                      Xem chuyến →
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="card">
                <h2>
                  {loc === "done" ? "Chưa có chuyến đã kết thúc" : "Chưa có đơn đang hoạt động"}
                </h2>
                <p>Chọn một chiếc xe và đặt chuyến đi tiếp theo của bạn.</p>
                <Link className="button" href="/xe" style={{ marginTop: 14 }}>
                  Xem đội xe →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
