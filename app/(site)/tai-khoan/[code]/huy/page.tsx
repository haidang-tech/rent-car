import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { cancelMyBookingAction } from "@/lib/actions/customer";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hủy chuyến" };

const REASONS = [
  "Thay đổi lịch trình",
  "Tìm được phương án khác",
  "Vấn đề về giấy tờ / xác thực",
  "Lý do khác",
];

export default async function CancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ loi?: string }>;
}) {
  const { code } = await params;
  const { loi } = await searchParams;
  const { booking, kyc, contract, deposit, policy } = await getBookingContext(code);

  const allowed = ["pending", "confirmed", "signed"].includes(booking.status);
  const cancelHours = Number(policy?.cancel_hours ?? 24);
  const refundPct = Number(policy?.refund_pct ?? 100);
  const hoursUntilPickup = (new Date(booking.pickup_at).getTime() - Date.now()) / 3_600_000;
  const inTime = hoursUntilPickup >= cancelHours;
  const refund = inTime ? (Number(booking.deposit) * refundPct) / 100 : 0;
  const fee = Number(booking.deposit) - refund;

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div className="container">
        <div className="crumbs">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/tai-khoan">Đơn của tôi</Link>
          <span>/</span>
          <Link href={`/tai-khoan/${code}`}>{booking.code}</Link>
        </div>

        <div className="account-detail-grid">
          <div>
            <AccountNav code={code} current="huy" />

            <BookingProgress
              kycStatus={kyc?.status}
              contractSigned={contract?.customer_signed}
              depositStatus={deposit?.status}
            />

            {loi ? <p className="form-message error">{loi}</p> : null}

            <div className="card">
              <h1 style={{ fontSize: 26 }}>Hủy đặt xe</h1>
              <p className="muted">
                Kiểm tra chính sách hủy và số tiền dự kiến trước khi xác nhận. Hủy trực tuyến
                chỉ áp dụng cho đơn chưa nhận xe.
              </p>

              <dl className="summary-rows" style={{ marginTop: 16 }}>
                <div>
                  <dt>Giờ nhận xe</dt>
                  <dd>{dateTime(booking.pickup_at)}</dd>
                </div>
                <div>
                  <dt>Chính sách áp dụng</dt>
                  <dd>
                    Hủy trước {cancelHours} giờ hoàn {refundPct}% cọc
                  </dd>
                </div>
                <div>
                  <dt>Tiền cọc</dt>
                  <dd>{currency(booking.deposit)}</dd>
                </div>
                <div>
                  <dt>Dự kiến hoàn</dt>
                  <dd>{currency(refund)}</dd>
                </div>
                <div>
                  <dt>Phí hủy dự kiến</dt>
                  <dd>{currency(fee)}</dd>
                </div>
              </dl>

              {!inTime ? (
                <p className="notice" style={{ marginTop: 14 }}>
                  Bạn đang hủy trong vòng {cancelHours} giờ trước giờ nhận xe nên khoản hoàn cọc
                  có thể bằng 0. Kế toán sẽ đối soát và xác nhận.
                </p>
              ) : null}

              {allowed ? (
                <form action={cancelMyBookingAction} style={{ marginTop: 16 }}>
                  <input type="hidden" name="code" value={code} />
                  <h2 style={{ fontSize: 17 }}>Lý do hủy</h2>
                  <div className="choice-cards">
                    {REASONS.map((reason) => (
                      <label className="choice-card" key={reason}>
                        <input type="radio" name="reason" value={reason} required />
                        <span>
                          <strong>{reason}</strong>
                        </span>
                      </label>
                    ))}
                  </div>
                  <label className="field" style={{ marginTop: 12 }}>
                    <span>Chi tiết (tùy chọn)</span>
                    <textarea name="detail" placeholder="Chia sẻ thêm để Lái Đi hỗ trợ" />
                  </label>
                  <div className="form-actions">
                    <Link className="button ghost" href={`/tai-khoan/${code}`}>
                      Giữ chuyến
                    </Link>
                    <button className="button danger" type="submit">
                      Xác nhận hủy chuyến
                    </button>
                  </div>
                  <p className="field-hint">
                    Sau khi hủy, đơn không thể khôi phục. Khoản hoàn cọc (nếu có) được xử lý theo
                    quy trình quyết toán.
                  </p>
                </form>
              ) : (
                <p className="notice" style={{ marginTop: 16 }}>
                  Đơn ở trạng thái hiện tại không thể hủy trực tuyến. Vui lòng liên hệ hotline
                  0905 111 222.
                </p>
              )}
            </div>
          </div>

          <BookingSummary booking={booking} />
        </div>
      </div>
    </section>
  );
}
