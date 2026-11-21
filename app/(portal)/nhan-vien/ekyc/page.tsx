import { createClient } from "@/lib/supabase/server";
import { verifyKycAction } from "@/lib/actions/portal-staff";
import { PortalTopbar } from "@/components/portal-shell";
import { SubmitButton } from "@/components/customer-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Duyệt giấy tờ" };

type KycRecord = {
  id: string;
  status: string;
  note: string | null;
  id_front_path: string | null;
  id_back_path: string | null;
  license_path: string | null;
  selfie_path: string | null;
  bookings: { code: string; customer_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  verified: "Đã xác minh",
  rejected: "Từ chối",
};

const SLOTS = ["CCCD mặt trước", "CCCD mặt sau", "GPLX", "Ảnh khuôn mặt"] as const;

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string; ok?: string }>;
}) {
  const query = await searchParams;
  const db = await createClient();
  const { data, error } = await db
    .from("kyc_records")
    .select(
      "id, status, note, id_front_path, id_back_path, license_path, selfie_path, bookings(code, customer_name)",
    )
    .order("created_at", { ascending: false });

  const records = await Promise.all(
    ((data ?? []) as unknown as KycRecord[]).map(async (row) => {
      const paths = [row.id_front_path, row.id_back_path, row.license_path, row.selfie_path];
      const images = await Promise.all(
        paths.map(async (path) => {
          if (!path) return null;
          const result = await db.storage.from("kyc").createSignedUrl(path, 120);
          if (result.error) return null;
          return result.data?.signedUrl ?? null;
        }),
      );
      return { ...row, images };
    }),
  );

  return (
    <>
      <PortalTopbar label="Duyệt giấy tờ" />
      <div className="portal-content">
        <h1>Duyệt giấy tờ khách thuê</h1>
        <p>Đối chiếu thủ công. Liên kết ảnh riêng tư hết hạn sau hai phút.</p>

        {query.loi ? <p className="form-message error">{query.loi}</p> : null}
        {query.ok ? <p className="form-message success">Đã cập nhật hồ sơ.</p> : null}

        {error ? (
          <p className="form-message error">
            Không tải được hồ sơ. Kiểm tra kết nối và migration.
          </p>
        ) : !records.length ? (
          <p className="card">Chưa có hồ sơ.</p>
        ) : (
          records.map((record) => (
            <article className="panel request-card" key={record.id}>
              <h2>
                {record.bookings?.code ?? "—"} · {record.bookings?.customer_name ?? "Khách"}
              </h2>
              <p>
                {STATUS_LABEL[record.status] ?? record.status}
                {record.note ? ` · ${record.note}` : ""}
              </p>

              <div className="upload-grid">
                {record.images.map((url, index) => (
                  <div key={SLOTS[index]}>
                    <strong>{SLOTS[index]}</strong>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="kyc-image" src={url} alt={SLOTS[index]} />
                      </a>
                    ) : (
                      <p>Ảnh chưa có hoặc không tải được.</p>
                    )}
                  </div>
                ))}
              </div>

              {record.status === "pending" ? (
                <form action={verifyKycAction}>
                  <input type="hidden" name="id" value={record.id} />
                  <label className="field">
                    <span>Kết quả kiểm tra</span>
                    <select name="decision" required>
                      <option value="">Chọn kết quả</option>
                      <option value="approve">Chấp nhận giấy tờ</option>
                      <option value="reject">Từ chối / yêu cầu gửi lại</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Ghi chú kiểm tra</span>
                    <textarea name="note" required minLength={3} maxLength={2000} />
                  </label>
                  <SubmitButton>Lưu kết quả duyệt</SubmitButton>
                </form>
              ) : null}
            </article>
          ))
        )}
      </div>
    </>
  );
}
