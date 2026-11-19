import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { CAR_STATUS, currency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; luu?: string; xoa?: string; loi?: string }>;
}) {
  const { status, luu, xoa, loi } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("cars").select("*").order("created_at");
  if (status) query = query.eq("status", status);
  const { data: cars } = await query;

  const filters = [
    ["", "Tất cả"],
    ["available", "Sẵn sàng"],
    ["rented", "Đang cho thuê"],
    ["maintenance", "Bảo dưỡng"],
    ["unavailable", "Chưa sẵn sàng"],
  ];

  return (
    <>
      <PortalTopbar label="Danh mục xe" />
      <div className="page-head">
        <div>
          <h1>Danh mục xe</h1>
          <p>{cars?.length ?? 0} phương tiện trong hệ thống.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/quan-tri/xe/moi">
            + Thêm xe mới
          </Link>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã lưu thông tin xe.</p> : null}
      {xoa ? <p className="form-message success">Đã xóa xe.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2>Phương tiện</h2>
          <div className="filters">
            {filters.map(([value, label]) => (
              <Link
                key={label}
                className={`chip ${(status ?? "") === value ? "active" : ""}`}
                href={value ? `/quan-tri/xe?status=${value}` : "/quan-tri/xe"}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Xe</th>
                <th>Biển số</th>
                <th>Nhóm</th>
                <th>Số chỗ</th>
                <th>Giá / ngày</th>
                <th>Pin</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(cars ?? []).map((car) => (
                <tr key={car.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Image
                        src={car.image_url || "/images/vf5.png"}
                        alt=""
                        width={54}
                        height={36}
                        style={{ borderRadius: 6, objectFit: "cover" }}
                      />
                      <span className="strong">
                        {car.brand} {car.model}
                        <span className="sub">{car.code}</span>
                      </span>
                    </div>
                  </td>
                  <td>{car.plate}</td>
                  <td>{car.category}</td>
                  <td>{car.seats}</td>
                  <td>{currency(car.price_per_day)}</td>
                  <td>{car.battery}%</td>
                  <td>
                    <span className={`badge ${CAR_STATUS[car.status]?.tone ?? "muted"}`}>
                      {CAR_STATUS[car.status]?.label ?? car.status}
                    </span>
                  </td>
                  <td>
                    <Link className="chip" href={`/quan-tri/xe/${car.id}`}>
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
              {!cars?.length ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Không có xe nào ở trạng thái này.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
