import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { saveIncidentAction } from "@/lib/actions/ops";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const SEVERITY: Record<string, { label: string; tone: string }> = {
  low: { label: "Thấp", tone: "muted" },
  medium: { label: "Trung bình", tone: "warn" },
  high: { label: "Cao", tone: "danger" },
};
const INC_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "Mới tiếp nhận", tone: "warn" },
  processing: { label: "Đang xử lý", tone: "info" },
  resolved: { label: "Đã xử lý", tone: "success" },
};

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const [{ data: incidents }, { data: cars }, { data: bookings }] = await Promise.all([
    supabase
      .from("incidents")
      .select("id, code, type, severity, status, description, created_at, cars:car_id(model, plate)")
      .order("created_at", { ascending: false }),
    supabase.from("cars").select("id, model, plate").order("model"),
    supabase
      .from("bookings")
      .select("id, code")
      .in("status", ["handed_over", "signed"])
      .order("pickup_at"),
  ]);

  return (
    <>
      <PortalTopbar label="Sự cố & đổi xe" />
      <div className="page-head">
        <div>
          <h1>Sự cố &amp; đổi xe</h1>
          <p>Tiếp nhận sự cố, theo dõi xử lý và bố trí xe thay thế.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã lưu sự cố.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Danh sách sự cố</h2>
            <span className="chip">{incidents?.length ?? 0}</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Xe</th>
                  <th>Phân loại</th>
                  <th>Mức độ</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(incidents ?? []).map((incident) => (
                  <tr key={incident.id}>
                    <td className="strong">
                      {incident.code}
                      <span className="sub">{dateTime(incident.created_at)}</span>
                    </td>
                    <td>
                      {(incident.cars as { model?: string } | null)?.model ?? "—"}
                      <span className="sub">{(incident.cars as { plate?: string } | null)?.plate}</span>
                    </td>
                    <td>
                      {incident.type}
                      <span className="sub">{incident.description}</span>
                    </td>
                    <td>
                      <span className={`badge ${SEVERITY[incident.severity]?.tone ?? "muted"}`}>
                        {SEVERITY[incident.severity]?.label ?? incident.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${INC_STATUS[incident.status]?.tone ?? "muted"}`}>
                        {INC_STATUS[incident.status]?.label ?? incident.status}
                      </span>
                    </td>
                    <td>
                      <form action={saveIncidentAction} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="id" value={incident.id} />
                        <select name="status" defaultValue={incident.status} style={{ border: "1px solid var(--plum-line)", borderRadius: 8, padding: "4px 6px", fontSize: 12 }}>
                          <option value="new">Mới</option>
                          <option value="processing">Đang xử lý</option>
                          <option value="resolved">Đã xử lý</option>
                        </select>
                        <button className="chip" type="submit">Lưu</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!incidents?.length ? (
                  <tr><td colSpan={6} className="empty">Chưa có sự cố.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel" action={saveIncidentAction}>
          <div className="panel-head">
            <h2>Ghi nhận sự cố</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Đơn thuê liên quan</span>
              <select name="booking_id" defaultValue="">
                <option value="">Không có</option>
                {(bookings ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Xe</span>
              <select name="car_id" defaultValue="">
                <option value="">Không xác định</option>
                {(cars ?? []).map((car) => (
                  <option key={car.id} value={car.id}>{car.model} · {car.plate}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Phân loại</span>
              <select name="type" defaultValue="Sự cố kỹ thuật">
                <option>Sự cố kỹ thuật</option>
                <option>Hư hỏng ngoại thất</option>
                <option>Tai nạn</option>
                <option>Mất phụ kiện</option>
              </select>
            </label>
            <label className="field">
              <span>Mức độ</span>
              <select name="severity" defaultValue="medium">
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </label>
            <label className="field">
              <span>Mô tả</span>
              <textarea name="description" required />
            </label>
            <button className="button" type="submit">Lưu sự cố</button>
          </div>
        </form>
      </div>
    </>
  );
}
