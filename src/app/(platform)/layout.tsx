import { auth } from "@/auth";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getCurrentPlatformAdmin, getCurrentTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const platformAdmin = await getCurrentPlatformAdmin();
  if (!platformAdmin) redirect("/sin-permisos");

  const tenant = await getCurrentTenant();

  return (
    <div className="app-layout">
      <Sidebar
        role={tenant?.role ?? null}
        interfaceLanguage={session.user.interfaceLanguage}
        isPlatformAdmin
      />
      <div className="main-container">
        <Header
          role={tenant?.role ?? null}
          organizationId={tenant?.organizationId ?? null}
        />
        <main className="main-content">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      {tenant ? (
        <div className="mobile-only">
          <BottomNav
            role={tenant.role}
            interfaceLanguage={session.user.interfaceLanguage}
          />
        </div>
      ) : null}
    </div>
  );
}
