import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { requestExtensionAction } from "@/lib/actions/customer";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { currency, dateTime, toDateTimeInput } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gia hạn chuyến thuê" };

export default async function ExtensionPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ gui?: string; loi?: string }>;
}) {
  const { code } = await params;
  const { gui, loi } = await searchParams;
  const { booking, kyc, contract, deposit, requests } = await getBookingContext(code);

  const pending = requests.find((r) => r.kind === "extension" && r.status === "pending");
  const allowed = ["confirmed", "signed", "handed_over"].includes(booking.status);
  const minReturn = toDateTimeInput(booking.return_at);
  const suggested = toDateTimeInput(
    new Date(new Date(booking.return_at).getTime() + 86_400_000).toISOString(),
  );

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
            <AccountNav code={code} current="gia-han" />

            <BookingProgress
              kycStatus={kyc?.status}
              contractSigned={contract?.customer_signed}
              depositStatus={deposit?.status}
            />

            {gui ? (
              <p className="form-message success">Đã gửi yêu cầu gia hạn, chờ nhân viên duyệt.</p>
            ) : null}
            {loi ? <p className="form-message error">{loi}</p> : null}

            {pending ? (
              <div className="notice">
                Yêu cầu gia hạn {pending.code} đang chờ duyệt: trả xe lúc{" "}
                {dateTime(pending.desired_return_at)} · phí dự kiến {currency(pending.fee)}.
              </div>
            ) : null}

            <div className="card">
              <h1 style={{ fontSize: 26 }}>Yêu cầu gia hạn</h1>
              <p className="muted">
                Gia hạn chỉ có hiệu lực sau khi nhân viên kiểm tra lịch xe và duyệt yêu cầu.
                Phí gia hạn tính theo giá ngày của xe.
              </p>

              <dl className="summary-rows" style={{ marginTop: 16 }}>
                <div>
                  <dt>Thời gian trả hiện tại</dt>
                  <dd>{dateTime(booking.return_at)}</dd>
                </div>
                <div>
                  <dt>Giá thuê</dt>
                  <dd>{currency(booking.unit_price)} / ngày</dd>
                </div>
                <div>
                  <dt>Xe</dt>
                  <dd>
                    {booking.cars?.brand} {booking.cars?.model} · {booking.cars?.plate}
                  </dd>
                </div>
              </dl>

              {allowed ? (
                <form action={requestExtensionAction}>
                  <input type="hidden" name="code" value={code} />
                  <div className="form-grid" style={{ marginTop: 16 }}>
                    <label className="field">
                      <span>Thời gian trả mới</span>
                      <input
                        name="desired_return_at"
                        type="datetime-local"
                        min={minReturn}
                        defaultValue={suggested}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Lý do</span>
                      <input name="reason" placeholder="Kẹt lịch trình, muốn đi thêm Hội An…" />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="button" type="submit">
                      Gửi yêu cầu gia hạn
                    </button>
                  </div>
                  <p className="field-hint">
                    Phí dự kiến được tính khi nhân viên duyệt, dựa trên số ngày gia hạn ×{" "}
                    {currency(booking.unit_price)}.
                  </p>
                </form>
              ) : (
                <p className="notice" style={{ marginTop: 16 }}>
                  Chỉ đơn đã xác nhận hoặc đang thuê mới có thể gia hạn.
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
