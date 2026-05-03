import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  return (
    <div className="app-layout">
      <div className="desktop-only">
        <Sidebar />
      </div>
      <div className="main-container">
        <Header />
        <main className="main-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <div className="mobile-only">
        <BottomNav />
      </div>
    </div>
  );
}
