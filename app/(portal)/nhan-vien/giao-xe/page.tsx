import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { recordHandoverAction } from "@/lib/actions/ops";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; loi?: string }>;
}) {
  const { booking } = await searchParams;
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, code, customer_name, pickup_at, return_at, cars(model, plate, odometer, battery)")
    .eq("status", "signed")
    .order("pickup_at");

  const selected = bookings?.find((b) => b.id === booking) ?? bookings?.[0];

  return (
    <>
      <PortalTopbar label="Bàn giao xe" />
      <div className="page-head">
        <div>
          <h1>Bàn giao xe</h1>
          <p>Đối chiếu khách, ghi nhận hiện trạng và lưu biên bản bàn giao.</p>
        </div>
        <div className="actions">
          <Link className="button ghost" href="/nhan-vien">← Đơn thuê</Link>
        </div>
      </div>

      {!bookings?.length ? (
        <div className="panel">
          <div className="empty">
            Không có đơn nào ở trạng thái “Sẵn sàng giao”. Ký hợp đồng ở mục Đơn thuê trước.
          </div>
        </div>
      ) : (
        <div className="portal-grid">
          <form className="panel" action={recordHandoverAction}>
            <div className="panel-head">
              <h2>Thông tin bàn giao</h2>
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
                  <input
                    name="odometer"
                    type="number"
                    min={0}
                    defaultValue={(selected?.cars as { odometer?: number } | null)?.odometer ?? 0}
                  />
                </label>
                <label className="field">
                  <span>Pin lúc giao (%)</span>
                  <input
                    name="battery"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={(selected?.cars as { battery?: number } | null)?.battery ?? 100}
                  />
                </label>
              </div>
              <label className="field">
                <span>CCCD &amp; quyền nhận xe</span>
                <select name="identity">
                  <option>Đã đối chiếu</option>
                  <option>Chưa đối chiếu</option>
                </select>
              </label>
              <label className="field">
                <span>GPLX · hạng và hiệu lực</span>
                <select name="license">
                  <option>Đã đối chiếu</option>
                  <option>Chưa đối chiếu</option>
                </select>
              </label>
              <label className="field">
                <span>Phụ kiện và ghi chú hư hỏng</span>
                <textarea name="accessories" defaultValue="Sạc tại nhà, cáp Type 2, áo phủ" />
              </label>
              <label className="field">
                <span>Ghi chú hiện trạng</span>
                <textarea name="damage_note" placeholder="Trầy xước, lốp, đèn…" />
              </label>
              <p className="field-hint">
                Ảnh bốn góc xe được lưu cùng biên bản trên hệ thống vận hành.
              </p>
              <button className="button" type="submit">Lưu hiện trạng &amp; bàn giao</button>
            </div>
          </form>

          <div className="panel">
            <div className="panel-head">
              <h2>Đơn đang chọn</h2>
            </div>
            <div className="detail-list">
              <div><span>Mã đơn</span><span>{selected?.code}</span></div>
              <div><span>Khách thuê</span><span>{selected?.customer_name}</span></div>
              <div><span>Xe</span><span>{(selected?.cars as { model?: string } | null)?.model}</span></div>
              <div><span>Biển số</span><span>{(selected?.cars as { plate?: string } | null)?.plate}</span></div>
              <div><span>Nhận xe</span><span>{dateTime(selected?.pickup_at)}</span></div>
              <div><span>Trả xe</span><span>{dateTime(selected?.return_at)}</span></div>
            </div>
            <div style={{ padding: 18 }}>
              <p className="notice">
                Kiểm tra CCCD và GPLX khớp với người nhận xe trước khi giao chìa
                khóa.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
