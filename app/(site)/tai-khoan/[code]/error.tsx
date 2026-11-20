"use client";
export default function TripError({ reset }: { reset: () => void }) {
  return <div className="container section"><h1>Chưa tải được hồ sơ chuyến thuê</h1><p>Vui lòng thử lại. Nếu lỗi vẫn còn, liên hệ cơ sở để kiểm tra kết nối hệ thống.</p><button className="button" onClick={reset}>Thử lại</button></div>;
}
