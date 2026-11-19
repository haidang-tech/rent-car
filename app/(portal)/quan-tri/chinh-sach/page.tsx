import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { savePolicyAction } from "@/lib/actions/cars";
import { currency, dateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const { data: policies } = await supabase
    .from("policies")
    .select("*")
    .order("effective_from", { ascending: false });

  return (
    <>
      <PortalTopbar label="Chính sách cọc & hủy" />
      <div className="page-head">
        <div>
          <h1>Chính sách cọc &amp; hủy</h1>
          <p>Phiên bản chính sách áp dụng cho đơn đặt mới.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã lưu phiên bản chính sách.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Phiên bản chính sách</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Mức cọc</th>
                  <th>Bảo lưu phạt nguội</th>
                  <th>Hủy trước</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(policies ?? []).map((policy) => (
                  <tr key={policy.id}>
                    <td className="strong">{policy.name}</td>
                    <td>
                      {policy.deposit_type === "percent"
                        ? `${policy.deposit_value}%`
                        : currency(policy.deposit_value)}
                    </td>
                    <td>{currency(policy.fine_hold)}</td>
                    <td>
                      {policy.cancel_hours} giờ
                      <span className="sub">hoàn {policy.refund_pct}%</span>
                    </td>
                    <td>{dateOnly(policy.effective_from)}</td>
                    <td>
                      <span className={`badge ${policy.active ? "success" : "muted"}`}>
                        {policy.active ? "Đang áp dụng" : "Lưu trữ"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!policies?.length ? (
                  <tr>
                    <td colSpan={6} className="empty">Chưa có chính sách.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel" action={savePolicyAction}>
          <div className="panel-head">
            <h2>Thêm phiên bản</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Tên phiên bản</span>
              <input name="name" placeholder="Chính sách cọc 2027" required />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Loại cọc</span>
                <select name="deposit_type" defaultValue="percent">
                  <option value="percent">Tỷ lệ phần trăm</option>
                  <option value="fixed">Số tiền cố định</option>
                </select>
              </label>
              <label className="field">
                <span>Mức cọc</span>
                <input name="deposit_value" type="number" min={0} defaultValue={30} />
              </label>
            </div>
            <label className="field">
              <span>Bảo lưu phạt nguội (₫)</span>
              <input name="fine_hold" type="number" min={0} step={100000} defaultValue={2000000} />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Hủy trước (giờ)</span>
                <input name="cancel_hours" type="number" min={0} defaultValue={24} />
              </label>
              <label className="field">
                <span>Hoàn cọc (%)</span>
                <input name="refund_pct" type="number" min={0} max={100} defaultValue={100} />
              </label>
            </div>
            <label className="field">
              <span>Hiệu lực từ</span>
              <input name="effective_from" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <button className="button" type="submit">Lưu phiên bản</button>
          </div>
        </form>
      </div>
    </>
  );
}
