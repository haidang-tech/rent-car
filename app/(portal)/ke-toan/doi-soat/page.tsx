import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { currency, dateOnly } from "@/lib/format";
import { vnMonthStartIso } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const supabase = await createClient();
  const today = new Date();
  const monthStartIso = vnMonthStartIso(today);
  const monthStart = new Date(monthStartIso);

  const { data: payments } = await supabase
    .from("payments")
    .select("type, method, amount, status, paid_at")
    .eq("status", "paid")
    .gte("paid_at", monthStartIso);

  const rows = payments ?? [];
  const cash = rows
    .filter((p) => p.method === "cash")
    .reduce((s, p) => s + (["refund", "expense"].includes(p.type) ? -Number(p.amount) : Number(p.amount)), 0);
  const bank = rows
    .filter((p) => p.method !== "cash")
    .reduce((s, p) => s + (["refund", "expense"].includes(p.type) ? -Number(p.amount) : Number(p.amount)), 0);

  return (
    <>
      <PortalTopbar label="Đối soát quỹ" />
      <div className="page-head">
        <div>
          <h1>Đối soát quỹ</h1>
          <p>Kỳ {dateOnly(monthStart)} → {dateOnly(today)} · {rows.length} giao dịch đã thanh toán.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span>Tiền mặt theo sổ</span>
          <strong>{currency(cash)}</strong>
          <small>{rows.filter((p) => p.method === "cash").length} giao dịch</small>
        </div>
        <div className="stat-card">
          <span>Ngân hàng theo sổ</span>
          <strong>{currency(bank)}</strong>
          <small>{rows.filter((p) => p.method !== "cash").length} giao dịch</small>
        </div>
        <div className="stat-card">
          <span>Tổng thu ròng</span>
          <strong>{currency(cash + bank)}</strong>
          <small>Sau hoàn cọc &amp; chi phí</small>
        </div>
        <div className="stat-card">
          <span>Đối chiếu thực tế</span>
          <strong>Chưa nhập</strong>
          <small>Nhập sao kê / kiểm đếm để đối soát</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Đối chiếu theo hình thức</h2>
          <span className="chip">Số liệu từ payments</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Hình thức</th>
                <th>Thu</th>
                <th>Chi / hoàn</th>
                <th>Chênh lệch</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Tiền mặt", "cash"],
                ["Chuyển khoản", "transfer"],
                ["Thẻ", "card"],
              ].map(([label, method]) => {
                const list = rows.filter((p) => p.method === method);
                const thu = list
                  .filter((p) => !["refund", "expense"].includes(p.type))
                  .reduce((s, p) => s + Number(p.amount), 0);
                const chi = list
                  .filter((p) => ["refund", "expense"].includes(p.type))
                  .reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <tr key={method}>
                    <td className="strong">{label}</td>
                    <td>{currency(thu)}</td>
                    <td>{currency(chi)}</td>
                    <td>{currency(thu - chi)}</td>
                    <td><span className="badge warn">Chờ đối chiếu thực tế</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="portal-form">
          <p className="notice">
            Số liệu đối soát được tính trực tiếp từ các phiếu thu/chi đã thanh
            toán trong kỳ. Chỉ chốt sổ khi đã đối chiếu sao kê ngân hàng và kiểm
            đếm tiền mặt thực tế.
          </p>
        </div>
      </div>
    </>
  );
}
