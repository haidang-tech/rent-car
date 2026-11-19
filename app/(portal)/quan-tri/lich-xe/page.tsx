import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 34);

  const [{ data: bookings }, { data: cars }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, code, pickup_at, return_at, status, customer_name, cars(model, plate)")
      .in("status", ["pending", "confirmed", "signed", "handed_over"])
      .gte("return_at", start.toISOString())
      .lte("pickup_at", end.toISOString())
      .order("pickup_at"),
    supabase.from("cars").select("id, model, plate, status, image_url").order("model"),
  ]);

  const dow = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const cells: { date: Date; inMonth: boolean }[] = [];
  const cursor = new Date(start);
  const offset = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - offset);
  for (let i = 0; i < 35; i += 1) {
    cells.push({ date: new Date(cursor), inMonth: cursor.getMonth() === start.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const eventsByDay = new Map<string, string[]>();
  (bookings ?? []).forEach((b) => {
    const begin = new Date(b.pickup_at);
    const finish = new Date(b.return_at);
    for (let d = new Date(begin); d <= finish; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d);
      const label = `${(b.cars as { model?: string } | null)?.model ?? "Xe"} · ${b.customer_name.split(" ").slice(-1)[0]}`;
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), label]);
    }
  });

  return (
    <>
      <PortalTopbar label="Lịch điều phối" />
      <div className="page-head">
        <div>
          <h1>Lịch điều phối xe</h1>
          <p>5 tuần tới · {(bookings ?? []).length} đơn đang hoạt động</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h2>Lịch theo ngày</h2>
          <div className="filters">
            <span className="chip active">Đơn đang hoạt động</span>
          </div>
        </div>
        <div className="calendar-grid">
          {dow.map((d) => (
            <div className="dow" key={d}>{d}</div>
          ))}
          {cells.map(({ date, inMonth }) => {
            const key = dayKey(date);
            const events = eventsByDay.get(key) ?? [];
            const isToday = key === dayKey(new Date());
            return (
              <div className={`calendar-cell ${isToday ? "today" : ""}`} key={key} style={{ opacity: inMonth ? 1 : 0.45 }}>
                <span>{date.getDate()}</span>
                {events.slice(0, 3).map((ev, i) => (
                  <span className="ev" key={`${ev}-${i}`}>{ev}</span>
                ))}
                {events.length > 3 ? <span className="ev">+{events.length - 3}</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Đơn theo lịch</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách</th>
                <th>Xe</th>
                <th>Nhận</th>
                <th>Trả</th>
              </tr>
            </thead>
            <tbody>
              {(bookings ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="strong">{b.code}</td>
                  <td>{b.customer_name}</td>
                  <td>
                    {(b.cars as { model?: string; plate?: string } | null)?.model}
                    <span className="sub">{(b.cars as { plate?: string } | null)?.plate}</span>
                  </td>
                  <td>{dateTime(b.pickup_at)}</td>
                  <td>{dateTime(b.return_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Đội xe</h2>
        </div>
        <div className="detail-list">
          {(cars ?? []).map((car) => (
            <div key={car.id}>
              <span>{car.model} · {car.plate}</span>
              <span>{car.status === "available" ? "Sẵn sàng" : car.status === "rented" ? "Đang thuê" : "Bảo dưỡng"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
