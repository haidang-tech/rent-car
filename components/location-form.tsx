import Link from "next/link";
import { saveLocationAction } from "@/lib/actions/administration";

export type LocationRecord = {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  note: string | null;
  active: boolean;
};

export function LocationForm({ location }: { location?: LocationRecord }) {
  return (
    <form className="portal-form" action={saveLocationAction}>
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <div className="form-grid">
        <label className="field"><span>Mã điểm</span><input name="code" defaultValue={location?.code} required minLength={2} maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="DN-01" /></label>
        <label className="field"><span>Tên địa điểm</span><input name="name" defaultValue={location?.name} required minLength={2} maxLength={150} /></label>
        <label className="field"><span>Loại điểm</span><select name="type" defaultValue={location?.type ?? "hub"}><option value="hub">Điểm hẹn</option><option value="airport">Sân bay</option><option value="hotel">Khách sạn</option><option value="office">Văn phòng</option></select></label>
        <label className="field"><span>Địa chỉ</span><input name="address" defaultValue={location?.address ?? ""} maxLength={500} /></label>
        <label className="field full"><span>Ghi chú giao nhận</span><textarea name="note" defaultValue={location?.note ?? ""} maxLength={1000} /></label>
        <label><input type="checkbox" name="active" defaultChecked={location?.active ?? true} /> Nhận đơn mới tại điểm này</label>
      </div>
      <div className="form-actions"><Link className="button ghost" href="/quan-tri/diem-nhan">Hủy chỉnh sửa</Link><button className="button" type="submit">{location ? "Lưu thay đổi" : "Thêm địa điểm"}</button></div>
    </form>
  );
}
