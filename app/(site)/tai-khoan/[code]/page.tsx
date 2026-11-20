import Image from "next/image";
import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { BOOKING_STATUS, currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { booking, contract, kyc, deposit, requests, review } = await getBookingContext(code);
  const car = booking.cars;

  const nextSteps: { href: string; label: string; primary?: boolean }[] = [];
  if (kyc?.status !== "verified") nextSteps.push({ href: `ekyc`, label: "Xác thực eKYC", primary: true });
  if (!contract?.customer_signed) nextSteps.push({ href: "hop-dong", label: "Ký hợp đồng" });
  if (deposit?.status !== "paid") nextSteps.push({ href: "thanh-toan", label: "Thanh toán cọc" });
  if (booking.status === "completed" && !review) {
    nextSteps.push({ href: "danh-gia", label: "Đánh giá chuyến đi" });
  }

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div className="container">
        <div className="crumbs">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/tai-khoan">Đơn của tôi</Link>
          <span>/</span>
          <span>{booking.code}</span>
        </div>

        <div className="account-detail-grid">
          <div>
            <AccountNav code={code} current="" />

            <div className="card">
              <div className="detail-head">
                <div>
                  <h1>
                    {car?.brand} {car?.model}
                  </h1>
                  <p className="muted">
                    {car?.plate} · {car?.seats} chỗ ·{" "}
                    {car?.transmission === "manual" ? "Số sàn" : "Tự động"} · Mã đơn {booking.code}
                  </p>
                </div>
                <span className={`badge ${BOOKING_STATUS[booking.status]?.tone ?? "muted"}`}>
                  {BOOKING_STATUS[booking.status]?.label ?? booking.status}
                </span>
              </div>

              {car?.image_url ? (
                <Image
                  className="trip-image"
                  src={car.image_url}
                  alt={`${car.brand} ${car.model}`}
                  width={1050}
                  height={590}
                />
              ) : null}

              <h2 style={{ fontSize: 18, marginTop: 22 }}>Tiến độ thủ tục</h2>
              <BookingProgress
                kycStatus={kyc?.status}
                contractSigned={contract?.customer_signed}
                depositStatus={deposit?.status}
              />

              <div className="next-steps">
                {nextSteps.map((step) =>
                  step.primary ? (
                    <Link key={step.href} className="button" href={`/tai-khoan/${code}/${step.href}`}>
                      {step.label} →
                    </Link>
                  ) : (
                    <Link key={step.href} className="button ghost" href={`/tai-khoan/${code}/${step.href}`}>
                      {step.label}
                    </Link>
                  ),
                )}
                <Link className="button ghost" href={`/tai-khoan/${code}/su-co`}>
                  Báo sự cố
                </Link>
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <h2>Lịch trình</h2>
              <dl className="summary-rows">
                <div>
                  <dt>Nhận xe</dt>
                  <dd>{dateTime(booking.pickup_at)}</dd>
                </div>
                <div>
                  <dt>Trả xe</dt>
                  <dd>{dateTime(booking.return_at)}</dd>
                </div>
                <div>
                  <dt>Điểm nhận</dt>
                  <dd>{booking.pickup_location}</dd>
                </div>
                <div>
                  <dt>Người thuê</dt>
                  <dd>
                    {booking.customer_name} · {booking.customer_phone}
                  </dd>
                </div>
                <div>
                  <dt>Tiền thuê</dt>
                  <dd>
                    {currency(booking.unit_price)} × {booking.days} ngày
                  </dd>
                </div>
                <div>
                  <dt>Tiền cọc</dt>
                  <dd>{currency(booking.deposit)}</dd>
                </div>
                {booking.note ? (
                  <div>
                    <dt>Ghi chú</dt>
                    <dd>{booking.note}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {requests.length ? (
              <div className="card" style={{ marginTop: 18 }}>
                <h2>Yêu cầu đã gửi</h2>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Loại</th>
                        <th>Nội dung</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td className="strong">{request.code}</td>
                          <td>
                            {request.kind === "extension"
                              ? "Gia hạn"
                              : request.kind === "exchange"
                                ? "Đổi xe"
                                : "Hủy chuyến"}
                          </td>
                          <td>
                            {request.desired_return_at
                              ? dateTime(request.desired_return_at)
                              : request.reason ?? "—"}
                            {request.fee ? <span className="sub">{currency(request.fee)}</span> : null}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                request.status === "approved"
                                  ? "success"
                                  : request.status === "rejected"
                                    ? "danger"
                                    : "warn"
                              }`}
                            >
                              {request.status === "approved"
                                ? "Đã duyệt"
                                : request.status === "rejected"
                                  ? "Từ chối"
                                  : "Chờ duyệt"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <BookingSummary booking={booking} />
        </div>
      </div>
    </section>
  );
}
