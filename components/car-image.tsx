"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function CarImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const safe = src && (/^\/(?!\/)/.test(src) || /^https?:\/\//.test(src));
  const actual = safe && failed !== src ? src : "/images/vf5.png";
  return <Image {...props} alt={alt} src={actual} unoptimized={actual.startsWith("http")} onError={() => setFailed(src ?? "")} />;
}
