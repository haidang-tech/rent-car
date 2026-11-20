import { createClient } from "@/lib/supabase/server";
import { decideRequestAction } from "@/lib/actions/portal-staff";
import { PortalTopbar } from "@/components/portal-shell";
import { SubmitButton } from "@/components/customer-controls";
import { currency, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yêu cầu khách hàng" };

type RequestRow = {
  id: string;
  kind: string;
  status: string;
  reason: string | null;
  fee: number;
  desired_return_at: string | null;
  decision_note: string | null;
  created_at: string;
  bookings: { code: string; customer_name: string; status: string; return_at: string } | null;
};

const KIND: Record<string, string> = {
  extension: "Gia hạn",
  exchange: "Đổi xe",
  cancellation: "Hủy chuyến",
  incident: "Sự cố",
};

const STATUS: Record<string, string> = {
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string; ok?: string }>;
}) {
  const query = await searchParams;
  const db = await createClient();
  const { data, error } = await db
    .from("booking_requests")
    .select(
      "id, kind, status, reason, fee, desired_return_at, decision_note, created_at, bookings(code, customer_name, status, return_at)",
    )
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as unknown as RequestRow[];

  return (
    <>
      <PortalTopbar label="Yêu cầu khách hàng" />
      <div className="portal-content">
        <h1>Yêu cầu khách hàng</h1>
        <p>Duyệt gia hạn, đổi xe, hủy chuyến và tiếp nhận báo sự cố từ khách.</p>

        {query.loi ? <p className="form-message error">{query.loi}</p> : null}
        {query.ok ? <p className="form-message success">Đã cập nhật quyết định.</p> : null}

        {error ? (
          <p className="form-message error">
            Không tải được yêu cầu. Kiểm tra migration và kết nối.
          </p>
        ) : !requests.length ? (
          <p className="card">Chưa có yêu cầu.</p>
        ) : (
          requests.map((request) => (
            <article className="panel request-card" key={request.id}>
              <h2>
                {request.bookings?.code ?? "—"} · {request.bookings?.customer_name ?? "Khách"}
              </h2>
              <p>
                {KIND[request.kind] ?? request.kind} ·{" "}
                {STATUS[request.status] ?? request.status} · {dateTime(request.created_at)}
              </p>
              <p>{request.reason}</p>
              {request.desired_return_at ? (
                <p>Ngày trả đề nghị: {dateTime(request.desired_return_at)}</p>
              ) : null}
              <p>Phí cấn trừ / phát sinh: {currency(request.fee)}</p>
              {request.decision_note ? <p>Ghi chú: {request.decision_note}</p> : null}

              {request.status === "pending" ? (
                <form action={decideRequestAction}>
                  <input type="hidden" name="id" value={request.id} />
                  <label className="field">
                    <span>Quyết định</span>
                    <select name="decision" required>
                      <option value="">Chọn quyết định</option>
                      <option value="approve">Duyệt và thực hiện</option>
                      <option value="reject">Từ chối</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Ghi chú</span>
                    <textarea name="note" maxLength={2000} required />
                  </label>
                  <p className="field-hint">
                    Duyệt sự cố sẽ chuyển sang hồ sơ sự cố; gia hạn/đổi xe kiểm tra trùng lịch và
                    tạo phụ lục. Hủy chuyến không tự hoàn tiền.
                  </p>
                  <SubmitButton>Xác nhận xử lý</SubmitButton>
                </form>
              ) : null}
            </article>
          ))
        )}
      </div>
    </>
  );
}
