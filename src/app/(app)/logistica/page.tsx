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

  // Candidates approved but without logistics events
  const pendingCandidates = await prisma.candidate.findMany({
    where: {
      status: "APROBADO",
      logistics: {
        none: {}
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  // Weekly arrivals (from today to 7 days from now)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const weeklyEvents = await prisma.logisticsEvent.findMany({
    where: {
      arrivalDate: {
        gte: today,
        lte: nextWeek
      }
    },
    include: {
      candidate: true
    },
    orderBy: {
      arrivalDate: "asc"
    }
  });

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-600 font-bold uppercase tracking-wider text-sm">
            <Truck size={20} />
            Departamento Logística
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Gestión de Llegadas
          </h1>
          <p className="text-gray-500 text-lg">
            Monitoreo y coordinación de transporte para candidatos aprobados.
          </p>
        </div>
      </header>

      <LogisticsDashboard 
        pendingCandidates={pendingCandidates} 
        weeklyEvents={weeklyEvents as React.ComponentProps<typeof LogisticsDashboard>['weeklyEvents']} 
      />
    </div>
  );
}
