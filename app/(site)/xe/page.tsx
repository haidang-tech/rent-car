import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CarCard, type CarCardData } from "@/components/car-card";
import { validateDates } from "@/lib/validation";
import { parseVnDateTimeLocal, vnDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata = { title: "Đội xe" };

type Search = {
  location?: string;
  pickup?: string;
  return?: string;
  seats?: string;
  fuel?: string;
  sort?: string;
};

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: locations, error: locationError } = await supabase.from("locations").select("id,name").eq("active", true).order("name");
  const selectedLocation = params.location ? locations?.find(location => location.id === params.location || location.name === params.location) : null;
  const hasWindow = Boolean(params.pickup || params.return);
  let problem = hasWindow ? validateDates(params.pickup ?? "", params.return ?? "", vnDateKey(new Date())) : null;
  if (locationError) problem = "Không tải được địa điểm nhận xe. Vui lòng thử lại.";
  else if (params.location && !selectedLocation) problem = "Địa điểm nhận xe không hợp lệ hoặc đã ngừng hoạt động.";

  let query = supabase
    .from("cars")
    .select(
      "id, code, plate, brand, model, category, seats, transmission, fuel, price_per_day, deposit, status, image_url, rating",
    )
    .in("status", ["available", "rented"]);

  if (params.seats && ["5", "7"].includes(params.seats)) query = query.gte("seats", Number(params.seats));
  if (selectedLocation) query = query.eq("location_id", selectedLocation.id);
  if (params.fuel) query = query.eq("fuel", params.fuel);
  query =
    params.sort === "price-desc"
      ? query.order("price_per_day", { ascending: false })
      : query.order("price_per_day");

  const { data, error } = await query;
  if (error) problem = "Không tải được danh sách xe. Vui lòng thử lại.";
  let cars = (data ?? []) as CarCardData[];

  if (hasWindow && !problem) {
    const pickup = parseVnDateTimeLocal(`${params.pickup}T00:00`)!;
    const ret = parseVnDateTimeLocal(`${params.return}T00:00`)!;
    const checks = await Promise.all(
      cars.map(async (car) => {
        const { data: free, error } = await supabase.rpc("is_car_available", {
          p_car_id: car.id,
          p_pickup: pickup,
          p_return: ret,
        });
        return { car, free: free === true, error: Boolean(error) || typeof free !== "boolean" };
      }),
    );
    if (checks.some(check => check.error)) problem = "Chưa kiểm tra được lịch trống. Vui lòng thử lại.";
    cars = checks.filter((c) => c.free).map((c) => c.car);
  }
  if (problem) cars = [];

  const days =
    !problem && params.pickup && params.return
      ? Math.max(
          1,
          Math.ceil(
            (new Date(params.return).getTime() - new Date(params.pickup).getTime()) /
              86_400_000,
          ),
        )
      : 0;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span>Đội xe</span>
          </div>
          <h1>Đội xe Lái Đi</h1>
          <p>
            {problem ? "Chọn lại bộ lọc hoặc thử lại để kiểm tra lịch xe." : hasWindow
              ? `${cars.length} xe còn trống cho ${params.pickup} → ${params.return} (${days} ngày).`
              : "Xe điện VinFast đời mới tại Đà Nẵng. Chọn ngày để kiểm tra lịch trống chính xác."}
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <form className="search-panel" action="/xe" method="get" style={{ marginBottom: 28 }}>
            <div className="search-fields">
              <label className="field">
                <span>Địa điểm</span>
                <select name="location" defaultValue={selectedLocation?.id ?? ""}>
                  <option value="">Tất cả địa điểm</option>
                  {(locations ?? []).map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Ngày nhận</span>
                <input name="pickup" type="date" defaultValue={params.pickup} />
              </label>
              <label className="field">
                <span>Ngày trả</span>
                <input name="return" type="date" defaultValue={params.return} />
              </label>
              <label className="field">
                <span>Số chỗ</span>
                <select name="seats" defaultValue={params.seats ?? ""}>
                  <option value="">Tất cả</option>
                  <option value="5">5 chỗ</option>
                  <option value="7">7 chỗ</option>
                </select>
              </label>
              <label className="field">
                <span>Nhiên liệu</span>
                <select name="fuel" defaultValue={params.fuel ?? ""}>
                  <option value="">Tất cả</option>
                  <option value="electric">Điện</option>
                  <option value="petrol">Xăng</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              <label className="field">
                <span>Sắp xếp</span>
                <select name="sort" defaultValue={params.sort ?? "price-asc"}>
                  <option value="price-asc">Giá thấp → cao</option>
                  <option value="price-desc">Giá cao → thấp</option>
                </select>
              </label>
              <button className="button" type="submit">
                Lọc xe
              </button>
            </div>
          </form>

          {problem ? <p className="form-message error" role="alert">{problem}</p> : cars.length ? (
            <div className="fleet-grid">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center" }}>
              <h2>Không tìm thấy xe phù hợp</h2>
              <p>Thử đổi ngày thuê hoặc bỏ bớt bộ lọc để xem toàn bộ đội xe.</p>
              <Link className="button" href="/xe" style={{ marginTop: 16 }}>
                Xem tất cả xe
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
