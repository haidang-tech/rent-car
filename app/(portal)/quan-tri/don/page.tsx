import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { updateBookingStatusAction } from "@/lib/actions/bookings";
import { BOOKING_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  pickup_at: string;
  return_at: string;
  days: number;
  total: number;
  cars: { model: string; plate: string } | null;
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; capnhat?: string; loi?: string }>;
}) {
  const { status, capnhat, loi } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, code, customer_name, customer_phone, status, pickup_at, return_at, days, total, cars(model, plate)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const bookings = (data ?? []) as unknown as Row[];

  const filters = [
    ["", "Tất cả"],
    ["pending", "Chờ xác thực"],
    ["confirmed", "Đã xác nhận"],
    ["signed", "Đã ký"],
    ["handed_over", "Đang thuê"],
    ["returned", "Đã trả"],
    ["completed", "Hoàn tất"],
    ["cancelled", "Đã hủy"],
  ];

  return (
    <>
      <PortalTopbar label="Đơn thuê" />
      <div className="page-head">
        <div>
          <h1>Đơn thuê</h1>
          <p>Xác nhận, ký hợp đồng và theo dõi toàn bộ vòng đời đơn thuê.</p>
        </div>
      </div>

      {capnhat ? <p className="form-message success">Đã cập nhật trạng thái đơn.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2>{bookings.length} đơn</h2>
          <div className="filters">
            {filters.map(([value, label]) => (
              <Link
                key={label}
                className={`chip ${(status ?? "") === value ? "active" : ""}`}
                href={value ? `/quan-tri/don?status=${value}` : "/quan-tri/don"}
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
                <th>Lịch nhận → trả</th>
                <th>Tổng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="strong">
                    {b.code}
                    <span className="sub">{b.days} ngày</span>
                  </td>
                  <td>
                    {b.customer_name}
                    <span className="sub">{b.customer_phone}</span>
                  </td>
                  <td>
                    {b.cars?.model ?? "—"}
                    <span className="sub">{b.cars?.plate}</span>
                  </td>
                  <td>
                    {dateTime(b.pickup_at)}
                    <span className="sub">→ {dateTime(b.return_at)}</span>
                  </td>
                  <td>{currency(b.total)}</td>
                  <td>
                    <span className={`badge ${BOOKING_STATUS[b.status]?.tone ?? "muted"}`}>
                      {BOOKING_STATUS[b.status]?.label ?? b.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {b.status === "pending" ? (
                        <form action={updateBookingStatusAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="code" value={b.code} />
                          <input type="hidden" name="status" value="confirmed" />
                          <button className="chip" type="submit">Xác nhận</button>
                        </form>
                      ) : null}
                      {b.status === "confirmed" ? (
                        <form action={updateBookingStatusAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="code" value={b.code} />
                          <input type="hidden" name="status" value="signed" />
                          <button className="chip" type="submit">Ký hợp đồng</button>
                        </form>
                      ) : null}
                      {b.status === "signed" ? (
                        <Link className="chip" href={`/nhan-vien/giao-xe?booking=${b.id}`}>
                          Bàn giao
                        </Link>
                      ) : null}
                      {b.status === "handed_over" ? (
                        <Link className="chip" href={`/nhan-vien/tra-xe?booking=${b.id}`}>
                          Nhận trả
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!bookings.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Không có đơn ở trạng thái này.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
