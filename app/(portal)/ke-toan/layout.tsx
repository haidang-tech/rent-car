import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { getProfile, ROLE_HOME } from "@/lib/auth";

export const metadata = { title: "Kế toán" };

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/dang-nhap?next=/ke-toan");
  if (!["admin", "accountant"].includes(profile.role)) redirect(ROLE_HOME[profile.role]);

  return (
    <PortalShell role="accountant" user={profile}>
      {children}
    </PortalShell>
  );
}
