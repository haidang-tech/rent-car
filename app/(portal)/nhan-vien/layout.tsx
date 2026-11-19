import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { getProfile, ROLE_HOME } from "@/lib/auth";

export const metadata = { title: "Nhân viên giao xe" };

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=/nhan-vien");
  if (!["admin", "staff"].includes(profile.role)) redirect(ROLE_HOME[profile.role]);

  return (
    <PortalShell role="staff" user={profile}>
      {children}
    </PortalShell>
  );
}
