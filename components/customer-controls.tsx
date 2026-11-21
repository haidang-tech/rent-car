"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { vnDateTimeInput } from "@/lib/time";
export function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="button" type="submit" disabled={disabled || pending}>{pending ? "Đang gửi…" : children}</button>;
}
export function ContractConsent({ disabled }: { disabled: boolean }) {
  const [accepted, setAccepted] = useState(false);
  return <><label className="consent"><input name="accept" type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />Tôi đã đọc và đồng ý thông tin chuyến thuê, chi phí và điều kiện hiển thị.</label><SubmitButton disabled={disabled || !accepted}>Xác nhận đồng ý điện tử</SubmitButton></>;
}
export function ExtensionDate({ current }: { current: string }) {
  const toInput = vnDateTimeInput;
  const [value, setValue] = useState("");
  return <><div className="day-options">{[1,2,3].map(days => <button className="chip" key={days} type="button" onClick={() => setValue(toInput(new Date(new Date(current).getTime() + days * 86400000)))}>+{days} ngày</button>)}</div><label className="field"><span>Thời gian trả mới (giờ Việt Nam)</span><input type="datetime-local" name="desired_return_at" required min={toInput(new Date(new Date(current).getTime()+60000))} value={value} onChange={e => setValue(e.target.value)} /></label></>;
}
export function StarRating({ name, label }: { name: string; label: string }) {
  const [rating, setRating] = useState(0);
  return <fieldset className="star-rating"><legend>{label}</legend>{[1,2,3,4,5].map(n => <label key={n} className={n<=rating ? "selected" : ""}><input type="radio" name={name} value={n} required checked={rating===n} onChange={() => setRating(n)} aria-label={`${n} sao`} /><span aria-hidden="true">★</span></label>)}</fieldset>;
}
