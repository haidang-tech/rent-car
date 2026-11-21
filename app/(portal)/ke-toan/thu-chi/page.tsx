import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { cancelPaymentAction, savePaymentAction } from "@/lib/actions/ops";
import { currency, dateTime, TX_STATUS } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  deposit: "Thu cọc",
  rental: "Thu tiền thuê",
  refund: "Hoàn cọc",
  expense: "Chi phí",
  penalty: "Phụ phí / phạt",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const [{ data: payments }, { data: bookings }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, code, type, method, amount, status, paid_at, note, bookings(code)")
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, code")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const paid = (payments ?? []).filter((p) => p.status === "paid");
  const income = paid
    .filter((p) => ["deposit", "rental", "penalty"].includes(p.type))
    .reduce((s, p) => s + Number(p.amount), 0);
  const expense = paid
    .filter((p) => ["refund", "expense"].includes(p.type))
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PortalTopbar label="Phiếu thu / chi" />
      <div className="page-head">
        <div>
          <h1>Phiếu thu / chi</h1>
          <p>Chứng từ phát sinh từ đặt cọc, tiền thuê và hoàn cọc.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã ghi nhận chứng từ.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <span>Tổng thu</span>
          <strong>{currency(income)}</strong>
          <small>{paid.filter((p) => ["deposit", "rental", "penalty"].includes(p.type)).length} phiếu</small>
        </div>
        <div className="stat-card">
          <span>Tổng chi</span>
          <strong>{currency(expense)}</strong>
          <small>{paid.filter((p) => ["refund", "expense"].includes(p.type)).length} phiếu</small>
        </div>
        <div className="stat-card">
          <span>Chênh lệch</span>
          <strong>{currency(income - expense)}</strong>
          <small>Đã thanh toán</small>
        </div>
        <div className="stat-card">
          <span>Chờ xử lý</span>
          <strong>{(payments ?? []).filter((p) => p.status === "pending").length}</strong>
          <small>Phiếu chưa thanh toán</small>
        </div>
      </div>

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Sổ chứng từ</h2>
            <span className="chip">{payments?.length ?? 0} phiếu</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Số phiếu</th>
                  <th>Loại</th>
                  <th>Đơn thuê</th>
                  <th>Số tiền</th>
                  <th>Hình thức</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="strong">
                      {payment.code}
                      <span className="sub">{dateTime(payment.paid_at)}</span>
                    </td>
                    <td>
                      {TYPE_LABEL[payment.type] ?? payment.type}
                      <span className="sub">{payment.note}</span>
                    </td>
                    <td>{(payment.bookings as { code?: string } | null)?.code ?? "—"}</td>
                    <td style={{ color: ["refund", "expense"].includes(payment.type) ? "var(--red)" : "inherit" }}>
                      {currency(payment.amount)}
                    </td>
                    <td>{payment.method === "cash" ? "Tiền mặt" : payment.method === "card" ? "Thẻ" : "Chuyển khoản"}</td>
                    <td>
                      <span className={`badge ${TX_STATUS[payment.status]?.tone ?? "muted"}`}>
                        {TX_STATUS[payment.status]?.label ?? payment.status}
                      </span>
                    </td>
                    <td>
                      {payment.status === "pending" ? (
                        <div className="row-actions">
                          <form action={savePaymentAction}>
                            <input type="hidden" name="id" value={payment.id} />
                            <button className="chip" type="submit">Xác nhận</button>
                          </form>
                          <form action={cancelPaymentAction}>
                            <input type="hidden" name="id" value={payment.id} />
                            <button className="chip" type="submit">Hủy</button>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!payments?.length ? (
                  <tr><td colSpan={7} className="empty">Chưa có chứng từ.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel" action={savePaymentAction}>
          <div className="panel-head">
            <h2>Lập phiếu mới</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Loại phiếu</span>
              <select name="type" defaultValue="income">
                <option value="income">Thu tiền thuê</option>
                <option value="expense">Chi phí vận hành</option>
                <option value="refund">Hoàn cọc</option>
              </select>
            </label>
            <label className="field">
              <span>Đơn thuê liên quan</span>
              <select name="booking_id" defaultValue="">
                <option value="">Không gắn đơn</option>
                {(bookings ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Số tiền (₫)</span>
              <input name="amount" type="number" min={0} step={10000} required />
            </label>
            <label className="field">
              <span>Hình thức</span>
              <select name="method" defaultValue="transfer">
                <option value="transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
              </select>
            </label>
            <label className="field">
              <span>Ghi chú</span>
              <textarea name="note" />
            </label>
            <button className="button" type="submit">Lưu phiếu</button>
          </div>
        </form>
      </div>
    </>
  );
}
