import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { settleDepositAction } from "@/lib/actions/ops";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ quyettoan?: string; loi?: string }>;
}) {
  const { quyettoan, loi } = await searchParams;
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, code, customer_name, deposit, total, return_at, status, cars(model, plate)")
    .in("status", ["returned", "completed"])
    .order("return_at", { ascending: false });

  const pending = (bookings ?? []).filter((b) => b.status === "returned");

  return (
    <>
      <PortalTopbar label="Quyết toán cọc" />
      <div className="page-head">
        <div>
          <h1>Quyết toán cọc</h1>
          <p>Hoàn cọc sau khi trừ chi phí phát sinh và bảo lưu phạt nguội.</p>
        </div>
      </div>

      {quyettoan ? <p className="form-message success">Đã phê duyệt quyết toán và hoàn cọc.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Chờ quyết toán · {pending.length}</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Đơn</th>
                  <th>Khách</th>
                  <th>Xe</th>
                  <th>Cọc</th>
                  <th>Trả xe</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((booking) => (
                  <tr key={booking.id}>
                    <td className="strong">{booking.code}</td>
                    <td>{booking.customer_name}</td>
                    <td>{(booking.cars as { model?: string } | null)?.model}</td>
                    <td>{currency(booking.deposit)}</td>
                    <td>{dateTime(booking.return_at)}</td>
                  </tr>
                ))}
                {!pending.length ? (
                  <tr><td colSpan={5} className="empty">Không còn đơn chờ quyết toán.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="panel-head" style={{ borderTop: "1px solid var(--plum-line)", borderBottom: 0 }}>
            <h2>Đã quyết toán</h2>
          </div>
          <div className="detail-list">
            {(bookings ?? []).filter((b) => b.status === "completed").slice(0, 5).map((b) => (
              <div key={b.id}>
                <span>{b.code} · {b.customer_name}</span>
                <span className="badge success">Hoàn tất</span>
              </div>
            ))}
          </div>
        </div>

        <form className="panel" action={settleDepositAction}>
          <div className="panel-head">
            <h2>Lập bảng kê quyết toán</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Mã đơn thuê</span>
              <select name="booking_id" required>
                {pending.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} · {b.customer_name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cấn trừ từ cọc (₫)</span>
              <input name="deduction" type="number" min={0} step={50000} defaultValue={0} />
            </label>
            <label className="field">
              <span>Số tiền hoàn khách (₫)</span>
              <input name="refund" type="number" min={0} step={50000} defaultValue={5000000} />
            </label>
            <label className="field">
              <span>Bảo lưu phạt nguội (₫)</span>
              <input type="number" min={0} step={100000} defaultValue={2000000} readOnly />
            </label>
            <button className="button" type="submit" disabled={!pending.length}>
              Phê duyệt &amp; hoàn cọc
            </button>
            <p className="field-hint">
              Chỉ lập phiếu chi sau khi xác nhận giao dịch hoàn tiền thực tế.
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
