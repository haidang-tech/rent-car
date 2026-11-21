import { CarImage } from "@/components/car-image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, ROLE_HOME } from "@/lib/auth";
import { ACCOUNT_ROUTES, type Trip } from "@/lib/customer-portal";
import { BOOKING_STATUS, currency, dateTime } from "@/lib/format";
import { selectCurrentTrip, tripRouteApplies } from "@/lib/customer-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đơn của tôi" };

const ACTIVE_STATUSES = ["pending", "confirmed", "signed", "handed_over"];

const QUICK_ACTIONS = ACCOUNT_ROUTES.filter(([path]) => path !== "");

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=/tai-khoan");
  const { loc } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, cars(id, code, brand, model, seats, fuel, transmission, image_url, price_per_day, status)",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Không tải được danh sách chuyến thuê. Vui lòng thử lại.");
  const bookings = (data ?? []) as unknown as Trip[];
  const active = bookings.filter((trip) => ACTIVE_STATUSES.includes(trip.status));
  const current = selectCurrentTrip(active);
  const shown =
    loc === "active"
      ? active
      : loc === "done"
        ? bookings.filter((trip) => !ACTIVE_STATUSES.includes(trip.status))
        : bookings;

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
          <p>Quản lý chuyến thuê, hoàn tất giấy tờ, ký hợp đồng và theo dõi tiền cọc.</p>
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
                {QUICK_ACTIONS.filter(([segment]) => tripRouteApplies(segment, current.status)).map(([segment, label]) => (
                  <Link key={segment} href={`/tai-khoan/${current.code}/${segment}`}>
                    {label}
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
              shown.map((trip) => (
                <article className="booking-row" key={trip.id}>
                  <CarImage
                    className="thumb"
                    src={trip.cars?.image_url || "/images/vf5.png"}
                    alt=""
                    width={76}
                    height={54}
                  />
                  <div>
                    <h3>
                      {trip.cars?.brand} {trip.cars?.model} · {trip.code}
                    </h3>
                    <p className="meta">
                      {dateTime(trip.pickup_at)} → {dateTime(trip.return_at)} ·{" "}
                      {trip.pickup_location}
                    </p>
                  </div>
                  <div className="booking-side">
                    <span className={`badge ${BOOKING_STATUS[trip.status]?.tone ?? "muted"}`}>
                      {BOOKING_STATUS[trip.status]?.label ?? trip.status}
                    </span>
                    <strong>{currency(trip.total)}</strong>
                    <Link className="link-button small" href={`/tai-khoan/${trip.code}`}>
                      Xem chuyến →
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="card">
                <h2>{loc === "done" ? "Chưa có chuyến đã kết thúc" : "Chưa có đơn đang hoạt động"}</h2>
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
