import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { approveEstimateAction } from "@/lib/actions/administration";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EstimatesPage({ searchParams }: { searchParams: Promise<{ ok?: string; loi?: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active" || !["admin", "accountant"].includes(profile.role)) redirect("/dang-nhap?next=/ke-toan/duyet-du-toan");
  const { ok, loi } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("maintenance_orders").select("id, code, category, assignee, estimate, notes, created_at, cars(plate, model)").eq("status", "pending").order("created_at");
  return <>
    <PortalTopbar label="Duyệt dự toán bảo dưỡng" />
    <div className="page-head"><div><h1>Duyệt dự toán bảo dưỡng</h1><p>Đối chiếu hạng mục, ghi chú và dự toán trước khi phê duyệt.</p></div></div>
    {ok ? <p className="form-message success" role="status">Đã duyệt dự toán. Nhân viên có thể tiếp tục xử lý lệnh bảo dưỡng.</p> : null}
    {loi || error ? <p className="form-message error" role="alert">{loi || error?.message}</p> : null}
    <div className="panel"><div className="panel-head"><h2>{error ? "Chưa tải được dự toán" : `${data?.length ?? 0} lệnh chờ duyệt`}</h2></div><div className="table-wrap"><table className="data"><thead><tr><th>Lệnh</th><th>Xe</th><th>Hạng mục / ghi chú</th><th>Phụ trách</th><th>Dự toán</th><th>Ngày lập</th><th>Thao tác</th></tr></thead><tbody>
      {(data ?? []).map(order => {
        const car = order.cars as unknown as { plate: string; model: string } | null;
        return <tr key={order.id}><td className="strong">{order.code}</td><td>{car?.plate ?? "—"}<br />{car?.model}</td><td>{order.category}{order.notes ? <p>{order.notes}</p> : null}</td><td>{order.assignee || "Chưa phân công"}</td><td>{currency(order.estimate)}</td><td>{dateTime(order.created_at)}</td><td><form action={approveEstimateAction}><input type="hidden" name="id" value={order.id} /><button className="chip" type="submit">Duyệt dự toán</button></form></td></tr>;
      })}
      {!error && !data?.length ? <tr><td colSpan={7} className="empty">Không có dự toán đang chờ duyệt.</td></tr> : null}
    </tbody></table></div></div>
  </>;
}
