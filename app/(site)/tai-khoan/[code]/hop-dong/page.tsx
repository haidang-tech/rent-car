import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { signMyContractAction } from "@/lib/actions/customer";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hợp đồng điện tử" };

export default async function ContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ ky?: string; loi?: string }>;
}) {
  const { code } = await params;
  const { ky, loi } = await searchParams;
  const { booking, contract, kyc, deposit, policy } = await getBookingContext(code);
  const expectedCode = `HD-${booking.code.replace("LD-", "")}`;
  const signed = Boolean(contract?.customer_signed);
  const rental = Number(booking.unit_price) * booking.days;

  const depositText = policy
    ? policy.deposit_type === "percent"
      ? `${policy.deposit_value}% giá trị thuê`
      : currency(policy.deposit_value)
    : currency(booking.deposit);

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
            <AccountNav code={code} current="hop-dong" />

            <BookingProgress
              kycStatus={kyc?.status}
              contractSigned={contract?.customer_signed}
              depositStatus={deposit?.status}
            />

            {ky ? <p className="form-message success">Đã ký hợp đồng điện tử.</p> : null}
            {loi ? <p className="form-message error">{loi}</p> : null}

            <div className="card">
              <div className="detail-head">
                <div>
                  <h1>Hợp đồng điện tử</h1>
                  <p className="muted">{contract?.code ?? expectedCode}</p>
                </div>
                <span className={`badge ${signed ? "success" : "warn"}`}>
                  {signed ? "Khách đã ký" : "Chờ khách ký"}
                </span>
              </div>

              <dl className="summary-rows" style={{ marginTop: 16 }}>
                <div>
                  <dt>Bên thuê</dt>
                  <dd>{booking.customer_name}</dd>
                </div>
                <div>
                  <dt>Điện thoại</dt>
                  <dd>{booking.customer_phone}</dd>
                </div>
                <div>
                  <dt>Thời gian thuê</dt>
                  <dd>
                    {dateTime(booking.pickup_at)} → {dateTime(booking.return_at)} ({booking.days} ngày)
                  </dd>
                </div>
                <div>
                  <dt>Xe</dt>
                  <dd>
                    {booking.cars?.brand} {booking.cars?.model} · {booking.cars?.plate}
                  </dd>
                </div>
                <div>
                  <dt>Tiền thuê dự kiến</dt>
                  <dd>{currency(rental)}</dd>
                </div>
                <div>
                  <dt>Tiền cọc</dt>
                  <dd>
                    {currency(booking.deposit)}
                    {policy ? <span className="sub">Theo chính sách: {depositText}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt>Tổng cộng</dt>
                  <dd>{currency(booking.total)}</dd>
                </div>
              </dl>

              <div className="contract-terms">
                <details open>
                  <summary>01 · Xác thực danh tính (eKYC)</summary>
                  <p>
                    Bên thuê cung cấp CCCD gắn chip và GPLX còn hiệu lực để Lái Đi đối chiếu
                    trước khi giao xe. Hồ sơ eKYC được lưu riêng tư.
                  </p>
                </details>
                <details>
                  <summary>02 · Hợp đồng điện tử và chi phí</summary>
                  <p>
                    Tiền thuê {currency(rental)} cho {booking.days} ngày. Tiền cọc{" "}
                    {currency(booking.deposit)} được hoàn lại sau khi đối soát, sau khi trừ phụ
                    phí hoặc bồi thường nếu có.
                  </p>
                </details>
                <details>
                  <summary>03 · Nhận và trả xe</summary>
                  <p>
                    Hai bên đối chiếu hiện trạng xe, ODO, mức pin và phụ kiện khi bàn giao và khi
                    trả xe. Phát sinh hư hỏng được ghi nhận trong biên bản.
                  </p>
                </details>
                <details>
                  <summary>04 · Đổi lịch hoặc hủy chuyến</summary>
                  <p>
                    {policy
                      ? `Hủy trước ${policy.cancel_hours} giờ so với giờ nhận xe được hoàn ${policy.refund_pct}% tiền cọc.`
                      : "Chính sách hủy áp dụng theo phiên bản có hiệu lực tại thời điểm đặt xe."}{" "}
                    Bảo lưu phạt nguội: {currency(policy?.fine_hold ?? 0)}.
                  </p>
                </details>
              </div>

              {signed ? (
                <div className="form-actions">
                  <p className="form-message success" style={{ margin: 0 }}>
                    Đã ký lúc {dateTime(contract?.signed_at)}. Lái Đi sẽ ký duyệt và xác nhận qua
                    điện thoại.
                  </p>
                </div>
              ) : (
                <form action={signMyContractAction}>
                  <input type="hidden" name="code" value={code} />
                  <label className="consent">
                    <input type="checkbox" name="consent" required />
                    <span>
                      Tôi đã đọc và đồng ý với các điều khoản thuê xe, chính sách cọc và hủy
                      chuyến ở trên.
                    </span>
                  </label>
                  <button className="button" type="submit">
                    Xác nhận ký điện tử
                  </button>
                  <p className="field-hint">
                    Chữ ký điện tử ghi nhận thời điểm bạn xác nhận. Hợp đồng chỉ có hiệu lực sau
                    khi Lái Đi ký duyệt.
                  </p>
                </form>
              )}
            </div>
          </div>

          <BookingSummary booking={booking} />
        </div>
      </div>
    </section>
  );
}
