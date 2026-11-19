import Link from "next/link";
import { saveCarAction } from "@/lib/actions/cars";

type Car = {
  id: string;
  code: string;
  plate: string;
  brand: string;
  model: string;
  category: string;
  seats: number;
  transmission: string;
  fuel: string;
  year: number | null;
  price_per_day: number;
  deposit: number;
  status: string;
  image_url: string | null;
  description: string | null;
  features: string[] | null;
};

export function CarForm({ car }: { car?: Car }) {
  const editing = Boolean(car?.id);

  return (
    <form className="portal-form" action={saveCarAction}>
      {editing ? <input type="hidden" name="id" value={car!.id} /> : null}
      <div className="form-grid">
        <label className="field">
          <span>Mã xe</span>
          <input name="code" defaultValue={car?.code} placeholder="VF5-03" required />
        </label>
        <label className="field">
          <span>Biển số</span>
          <input name="plate" defaultValue={car?.plate} placeholder="43A-123.45" required />
        </label>
        <label className="field">
          <span>Hãng xe</span>
          <input name="brand" defaultValue={car?.brand ?? "VinFast"} required />
        </label>
        <label className="field">
          <span>Mẫu / loại xe</span>
          <input name="model" defaultValue={car?.model} placeholder="VF 6" required />
        </label>
        <label className="field">
          <span>Nhóm xe</span>
          <input name="category" defaultValue={car?.category ?? "SUV cỡ B"} />
        </label>
        <label className="field">
          <span>Số chỗ</span>
          <input name="seats" type="number" min={2} max={30} defaultValue={car?.seats ?? 5} />
        </label>
        <label className="field">
          <span>Hộp số</span>
          <select name="transmission" defaultValue={car?.transmission ?? "auto"}>
            <option value="auto">Tự động</option>
            <option value="manual">Số sàn</option>
          </select>
        </label>
        <label className="field">
          <span>Nhiên liệu</span>
          <select name="fuel" defaultValue={car?.fuel ?? "electric"}>
            <option value="electric">Điện</option>
            <option value="petrol">Xăng</option>
            <option value="diesel">Dầu</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label className="field">
          <span>Năm sản xuất</span>
          <input name="year" type="number" defaultValue={car?.year ?? 2025} />
        </label>
        <label className="field">
          <span>Giá thuê / ngày (₫)</span>
          <input name="price_per_day" type="number" min={0} step={10000} defaultValue={car?.price_per_day ?? 890000} />
        </label>
        <label className="field">
          <span>Tiền cọc (₫)</span>
          <input name="deposit" type="number" min={0} step={100000} defaultValue={car?.deposit ?? 7000000} />
        </label>
        <label className="field">
          <span>Trạng thái</span>
          <select name="status" defaultValue={car?.status ?? "available"}>
            <option value="available">Sẵn sàng</option>
            <option value="rented">Đang cho thuê</option>
            <option value="maintenance">Bảo dưỡng</option>
            <option value="unavailable">Chưa sẵn sàng</option>
          </select>
        </label>
        <label className="field full">
          <span>Ảnh xe (đường dẫn)</span>
          <input name="image_url" defaultValue={car?.image_url ?? "/images/vf6.png"} />
          <em className="field-hint">Dùng ảnh có sẵn: /images/vf5.png, /images/vf6.png, /images/vfmpv7.png</em>
        </label>
        <label className="field full">
          <span>Tiện nghi (phân cách bằng dấu phẩy)</span>
          <input name="features" defaultValue={(car?.features ?? ["Tự lái", "Sạc nhanh", "Camera 360"]).join(", ")} />
        </label>
        <label className="field full">
          <span>Mô tả</span>
          <textarea name="description" defaultValue={car?.description ?? ""} />
        </label>
      </div>
      <div className="form-actions">
        <button className="button" type="submit">
          {editing ? "Lưu thay đổi" : "Lưu xe mới"}
        </button>
        <Link className="button ghost" href="/quan-tri/xe">
          Hủy
        </Link>
      </div>
    </form>
  );
}
