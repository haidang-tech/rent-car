"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createBookingAction, type BookingState } from "@/lib/actions/bookings";
import { currency, daysBetween } from "@/lib/format";

type Props = {
  carId: string;
  pricePerDay: number;
  deposit: number;
  locations: string[];
  defaults: { name: string; phone: string; email: string };
};

const localInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function BookingForm({ carId, pricePerDay, deposit, locations, defaults }: Props) {
  const start = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }, []);
  const end = useMemo(() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 3);
    d.setHours(18, 0, 0, 0);
    return d;
  }, [start]);

  const [pickup, setPickup] = useState(localInput(start));
  const [ret, setRet] = useState(localInput(end));
  const [state, formAction, pending] = useActionState<BookingState, FormData>(
    createBookingAction,
    null,
  );

  const days =
    pickup && ret && new Date(ret) > new Date(pickup)
      ? daysBetween(pickup, ret)
      : 1;
  const rental = days * pricePerDay;

  if (state?.success) {
    return (
      <div className="card">
        <h2>Đã gửi yêu cầu đặt xe</h2>
        <p className="form-message success">{state.success}</p>
        <p className="muted" style={{ marginTop: 12 }}>
          Lái Đi sẽ gọi xác nhận trong 15 phút. Bạn có thể theo dõi trạng thái
          đơn trong mục “Đơn của tôi”.
        </p>
        <div className="form-actions">
          <Link className="button" href="/tai-khoan">
            Xem đơn của tôi →
          </Link>
          <Link className="button ghost" href="/xe">
            Chọn xe khác
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="card" action={formAction}>
      <input type="hidden" name="car_id" value={carId} />
      <h2>Đặt xe</h2>
      <p>Điền thông tin, Lái Đi xác nhận qua điện thoại trong 15 phút.</p>

      <div className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">
          <span>Ngày &amp; giờ nhận</span>
          <input
            name="pickup_at"
            type="datetime-local"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Ngày &amp; giờ trả</span>
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
          <select name="pickup_location" defaultValue={locations[0]}>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Họ tên người thuê</span>
          <input name="customer_name" defaultValue={defaults.name} required />
        </label>
        <label className="field">
          <span>Số điện thoại</span>
          <input
            name="customer_phone"
            defaultValue={defaults.phone}
            inputMode="tel"
            required
          />
        </label>
        <label className="field full">
          <span>Email</span>
          <input name="customer_email" type="email" defaultValue={defaults.email} />
        </label>
        <label className="field full">
          <span>Ghi chú</span>
          <textarea
            name="note"
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
          <span>Tổng thanh toán</span>
          <span>{currency(rental + deposit)}</span>
        </div>
      </div>

      {state?.error ? <p className="form-message error">{state.error}</p> : null}

      <button className="button" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Đang gửi…" : "Gửi yêu cầu đặt xe →"}
      </button>
      <p className="field-hint" style={{ marginTop: 10 }}>
        Bạn chưa bị trừ tiền ở bước này. Lái Đi xác nhận lịch xe trước khi thanh
        toán.
      </p>
    </form>
  );
}
