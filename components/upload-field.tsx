"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_ACCEPT, validateImage } from "@/lib/validation";

type Props = {
  name: string;
  label: string;
  bucket: "kyc" | "review-photos" | "incident-photos";
  required?: boolean;
  hint?: string;
  defaultValue?: string | null;
};

const baseName = (path: string) => path.split("/").pop() ?? path;

export function UploadField({ name, label, bucket, required, hint, defaultValue }: Props) {
  const [path, setPath] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedName, setSavedName] = useState(defaultValue ? baseName(defaultValue) : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function releasePreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
  }

  function reset() {
    releasePreview();
    setPath("");
    setSavedName("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const message = validateImage(file);
    if (message) {
      setError(message);
      reset();
      return;
    }

    setError(null);
    releasePreview();
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setBusy(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Phiên đăng nhập đã hết, vui lòng đăng nhập lại.");

      const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(-60);
      const objectPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      setPath(objectPath);
      setSavedName(file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Tải ảnh thất bại.");
      reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-field">
      <span className="upload-label">
        {label}
        {required ? " *" : null}
      </span>
      <input type="hidden" name={name} value={path} />
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleChange}
        aria-label={label}
      />
      {preview ? (
        <div className="upload-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`Xem trước ${label}`} />
          <button type="button" className="chip" onClick={reset}>
            Bỏ ảnh
          </button>
        </div>
      ) : null}
      {!preview && path ? (
        <div className="upload-saved">
          <span className="badge success">Đã tải lên</span>
          <span className="muted small">{savedName}</span>
        </div>
      ) : null}
      {busy ? <span className="field-hint">Đang tải ảnh…</span> : null}
      {error ? <p className="form-message error">{error}</p> : null}
      {hint && !error ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
