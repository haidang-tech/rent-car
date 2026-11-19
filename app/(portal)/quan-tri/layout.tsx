import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { getProfile, ROLE_HOME } from "@/lib/auth";

export const metadata = { title: "Quản trị" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=/quan-tri");
  if (profile.role !== "admin") redirect(ROLE_HOME[profile.role]);

  return (
    <PortalShell role="admin" user={profile}>
      {children}
    </PortalShell>
  );
}
