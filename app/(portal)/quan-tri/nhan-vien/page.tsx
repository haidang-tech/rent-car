import { createClient } from "@/lib/supabase/server";
import { PortalTopbar } from "@/components/portal-shell";
import { saveEmployeeAction } from "@/lib/actions/cars";
import { ROLE_LABEL, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ luu?: string; loi?: string }>;
}) {
  const { luu, loi } = await searchParams;
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, branch, status")
    .order("role")
    .order("full_name");

  return (
    <>
      <PortalTopbar label="Nhân viên & phân quyền" />
      <div className="page-head">
        <div>
          <h1>Nhân viên &amp; phân quyền</h1>
          <p>Vai trò quyết định quyền truy cập dữ liệu qua Row Level Security.</p>
        </div>
      </div>

      {luu ? <p className="form-message success">Đã cập nhật phân quyền.</p> : null}
      {loi ? <p className="form-message error">{loi}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2>{profiles?.length ?? 0} tài khoản</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Điện thoại</th>
                <th>Vai trò hiện tại</th>
                <th>Cơ sở</th>
                <th>Trạng thái</th>
                <th>Phân quyền</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr key={profile.id}>
                  <td className="strong">{profile.full_name}</td>
                  <td>{profile.phone ?? "—"}</td>
                  <td>
                    <span className="badge plum">
                      {ROLE_LABEL[profile.role as Role] ?? profile.role}
                    </span>
                  </td>
                  <td>{profile.branch ?? "—"}</td>
                  <td>
                    <span className={`badge ${profile.status === "active" ? "success" : "danger"}`}>
                      {profile.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td>
                    <form action={saveEmployeeAction} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="id" value={profile.id} />
                      <select
                        name="role"
                        defaultValue={profile.role}
                        style={{ border: "1px solid var(--plum-line)", borderRadius: 8, padding: "5px 8px", fontSize: 12 }}
                      >
                        <option value="admin">Quản trị</option>
                        <option value="staff">Nhân viên giao xe</option>
                        <option value="accountant">Kế toán</option>
                        <option value="customer">Khách hàng</option>
                      </select>
                      <button className="chip" type="submit">Lưu</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
