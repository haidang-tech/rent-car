import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { saveFineAction } from "@/lib/actions/ops";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const FINE_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "Chờ xác minh", tone: "warn" },
  verifying: { label: "Đang xác minh", tone: "info" },
  waiting: { label: "Chờ phản hồi", tone: "warn" },
  resolved: { label: "Đã xử lý", tone: "success" },
};

export default async function FinesPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const { data: fines } = await supabase
    .from("fines")
    .select("id, code, plate, occurred_at, status, amount, note")
    .order("created_at", { ascending: false });

  const open = (fines ?? []).filter((f) => f.status !== "resolved");

  return (
    <>
      <PortalTopbar label="Quản lý phạt nguội" />
      <div className="page-head">
        <div>
          <h1>Quản lý phạt nguội</h1>
          <p>Đối chiếu biên bản với chuyến thuê và cấn trừ tiền cọc.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã lưu hồ sơ phạt nguội.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <span>Hồ sơ mở</span>
          <strong>{open.length}</strong>
          <small>Chưa xử lý</small>
        </div>
        <div className="stat-card">
          <span>Tổng tiền</span>
          <strong>{currency((fines ?? []).reduce((s, f) => s + Number(f.amount), 0))}</strong>
          <small>{fines?.length ?? 0} hồ sơ</small>
        </div>
        <div className="stat-card">
          <span>Đã xử lý</span>
          <strong>{(fines ?? []).filter((f) => f.status === "resolved").length}</strong>
          <small>Đã cấn trừ cọc</small>
        </div>
        <div className="stat-card">
          <span>Chờ phản hồi khách</span>
          <strong>{(fines ?? []).filter((f) => f.status === "waiting").length}</strong>
          <small>Quá 15 ngày</small>
        </div>
      </div>

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Biên bản &amp; hồ sơ</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Hồ sơ</th>
                  <th>Biển số</th>
                  <th>Thời điểm</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(fines ?? []).map((fine) => (
                  <tr key={fine.id}>
                    <td className="strong">
                      {fine.code}
                      <span className="sub">{fine.note}</span>
                    </td>
                    <td>{fine.plate}</td>
                    <td>{dateTime(fine.occurred_at)}</td>
                    <td>{currency(fine.amount)}</td>
                    <td>
                      <span className={`badge ${FINE_STATUS[fine.status]?.tone ?? "muted"}`}>
                        {FINE_STATUS[fine.status]?.label ?? fine.status}
                      </span>
                    </td>
                    <td>
                      {fine.status !== "resolved" ? (
                        <form action={saveFineAction}>
                          <input type="hidden" name="id" value={fine.id} />
                          <input type="hidden" name="status" value="resolved" />
                          <button className="chip" type="submit">Đã xử lý</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!fines?.length ? (
                  <tr><td colSpan={6} className="empty">Chưa có hồ sơ phạt nguội.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel" action={saveFineAction}>
          <div className="panel-head">
            <h2>Nhập biên bản</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Biển số xe</span>
              <input name="plate" placeholder="43A-123.45" required />
            </label>
            <label className="field">
              <span>Thời điểm vi phạm</span>
              <input name="occurred_at" type="datetime-local" />
            </label>
            <label className="field">
              <span>Số tiền (₫)</span>
              <input name="amount" type="number" min={0} step={50000} required />
            </label>
            <label className="field">
              <span>Ghi chú</span>
              <textarea name="note" placeholder="Nguồn thông báo, địa điểm" />
            </label>
            <button className="button" type="submit">Lưu hồ sơ</button>
          </div>
        </form>
      </div>
    </>
  );
}
