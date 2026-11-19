import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { BOOKING_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; giao?: string; tra?: string; loi?: string }>;
}) {
  const { status, giao, tra, loi } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, code, customer_name, customer_phone, status, pickup_at, return_at, total, pickup_location, cars(model, plate, image_url)")
    .in("status", ["confirmed", "signed", "handed_over", "returned"])
    .order("pickup_at");
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const bookings = (data ?? []) as unknown as Array<{
    id: string;
    code: string;
    customer_name: string;
    customer_phone: string;
    status: string;
    pickup_at: string;
    return_at: string;
    total: number;
    pickup_location: string;
    cars: { model: string; plate: string } | null;
  }>;

  const filters = [
    ["", "Tất cả"],
    ["confirmed", "Chờ ký / cọc"],
    ["signed", "Sẵn sàng giao"],
    ["handed_over", "Đang thuê"],
    ["returned", "Chờ quyết toán"],
  ];

  return (
    <>
      <PortalTopbar label="Đơn thuê" />
      <div className="page-head">
        <div>
          <h1>Đơn thuê</h1>
          <p>Đơn cần giao xe, đang thuê và chờ quyết toán cọc.</p>
        </div>
        <div className="actions">
          <Link className="button ghost" href="/nhan-vien/giao-xe">Bàn giao xe</Link>
          <Link className="button" href="/nhan-vien/tra-xe">Tiếp nhận trả xe</Link>
        </div>
      </div>

      {giao ? <p className="form-message success">Đã ghi nhận bàn giao, xe chuyển sang “Đang thuê”.</p> : null}
      {tra ? <p className="form-message success">Đã ghi nhận trả xe và chi phí phát sinh.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2>{bookings.length} đơn</h2>
          <div className="filters">
            {filters.map(([value, label]) => (
              <Link
                key={label}
                className={`chip ${(status ?? "") === value ? "active" : ""}`}
                href={value ? `/nhan-vien?status=${value}` : "/nhan-vien"}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách thuê</th>
                <th>Xe</th>
                <th>Nhận → trả</th>
                <th>Điểm giao</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="strong">
                    {b.code}
                    <span className="sub">{currency(b.total)}</span>
                  </td>
                  <td>
                    {b.customer_name}
                    <span className="sub">{b.customer_phone}</span>
                  </td>
                  <td>
                    {b.cars?.model}
                    <span className="sub">{b.cars?.plate}</span>
                  </td>
                  <td>
                    {dateTime(b.pickup_at)}
                    <span className="sub">→ {dateTime(b.return_at)}</span>
                  </td>
                  <td>{b.pickup_location}</td>
                  <td>
                    <span className={`badge ${BOOKING_STATUS[b.status]?.tone ?? "muted"}`}>
                      {BOOKING_STATUS[b.status]?.label ?? b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === "signed" ? (
                      <Link className="chip" href={`/nhan-vien/giao-xe?booking=${b.id}`}>Mở bàn giao</Link>
                    ) : null}
                    {b.status === "handed_over" ? (
                      <Link className="chip" href={`/nhan-vien/tra-xe?booking=${b.id}`}>Nhận trả</Link>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!bookings.length ? (
                <tr>
                  <td colSpan={7} className="empty">Không có đơn ở trạng thái này.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
