import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { LocationForm, type LocationRecord } from "@/components/location-form";
import { toggleLocationAction } from "@/lib/actions/administration";

export const dynamic = "force-dynamic";
const types: Record<string, string> = { hub: "Điểm hẹn", airport: "Sân bay", hotel: "Khách sạn", office: "Văn phòng" };

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ edit?: string; ok?: string; loi?: string }> }) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active" || profile.role !== "admin") redirect("/dang-nhap?next=/quan-tri/diem-nhan");
  const { edit, ok, loi } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("locations").select("id, code, name, type, address, note, active").order("code");
  const locations = (data ?? []) as LocationRecord[];
  const selected = locations.find(location => location.id === edit);
  return <>
    <PortalTopbar label="Điểm giao nhận xe" />
    <div className="page-head"><div><h1>Điểm giao nhận xe</h1><p>Quản lý địa điểm nhận, trả và trạng thái nhận đơn mới.</p></div><Link className="button" href="/quan-tri/diem-nhan#location-form">Thêm địa điểm</Link></div>
    {ok ? <p className="form-message success" role="status">Đã cập nhật điểm giao nhận.</p> : null}
    {loi || error ? <p className="form-message error" role="alert">{loi || error?.message}</p> : null}
    <section className="panel"><div className="panel-head"><h2>{error ? "Chưa tải được danh sách" : `${locations.length} điểm giao nhận`}</h2></div><div className="table-wrap"><table className="data"><thead><tr><th>Mã điểm</th><th>Địa điểm</th><th>Loại</th><th>Địa chỉ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {locations.map(location => <tr key={location.id}><td className="strong">{location.code}</td><td>{location.name}</td><td>{types[location.type] ?? location.type}</td><td>{location.address || "—"}</td><td><span className={`badge ${location.active ? "success" : "danger"}`}>{location.active ? "Đang hoạt động" : "Ngừng nhận đơn"}</span></td><td><div className="row-actions"><Link className="chip" href={`/quan-tri/diem-nhan?edit=${location.id}#location-form`}>Chỉnh sửa</Link><form action={toggleLocationAction}><input type="hidden" name="id" value={location.id} /><input type="hidden" name="active" value={String(!location.active)} /><button className="chip" type="submit">{location.active ? "Ngừng nhận đơn" : "Mở nhận đơn"}</button></form></div></td></tr>)}
      {!error && !locations.length ? <tr><td colSpan={6} className="empty">Chưa có điểm giao nhận. Thêm địa điểm đầu tiên bên dưới.</td></tr> : null}
    </tbody></table></div></section>
    <section className="panel" id="location-form"><div className="panel-head"><h2>{selected ? `Chỉnh sửa ${selected.name}` : "Thêm địa điểm"}</h2></div>{edit && !selected ? <p className="form-message error">Không tìm thấy địa điểm cần sửa.</p> : <LocationForm key={selected?.id ?? "new"} location={selected} />}</section>
  </>;
}
