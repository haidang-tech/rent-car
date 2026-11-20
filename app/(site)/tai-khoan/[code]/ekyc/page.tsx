import Link from "next/link";
import { getBookingContext } from "@/lib/booking-queries";
import { submitKycAction } from "@/lib/actions/customer";
import { AccountNav, BookingProgress, BookingSummary } from "@/components/account-shell";
import { UploadField } from "@/components/upload-field";
import { createSignedUrls } from "@/lib/storage";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Xác thực eKYC" };

const STATUS_TEXT: Record<string, string> = {
  pending: "Hồ sơ đã gửi, đang chờ nhân viên Lái Đi duyệt.",
  verified: "Danh tính đã được xác thực.",
  rejected: "Hồ sơ bị từ chối. Vui lòng tải lại ảnh rõ nét hơn.",
};

export default async function EkycPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ gui?: string; loi?: string }>;
}) {
  const { code } = await params;
  const { gui, loi } = await searchParams;
  const { supabase, booking, kyc, contract, deposit } = await getBookingContext(code);
  const urls = await createSignedUrls(supabase, "kyc", [
    kyc?.id_front_path,
    kyc?.id_back_path,
    kyc?.license_path,
    kyc?.selfie_path,
  ]);
  const locked = booking.status === "handed_over" || booking.status === "returned" || booking.status === "completed" || booking.status === "cancelled";

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
            <AccountNav code={code} current="ekyc" />

            <BookingProgress
              kycStatus={kyc?.status}
              contractSigned={contract?.customer_signed}
              depositStatus={deposit?.status}
            />

            {gui ? <p className="form-message success">Đã gửi hồ sơ eKYC, chờ nhân viên duyệt.</p> : null}
            {loi ? <p className="form-message error">{loi}</p> : null}

            {kyc ? (
              <p className={`form-message ${kyc.status === "rejected" ? "error" : "success"}`}>
                {STATUS_TEXT[kyc.status] ?? kyc.status}
                {kyc.note ? ` Ghi chú: ${kyc.note}` : ""} · Gửi lúc {dateTime(kyc.created_at)}
              </p>
            ) : null}

            <form className="card" action={submitKycAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="code" value={code} />
              <h2>Xác thực danh tính (eKYC)</h2>
              <p>
                Tải ảnh chụp rõ nét, không chói sáng. Ảnh được lưu riêng tư và chỉ nhân viên
                Lái Đi xem được để duyệt hồ sơ.
              </p>

              <div className="upload-grid">
                <UploadField
                  name="id_front_path"
                  label="Ảnh mặt trước CCCD"
                  bucket="kyc"
                  required
                  defaultValue={kyc?.id_front_path}
                  hint="Thấy rõ số CCCD và ngày cấp."
                />
                <UploadField
                  name="id_back_path"
                  label="Ảnh mặt sau CCCD"
                  bucket="kyc"
                  required
                  defaultValue={kyc?.id_back_path}
                />
                <UploadField
                  name="license_path"
                  label="Giấy phép lái xe (GPLX)"
                  bucket="kyc"
                  required
                  defaultValue={kyc?.license_path}
                />
                <UploadField
                  name="selfie_path"
                  label="Ảnh khuôn mặt"
                  bucket="kyc"
                  required
                  defaultValue={kyc?.selfie_path}
                  hint="Chụp chính diện, đủ sáng."
                />
              </div>

              {kyc?.id_front_path ? (
                <details className="upload-details">
                  <summary>Ảnh đã tải lên</summary>
                  <div className="upload-gallery">
                    {[
                      ["Mặt trước CCCD", kyc.id_front_path],
                      ["Mặt sau CCCD", kyc.id_back_path],
                      ["GPLX", kyc.license_path],
                      ["Khuôn mặt", kyc.selfie_path],
                    ].map(([label, path]) =>
                      path ? (
                        <figure key={label}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urls[path] || ""} alt={label} />
                          <figcaption>{label}</figcaption>
                        </figure>
                      ) : null,
                    )}
                  </div>
                </details>
              ) : null}

              <p className="field-hint" style={{ marginTop: 12 }}>
                Ảnh chỉ dùng để đối chiếu khi giao xe. Bạn cần mang bản gốc CCCD và GPLX khi
                nhận xe.
              </p>

              <button className="button" type="submit" disabled={locked}>
                {kyc?.status === "verified" ? "Gửi lại hồ sơ" : "Gửi xác thực"}
              </button>
              {locked ? <p className="field-hint">Đơn đã qua bước nhận xe, không thể sửa hồ sơ.</p> : null}
            </form>
          </div>

          <BookingSummary booking={booking} />
        </div>
      </div>
    </section>
  );
}
