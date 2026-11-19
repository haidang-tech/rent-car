import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { BOOKING_STATUS, CAR_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: cars }, { data: bookings }, { data: payments }] = await Promise.all([
    supabase.from("cars").select("id, code, model, plate, status, price_per_day, image_url"),
    supabase
      .from("bookings")
      .select("id, code, status, total, pickup_at, return_at, customer_name, cars(model, plate)")
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("amount, type, status, paid_at")
      .eq("status", "paid")
      .gte("paid_at", monthStart.toISOString()),
  ]);

  const allBookings = bookings ?? [];
  const active = allBookings.filter((b) =>
    ["confirmed", "signed", "handed_over"].includes(b.status),
  );
  const pending = allBookings.filter((b) => b.status === "pending");
  const revenue = (payments ?? [])
    .filter((p) => p.type !== "refund" && p.type !== "expense")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const availableCars = (cars ?? []).filter((c) => c.status === "available");

  return (
    <>
      <PortalTopbar label="Tổng quan" />
      <div className="page-head">
        <div>
          <h1>Tổng quan vận hành</h1>
          <p>Cập nhật theo dữ liệu thật từ Supabase, múi giờ Đà Nẵng.</p>
        </div>
        <div className="actions">
          <Link className="button ghost" href="/quan-tri/xe/moi">
            + Thêm xe
          </Link>
          <Link className="button" href="/quan-tri/don">
            Quản lý đơn thuê
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span>Doanh thu tháng này</span>
          <strong>{currency(revenue)}</strong>
          <small>{payments?.length ?? 0} giao dịch đã thanh toán</small>
        </div>
        <div className="stat-card">
          <span>Đơn đang hoạt động</span>
          <strong>{active.length}</strong>
          <small>{pending.length} đơn chờ xác thực</small>
        </div>
        <div className="stat-card">
          <span>Xe sẵn sàng</span>
          <strong>
            {availableCars.length}/{cars?.length ?? 0}
          </strong>
          <small>{(cars ?? []).filter((c) => c.status === "maintenance").length} xe đang bảo dưỡng</small>
        </div>
        <div className="stat-card">
          <span>Tổng đơn</span>
          <strong>{allBookings.length}</strong>
          <small>{allBookings.filter((b) => b.status === "completed").length} đơn hoàn tất</small>
        </div>
      </div>

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Đơn thuê gần đây</h2>
            <Link className="chip" href="/quan-tri/don">
              Xem tất cả →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách</th>
                  <th>Xe</th>
                  <th>Nhận xe</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.slice(0, 7).map((b) => (
                  <tr key={b.id}>
                    <td className="strong">{b.code}</td>
                    <td>{b.customer_name}</td>
                    <td>{(b.cars as { model?: string } | null)?.model ?? "—"}</td>
                    <td>{dateTime(b.pickup_at)}</td>
                    <td>{currency(b.total)}</td>
                    <td>
                      <span className={`badge ${BOOKING_STATUS[b.status]?.tone ?? "muted"}`}>
                        {BOOKING_STATUS[b.status]?.label ?? b.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!allBookings.length ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Chưa có đơn thuê. Chạy seed để nạp dữ liệu mẫu.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Tình trạng đội xe</h2>
            <Link className="chip" href="/quan-tri/xe">
              Quản lý xe →
            </Link>
          </div>
          <div className="detail-list">
            {(cars ?? []).map((car) => (
              <div key={car.id}>
                <span>
                  {car.model} · {car.plate}
                </span>
                <span className={`badge ${CAR_STATUS[car.status]?.tone ?? "muted"}`}>
                  {CAR_STATUS[car.status]?.label ?? car.status}
                </span>
              </div>
            ))}
            {!cars?.length ? <div className="empty">Chưa có xe trong hệ thống.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
