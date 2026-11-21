"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createBookingAction, type BookingState } from "@/lib/actions/bookings";
import { currency, daysBetween } from "@/lib/format";
import { parseVnDateTimeLocal } from "@/lib/time";
import { validateDateWindow } from "@/lib/validation";

type Props = {
  carId: string;
  pricePerDay: number;
  deposit: number;
  locations: string[];
  locationError?: string;
  signedIn?: boolean;
  unavailable?: boolean;
  loginNext?: string;
  initialDates: { pickup: string; return: string };
  defaults: { name: string; phone: string; email: string };
};

export function BookingForm({ carId, pricePerDay, deposit, locations, locationError, defaults, initialDates, signedIn = false, unavailable = false, loginNext = "/xe" }: Props) {
  const [pickup, setPickup] = useState(initialDates.pickup);
  const [ret, setRet] = useState(initialDates.return);
  const [state, formAction, pending] = useActionState<BookingState, FormData>(
    createBookingAction,
    null,
  );

  const pickupIso = parseVnDateTimeLocal(pickup);
  const returnIso = parseVnDateTimeLocal(ret);
  const dateError = validateDateWindow(pickupIso ?? "", returnIso ?? "") ||
    (pickupIso && returnIso && daysBetween(pickupIso, returnIso) > 30 ? "Thời gian thuê tối đa 30 ngày." : null);
  const days = !dateError && pickupIso && returnIso ? daysBetween(pickupIso, returnIso) : 0;
  const rental = days * pricePerDay;

  if (state?.success) {
    return (
      <div className="card">
        <h2>Đã gửi yêu cầu đặt xe</h2>
        <p className="form-message success">{state.success}</p>
        <p className="muted" style={{ marginTop: 12 }}>
          {signedIn ? "Lái Đi sẽ gọi xác nhận. Bạn có thể theo dõi trạng thái đơn trong mục “Đơn của tôi”." : "Lái Đi sẽ liên hệ theo số điện thoại bạn đã cung cấp. Hãy lưu mã đơn để trao đổi với cơ sở; đơn khách vãng lai chưa được liên kết với tài khoản."}
        </p>
        <div className="form-actions">
          {signedIn && <Link className="button" href="/tai-khoan">
            Xem đơn của tôi →
          </Link>}
          <Link className="button ghost" href="/xe">
            Chọn xe khác
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="card" action={formAction} onSubmit={event => { if (dateError || unavailable) event.preventDefault(); }}>
      <input type="hidden" name="car_id" value={carId} />
      <h2>Đặt xe</h2>
      <p>Điền thông tin, Lái Đi xác nhận qua điện thoại trong 15 phút.</p>

      <div className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">
          <span>Ngày &amp; giờ nhận (Việt Nam)</span>
          <input
            name="pickup_at"
            type="datetime-local"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Ngày &amp; giờ trả (Việt Nam)</span>
          <input
            name="return_at"
            type="datetime-local"
            value={ret}
            onChange={(e) => setRet(e.target.value)}
            required
          />
        </label>
        <label className="field full">
          <span>Điểm nhận xe</span>
          <select name="pickup_location" defaultValue={locations[0] ?? ""} required disabled={!locations.length}>
            {!locations.length ? <option value="">Chưa có điểm nhận đang hoạt động</option> : null}
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Họ tên người thuê</span>
          <input name="customer_name" defaultValue={defaults.name} minLength={2} maxLength={120} required />
        </label>
        <label className="field">
          <span>Số điện thoại</span>
          <input
            name="customer_phone"
            defaultValue={defaults.phone}
            inputMode="tel"
            pattern="(0[0-9]{9}|\+84[0-9]{9})"
            title="Số điện thoại gồm 10 chữ số bắt đầu bằng 0 hoặc +84 và 9 chữ số."
            required
          />
        </label>
        <label className="field full">
          <span>Email</span>
          <input name="customer_email" type="email" maxLength={254} defaultValue={defaults.email} />
        </label>
        <label className="field full">
          <span>Ghi chú</span>
          <textarea
            name="note"
            maxLength={2000}
            placeholder="Giờ hạ cánh, khách sạn nhận xe, yêu cầu thêm…"
          />
        </label>
      </div>

      <div className="price-summary">
        <div>
          <span>
            {currency(pricePerDay)} × {days} ngày
          </span>
          <span>{currency(rental)}</span>
        </div>
        <div>
          <span>Tiền cọc (hoàn sau chuyến)</span>
          <span>{currency(deposit)}</span>
        </div>
        <div className="total">
          <span>Tổng dự kiến</span>
          <span>{currency(rental + deposit)}</span>
        </div>
      </div>

      {state?.error ? <p className="form-message error">{state.error}</p> : null}
      {dateError ? <p className="form-message error" role="alert">{dateError}</p> : null}
      {unavailable ? <p className="form-message error" role="status">Xe hiện không nhận đặt chỗ. Vui lòng chọn xe khác.</p> : null}
      {locationError ? <p className="form-message error" role="alert">Không tải được địa điểm nhận xe. Vui lòng thử lại sau.</p> : !locations.length ? <p className="form-message error" role="status">Hiện chưa có điểm nhận đang hoạt động. Chưa thể gửi yêu cầu thuê.</p> : null}

      <button className="button" type="submit" disabled={pending || unavailable || Boolean(dateError) || !locations.length || Boolean(locationError)} style={{ width: "100%" }}>
        {pending ? "Đang gửi…" : "Gửi yêu cầu đặt xe →"}
      </button>
      {!signedIn && <p className="field-hint"><Link href={`/dang-nhap?next=${encodeURIComponent(loginNext)}`}>Đăng nhập</Link> trước khi đặt để quản lý chuyến trực tuyến.</p>}
      <p className="field-hint" style={{ marginTop: 10 }}>
        Bạn chưa bị trừ tiền ở bước này. Lái Đi xác nhận lịch xe trước khi thanh
        toán.
      </p>
    </form>
  );
}
