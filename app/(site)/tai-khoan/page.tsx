import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, ROLE_HOME } from "@/lib/auth";
import { cancelBookingAction } from "@/lib/actions/bookings";
import { BOOKING_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đơn của tôi" };

type BookingRow = {
  id: string;
  code: string;
  status: string;
  pickup_at: string;
  return_at: string;
  pickup_location: string;
  days: number;
  total: number;
  created_at: string;
  cars: { brand: string; model: string; image_url: string | null; plate: string } | null;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ huy?: string; loi?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=/tai-khoan");
  const { huy, loi } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, code, status, pickup_at, return_at, pickup_location, days, total, created_at, cars(brand, model, image_url, plate)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as unknown as BookingRow[];
  const active = bookings.filter((b) =>
    ["pending", "confirmed", "signed", "handed_over"].includes(b.status),
  );

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
          <p>Quản lý đơn thuê, theo dõi lịch nhận xe và lịch sử chuyến đi.</p>
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
          {loi ? <p className="form-message error">{loi}</p> : null}

          <div className="section-head" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 22 }}>Đơn đang hoạt động</h2>
              <p>{active.length} đơn cần theo dõi</p>
            </div>
          </div>

          <div className="booking-list" style={{ marginBottom: 34 }}>
            {active.length ? (
              active.map((booking) => (
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
                    {["pending", "confirmed", "signed"].includes(booking.status) ? (
                      <form action={cancelBookingAction}>
                        <input type="hidden" name="code" value={booking.code} />
                        <button className="link-button small" type="submit">
                          Hủy đơn
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="card">
                <h2>Chưa có đơn đang hoạt động</h2>
                <p>Chọn một chiếc xe và đặt chuyến đi tiếp theo của bạn.</p>
                <Link className="button" href="/xe" style={{ marginTop: 14 }}>
                  Xem đội xe →
                </Link>
              </div>
            )}
          </div>

          <h2 style={{ fontSize: 22, marginBottom: 14 }}>Lịch sử chuyến đi</h2>
          <div className="panel">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Xe</th>
                    <th>Thời gian thuê</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.filter((b) => !active.includes(b)).length ? (
                    bookings
                      .filter((b) => !active.includes(b))
                      .map((booking) => (
                        <tr key={booking.id}>
                          <td className="strong">{booking.code}</td>
                          <td>
                            {booking.cars?.brand} {booking.cars?.model}
                            <span className="sub">{booking.cars?.plate}</span>
                          </td>
                          <td>
                            {dateTime(booking.pickup_at)}
                            <span className="sub">→ {dateTime(booking.return_at)}</span>
                          </td>
                          <td>{currency(booking.total)}</td>
                          <td>
                            <span className={`badge ${BOOKING_STATUS[booking.status]?.tone ?? "muted"}`}>
                              {BOOKING_STATUS[booking.status]?.label ?? booking.status}
                            </span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty">
                        Chưa có chuyến đi nào đã hoàn tất.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
