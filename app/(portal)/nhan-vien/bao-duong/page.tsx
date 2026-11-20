import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { saveMaintenanceAction } from "@/lib/actions/ops";
import { CHECK_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const [{ data: orders }, { data: cars }] = await Promise.all([
    supabase
      .from("maintenance_orders")
      .select("id, code, category, assignee, status, estimate, actual, notes, scheduled_at, cars(model, plate)")
      .order("created_at", { ascending: false }),
    supabase.from("cars").select("id, model, plate").order("model"),
  ]);

  const next: Record<string, string> = {
    approved: "in_progress",
    in_progress: "completed",
  };

  return (
    <>
      <PortalTopbar label="Bảo dưỡng & sửa chữa" />
      <div className="page-head">
        <div>
          <h1>Bảo dưỡng &amp; sửa chữa</h1>
          <p>Lệnh bảo dưỡng, dự toán và nghiệm thu.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã cập nhật lệnh bảo dưỡng.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Lệnh bảo dưỡng</h2>
            <span className="chip">{orders?.length ?? 0} lệnh</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Lệnh</th>
                  <th>Xe</th>
                  <th>Hạng mục</th>
                  <th>Phụ trách</th>
                  <th>Dự toán</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((order) => (
                  <tr key={order.id}>
                    <td className="strong">
                      {order.code}
                      <span className="sub">{dateTime(order.scheduled_at)}</span>
                    </td>
                    <td>
                      {(order.cars as { model?: string } | null)?.model}
                      <span className="sub">{(order.cars as { plate?: string } | null)?.plate}</span>
                    </td>
                    <td>
                      {order.category}
                      <span className="sub">{order.notes}</span>
                    </td>
                    <td>{order.assignee ?? "—"}</td>
                    <td>
                      {currency(order.estimate)}
                      {order.actual ? <span className="sub">TT {currency(order.actual)}</span> : null}
                    </td>
                    <td>
                      <span className={`badge ${CHECK_STATUS[order.status]?.tone ?? "muted"}`}>
                        {CHECK_STATUS[order.status]?.label ?? order.status}
                      </span>
                    </td>
                    <td>
                      {next[order.status] ? (
                        <form action={saveMaintenanceAction}>
                          <input type="hidden" name="id" value={order.id} />
                          <input type="hidden" name="status" value={next[order.status]} />
                          <input type="hidden" name="actual" value={order.estimate} />
                          <button className="chip" type="submit">
                            {CHECK_STATUS[next[order.status]]?.label}
                          </button>
                        </form>
                      ) : order.status === "pending" ? (
                        <span className="badge warn">Chờ kế toán duyệt dự toán</span>
                      ) : order.status === "completed" ? (
                        <span className="badge success">Đã nghiệm thu</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!orders?.length ? (
                  <tr><td colSpan={7} className="empty">Chưa có lệnh bảo dưỡng.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <form className="panel" action={saveMaintenanceAction}>
          <div className="panel-head">
            <h2>Lập lệnh bảo dưỡng</h2>
          </div>
          <div className="portal-form">
            <label className="field">
              <span>Xe</span>
              <select name="car_id" required>
                {(cars ?? []).map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.model} · {car.plate}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Hạng mục</span>
              <input name="category" defaultValue="Bảo dưỡng định kỳ" />
            </label>
            <label className="field">
              <span>Phụ trách</span>
              <input name="assignee" placeholder="Trần Văn Hải" />
            </label>
            <label className="field">
              <span>Dự toán (₫)</span>
              <input name="estimate" type="number" min={0} step={100000} defaultValue={0} />
            </label>
            <label className="field">
              <span>Ghi chú</span>
              <textarea name="notes" placeholder="Tình trạng xe, yêu cầu xưởng" />
            </label>
            <button className="button" type="submit">Tạo lệnh</button>
          </div>
        </form>
      </div>
    </>
  );
}
