import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { recordReturnAction } from "@/lib/actions/ops";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; loi?: string }>;
}) {
  const { booking } = await searchParams;
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, code, customer_name, pickup_at, return_at, cars(model, plate, odometer, battery)")
    .eq("status", "handed_over")
    .order("return_at");

  const selected = bookings?.find((b) => b.id === booking) ?? bookings?.[0];
  const car = selected?.cars as { model?: string; plate?: string; odometer?: number; battery?: number } | null;

  return (
    <>
      <PortalTopbar label="Tiếp nhận xe trả" />
      <div className="page-head">
        <div>
          <h1>Tiếp nhận xe trả</h1>
          <p>Kiểm tra hiện trạng, ghi nhận phí phát sinh trước khi quyết toán cọc.</p>
        </div>
        <div className="actions">
          <Link className="button ghost" href="/nhan-vien">← Đơn thuê</Link>
        </div>
      </div>

      {!bookings?.length ? (
        <div className="panel">
          <div className="empty">Không có xe nào đang thuê cần tiếp nhận.</div>
        </div>
      ) : (
        <div className="portal-grid">
          <form className="panel" action={recordReturnAction}>
            <div className="panel-head">
              <h2>Kiểm tra trước khi lập biên bản</h2>
            </div>
            <div className="portal-form">
              <input type="hidden" name="back" value="/nhan-vien" />
              <label className="field">
                <span>Mã đơn thuê</span>
                <select name="booking_id" defaultValue={selected?.id}>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.customer_name} · {(b.cars as { plate?: string } | null)?.plate}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>ODO lúc giao (km)</span>
                  <input name="odo_out" type="number" defaultValue={car?.odometer ?? 0} readOnly />
                </label>
                <label className="field">
                  <span>ODO lúc trả (km)</span>
                  <input name="odometer" type="number" min={0} defaultValue={car?.odometer ?? 0} />
                </label>
                <label className="field">
                  <span>Pin lúc giao (%)</span>
                  <input name="battery_out" type="number" defaultValue={car?.battery ?? 100} readOnly />
                </label>
                <label className="field">
                  <span>Pin lúc trả (%)</span>
                  <input name="battery" type="number" min={0} max={100} defaultValue={car?.battery ?? 100} />
                </label>
              </div>
              <label className="field">
                <span>Hư hỏng và ghi chú khi trả</span>
                <textarea name="damage_note" placeholder="Không phát sinh / mô tả hư hỏng" />
              </label>
              <label className="field">
                <span>Phí phát sinh (₫)</span>
                <input name="fees" type="number" min={0} step={50000} defaultValue={0} />
              </label>
              <p className="field-hint">
                Phí phát sinh sẽ tạo phiếu chi tương ứng và chuyển xe sang bảo
                dưỡng nếu cần.
              </p>
              <button className="button" type="submit">Lưu kết quả kiểm tra</button>
            </div>
          </form>

          <div className="panel">
            <div className="panel-head">
              <h2>Chênh lệch khi trả</h2>
            </div>
            <div className="detail-list">
              <div><span>Mã đơn</span><span>{selected?.code}</span></div>
              <div><span>Khách</span><span>{selected?.customer_name}</span></div>
              <div><span>Xe</span><span>{car?.model}</span></div>
              <div><span>Giờ hẹn trả</span><span>{dateTime(selected?.return_at)}</span></div>
              <div><span>Trạng thái</span><span>Đang thuê</span></div>
            </div>
            <div style={{ padding: 18 }}>
              <p className="notice">
                Nếu quá giờ trả, ghi nhận phụ thu 150.000 ₫/giờ theo bảng giá.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
