import Image from "next/image";
import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { requestExchangeAction } from "@/lib/actions/customer";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yêu cầu đổi xe" };

export default async function ExchangePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ gui?: string; loi?: string }>;
}) {
  const { code } = await params;
  const { gui, loi } = await searchParams;
  const { supabase, booking, kyc, contract, deposit, requests } = await getBookingContext(code);

  const { data: cars } = await supabase
    .from("cars")
    .select("id, brand, model, category, plate, seats, price_per_day, image_url")
    .in("status", ["available", "rented"])
    .neq("id", booking.car_id)
    .order("price_per_day");

  const pending = requests.find((r) => r.kind === "exchange" && r.status === "pending");
  const allowed = ["confirmed", "signed", "handed_over"].includes(booking.status);

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
            <AccountNav code={code} current="doi-xe" />

            <BookingProgress
              kycStatus={kyc?.status}
              contractSigned={contract?.customer_signed}
              depositStatus={deposit?.status}
            />

            {gui ? (
              <p className="form-message success">Đã gửi yêu cầu đổi xe, chờ nhân viên duyệt.</p>
            ) : null}
            {loi ? <p className="form-message error">{loi}</p> : null}

            {pending ? (
              <div className="notice">
                Yêu cầu {pending.code} đang chờ duyệt · {dateTime(pending.created_at)}
              </div>
            ) : null}

            <div className="card">
              <h1 style={{ fontSize: 26 }}>Đổi sang xe khác</h1>
              <p className="muted">
                Chọn mẫu xe còn khai thác. Nhân viên sẽ kiểm tra lịch trống và xác nhận chênh
                lệch giá trước khi đổi.
              </p>

              <p className="small muted" style={{ marginTop: 10 }}>
                Xe hiện tại: {booking.cars?.brand} {booking.cars?.model} · {booking.cars?.plate}
              </p>

              {allowed && cars?.length ? (
                <form action={requestExchangeAction}>
                  <input type="hidden" name="code" value={code} />
                  <div className="exchange-grid">
                    {cars.map((car) => (
                      <label className="exchange-option" key={car.id}>
                        <input type="radio" name="car_id" value={car.id} required />
                        <Image
                          src={car.image_url || "/images/vf5.png"}
                          alt={`${car.brand} ${car.model}`}
                          width={480}
                          height={270}
                        />
                        <span>
                          <strong>
                            {car.brand} {car.model}
                          </strong>
                          <small>
                            {car.category} · {car.seats} chỗ · {currency(car.price_per_day)}/ngày
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <label className="field" style={{ marginTop: 16 }}>
                    <span>Lý do đổi xe</span>
                    <textarea name="reason" placeholder="Cần thêm chỗ, thêm khoang hành lý…" />
                  </label>
                  <div className="form-actions">
                    <button className="button" type="submit">
                      Gửi yêu cầu đổi xe
                    </button>
                  </div>
                  <p className="field-hint">
                    Chênh lệch giá và phụ lục hợp đồng được xác nhận trước khi đổi xe.
                  </p>
                </form>
              ) : (
                <p className="notice" style={{ marginTop: 16 }}>
                  {allowed ? "Hiện không còn xe khác để đổi." : "Chỉ đơn đã xác nhận hoặc đang thuê mới có thể đổi xe."}
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
