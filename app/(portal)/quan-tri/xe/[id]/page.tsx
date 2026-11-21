import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { CarForm } from "@/components/car-form";

export const dynamic = "force-dynamic";

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: car } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (!car) notFound();

  const [{ data: bookings }, { data: location }] = await Promise.all([
    supabase
      .from("bookings")
      .select("code, pickup_at, status")
      .eq("car_id", id)
      .in("status", ["pending", "confirmed", "signed", "handed_over"])
      .order("pickup_at")
      .limit(4),
    car.location_id
      ? supabase.from("locations").select("name").eq("id", car.location_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const { data: checkRows } = await supabase
    .from("vehicle_checks")
    .select("kind, odometer, created_at, booking_id")
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: carBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("car_id", id);
  const carBookingIds = new Set((carBookings ?? []).map((b) => b.id));
  const checks = (checkRows ?? []).filter((check) => carBookingIds.has(check.booking_id)).slice(0, 1);

  return (
    <>
      <PortalTopbar label="Sửa thông tin xe" />
      <div className="page-head">
        <div>
          <h1>
            Sửa thông tin xe · {car.plate}
          </h1>
          <p>
            {car.brand} {car.model} · {car.code}
          </p>
        </div>
        <div className="actions">
          <Link className="button ghost" href="/quan-tri/xe">
            ← Danh mục xe
          </Link>
        </div>
      </div>

      <div className="portal-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Thông tin phương tiện</h2>
          </div>
          <CarForm car={car} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Lịch và lịch sử</h2>
          </div>
          <div className="detail-list">
            <div>
              <span>ODO hiện tại</span>
              <span>{Number(car.odometer).toLocaleString("vi-VN")} km</span>
            </div>
            <div>
              <span>Mức pin</span>
              <span>{car.battery}%</span>
            </div>
            <div>
              <span>Điểm nhận xe</span>
              <span>{location?.name ?? "Chưa gán điểm"}</span>
            </div>
            <div>
              <span>Đơn sắp tới</span>
              <span>{bookings?.length ?? 0}</span>
            </div>
            <div>
              <span>Lần kiểm tra gần nhất</span>
              <span>{checks?.length ? checks[0].kind : "—"}</span>
            </div>
          </div>
          {bookings?.length ? (
            <div className="timeline">
              {bookings.map((b) => (
                <div className="timeline-item" key={b.code}>
                  <time>{b.pickup_at.slice(0, 10)}</time>
                  <span>
                    {b.code} · {b.status}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
