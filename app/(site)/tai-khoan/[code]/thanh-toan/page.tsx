import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { requestDepositAction } from "@/lib/actions/customer";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thanh toán cọc" };

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt tại quầy",
  transfer: "Chuyển khoản ngân hàng",
  card: "Thẻ tại quầy",
};

const PAYMENT_LABEL: Record<string, string> = {
  deposit: "Cọc",
  rental: "Tiền thuê",
  refund: "Hoàn cọc",
  expense: "Chi phí",
  penalty: "Phụ phí",
};

export default async function DepositPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ gui?: string; loi?: string }>;
}) {
  const { code } = await params;
  const { gui, loi } = await searchParams;
  const { booking, deposit, payments, kyc, contract } = await getBookingContext(code);
  const blocked = booking.status === "cancelled" || booking.status === "completed";

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
            <AccountNav code={code} current="thanh-toan" />

            <BookingProgress
              kycStatus={kyc?.status}
              contractSigned={contract?.customer_signed}
              depositStatus={deposit?.status}
            />

            {gui ? (
              <p className="form-message success">
                Đã ghi nhận yêu cầu đặt cọc. Kế toán Lái Đi sẽ xác nhận giao dịch.
              </p>
            ) : null}
            {loi ? <p className="form-message error">{loi}</p> : null}

            <div className="card">
              <h1 style={{ fontSize: 26 }}>Thanh toán tiền cọc</h1>
              <p className="muted">
                Tiền cọc được hoàn lại sau khi đối soát chuyến đi, sau khi trừ phụ phí nếu có.
              </p>

              <div className="deposit-amount">
                <span>Số tiền cọc</span>
                <strong>{currency(booking.deposit)}</strong>
                <small>Đơn {booking.code}</small>
              </div>

              {deposit ? (
                <div>
                  <dl className="summary-rows">
                    <div>
                      <dt>Mã phiếu</dt>
                      <dd>{deposit.code}</dd>
                    </div>
                    <div>
                      <dt>Phương thức</dt>
                      <dd>{METHOD_LABEL[deposit.method] ?? deposit.method}</dd>
                    </div>
                    <div>
                      <dt>Trạng thái</dt>
                      <dd>
                        <span className={`badge ${deposit.status === "paid" ? "success" : "warn"}`}>
                          {deposit.status === "paid" ? "Đã nhận cọc" : "Chờ kế toán xác nhận"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Thời điểm</dt>
                      <dd>{dateTime(deposit.paid_at ?? deposit.created_at)}</dd>
                    </div>
                  </dl>
                  {deposit.status === "pending" ? (
                    <p className="notice" style={{ marginTop: 14 }}>
                      Phiếu cọc đã được tạo. Chuyển khoản hoặc thanh toán tại quầy theo hướng dẫn
                      của nhân viên, kế toán sẽ xác nhận trên hệ thống.
                    </p>
                  ) : null}
                </div>
              ) : blocked ? (
                <p className="notice">Đơn này không thể đặt cọc.</p>
              ) : (
                <form action={requestDepositAction}>
                  <input type="hidden" name="code" value={code} />
                  <h2 style={{ fontSize: 17, marginTop: 20 }}>Phương thức thanh toán</h2>
                  <div className="choice-cards">
                    {[
                      ["transfer", "Chuyển khoản", "Chuyển đúng số tiền cọc, ghi mã đơn trong nội dung."],
                      ["card", "Thẻ tại quầy", "Thanh toán khi ký hợp đồng tại văn phòng."],
                      ["cash", "Tiền mặt", "Thanh toán trực tiếp khi nhận xe."],
                    ].map(([value, label, hint]) => (
                      <label className="choice-card" key={value}>
                        <input type="radio" name="method" value={value} defaultChecked={value === "transfer"} />
                        <span>
                          <strong>{label}</strong>
                          <small>{hint}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="field-hint" style={{ marginTop: 12 }}>
                    Cổng thanh toán trực tuyến chưa được kết nối. Không nhập thông tin thẻ trên
                    trang này.
                  </p>
                  <button className="button" type="submit">
                    Tạo yêu cầu đặt cọc
                  </button>
                </form>
              )}
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <h2>Lịch sử giao dịch</h2>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Phiếu</th>
                      <th>Loại</th>
                      <th>Phương thức</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length ? (
                      payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="strong">{payment.code}</td>
                          <td>{PAYMENT_LABEL[payment.type] ?? payment.type}</td>
                          <td>{METHOD_LABEL[payment.method] ?? payment.method}</td>
                          <td>{currency(payment.amount)}</td>
                          <td>
                            <span
                              className={`badge ${
                                payment.status === "paid"
                                  ? "success"
                                  : payment.status === "cancelled"
                                    ? "danger"
                                    : "warn"
                              }`}
                            >
                              {payment.status === "paid"
                                ? "Đã thanh toán"
                                : payment.status === "cancelled"
                                  ? "Đã hủy"
                                  : "Chờ xử lý"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty">
                          Chưa có giao dịch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <BookingSummary booking={booking} />
        </div>
      </div>
    </section>
  );
}
