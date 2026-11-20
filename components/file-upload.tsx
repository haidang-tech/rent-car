"use client";
import { useEffect, useRef, useState } from "react";
import { IMAGE_ACCEPT, validateImage } from "@/lib/validation";
export function FileUpload({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <div className="upload-field"><label htmlFor={name}>{label}{required ? " *" : ""}</label><input id={name} ref={input} name={name} type="file" accept={IMAGE_ACCEPT} required={required} aria-describedby={`${name}-help`} onChange={event => {
    const file = event.target.files?.[0];
    const message = file ? validateImage(file) : null;
    event.target.setCustomValidity(message || ""); setError(message || "");
    setPreview(file && !message ? URL.createObjectURL(file) : "");
  }} /><small id={`${name}-help`}>JPG, PNG, WebP · tối đa 5 MB. Ảnh được tải lên khi gửi biểu mẫu.</small>{error && <p role="alert" className="form-message error">{error}</p>}{preview && <div className="upload-preview">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt={`Xem trước ${label}`} /><button type="button" className="button ghost small" onClick={() => { if (input.current) { input.current.value = ""; input.current.setCustomValidity(""); } setPreview(""); setError(""); }}>Bỏ ảnh</button></div>}</div>;
}
