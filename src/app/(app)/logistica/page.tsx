import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LogisticsDashboard from "@/components/logistics/LogisticsDashboard";
import { Truck } from "lucide-react";

export default async function LogisticaPage() {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERADMIN", "LOGISTICA"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const pendingCandidates = await prisma.candidate.findMany({
    where: {
      status: "APROBADO",
      logistics: { none: {} }
    },
    orderBy: { updatedAt: "desc" }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const weeklyEvents = await prisma.logisticsEvent.findMany({
    where: {
      arrivalDate: { gte: today, lte: nextWeek }
    },
    include: { candidate: true },
    orderBy: { arrivalDate: "asc" }
  });

  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '900', textTransform: 'uppercase' }}>
          <Truck size={20} strokeWidth={3} />
          DEPARTAMENTO LOGÍSTICA
        </div>
        <h1 style={{ marginBottom: '0.5rem' }}>GESTIÓN DE LLEGADAS</h1>
        <p style={{ color: 'var(--pitch-black)', fontSize: '1.1rem', margin: 0 }}>
          MONITOREO Y COORDINACIÓN DE TRANSPORTE PARA CANDIDATOS APROBADOS.
        </p>
      </div>

      <LogisticsDashboard
        pendingCandidates={pendingCandidates}
        weeklyEvents={weeklyEvents as React.ComponentProps<typeof LogisticsDashboard>['weeklyEvents']}
      />
    </>
  );
}
