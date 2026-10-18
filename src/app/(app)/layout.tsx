import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentPlatformAdmin, getCurrentTenant } from "@/lib/tenant";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) {
    if (await getCurrentPlatformAdmin()) redirect("/platform");
    if (!session.user.organizationId) redirect("/onboarding");
    redirect("/login?access=inactive");
  }

  return (
    <div className="app-layout">
      <Sidebar
        role={tenant.role}
        interfaceLanguage={session.user.interfaceLanguage}
        isPlatformAdmin={tenant.isPlatformAdmin}
      />
      <div className="main-container">
        <Header role={tenant.role} organizationId={tenant.organizationId} />
        <main className="main-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <div className="mobile-only">
        <BottomNav role={tenant.role} interfaceLanguage={session.user.interfaceLanguage} />
      </div>
    </div>
  );
}
