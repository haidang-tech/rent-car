import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { savePricingAction } from "@/lib/actions/cars";
import { currency, dateOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("pricing_rules")
    .select("*")
    .order("kind")
    .order("amount");

  return (
    <>
      <PortalTopbar label="Bảng giá & phụ thu" />
      <div className="page-head">
        <div>
          <h1>Bảng giá &amp; phụ thu</h1>
          <p>Đơn giá thuê, giá ngày lễ và các khoản phụ thu.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã lưu quy tắc giá.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Quy tắc giá</h2>
            <span className="chip">{rules?.length ?? 0} quy tắc</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Quy tắc</th>
                  <th>Phạm vi</th>
                  <th>Đơn giá</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(rules ?? []).map((rule) => (
                  <tr key={rule.id}>
                    <td className="strong">
                      {rule.name}
                      <span className="sub">
                        {rule.kind === "base" ? "Đơn giá thuê" : rule.kind === "holiday" ? "Giá ngày lễ" : "Phụ thu"}
                      </span>
                    </td>
                    <td>{rule.scope}</td>
                    <td>
                      {currency(rule.amount)}
                      <span className="sub">/ {rule.unit}</span>
                    </td>
                    <td>
                      {rule.start_date ? `${dateOnly(rule.start_date)} → ${dateOnly(rule.end_date)}` : "Áp dụng thường xuyên"}
                    </td>
                    <td>
                      <span className={`badge ${rule.active ? "success" : "muted"}`}>
                        {rule.active ? "Đang áp dụng" : "Tạm dừng"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel" action={savePricingAction}>
          <div className="panel-head">
            <h2>Thêm quy tắc giá</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Tên quy tắc</span>
              <input name="name" placeholder="Giá cuối tuần" required />
            </label>
            <label className="field">
              <span>Phạm vi</span>
              <input name="scope" defaultValue="Toàn đội xe" />
            </label>
            <label className="field">
              <span>Loại</span>
              <select name="kind" defaultValue="surcharge">
                <option value="base">Đơn giá thuê</option>
                <option value="holiday">Giá ngày lễ</option>
                <option value="surcharge">Phụ thu</option>
              </select>
            </label>
            <label className="field">
              <span>Số tiền (₫)</span>
              <input name="amount" type="number" min={0} step={10000} required />
            </label>
            <label className="field">
              <span>Đơn vị</span>
              <select name="unit" defaultValue="ngày">
                <option>ngày</option>
                <option>lượt</option>
                <option>giờ</option>
              </select>
            </label>
            <label className="field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input name="active" type="checkbox" defaultChecked style={{ width: "auto" }} />
              <span style={{ margin: 0 }}>Áp dụng ngay</span>
            </label>
            <button className="button" type="submit">Lưu quy tắc</button>
          </div>
        </form>
      </div>
    </>
  );
}
