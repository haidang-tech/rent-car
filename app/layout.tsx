import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const beVietnamPro = localFont({
  src: [
    { path: "./fonts/be-vietnam-pro-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/be-vietnam-pro-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/be-vietnam-pro-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/be-vietnam-pro-800.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lái Đi — Thuê ô tô tự lái tại Đà Nẵng",
    template: "%s · Lái Đi",
  },
  description:
    "Lái Đi — thuê ô tô tự lái tại Đà Nẵng. Chọn xe, kiểm tra lịch trống, đặt xe trực tuyến và quản lý chuyến đi của bạn.",
  icons: { icon: "/images/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>{children}</body>
    </html>
  );
}
