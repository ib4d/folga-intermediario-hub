import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LegalReviewQueue from "@/components/legal/LegalReviewQueue";
import { Scale, Users, CheckCircle2, XCircle } from "lucide-react";

export default async function LegalPage() {
  const session = await auth();
  if (!session || !["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      status: "EN_REVISION_LEGAL",
    },
    include: {
      documents: true,
      intermediary: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Stats for the month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const stats = await prisma.candidate.groupBy({
    by: ["status"],
    where: {
      updatedAt: { gte: startOfMonth },
    },
    _count: true,
  });

  const approvedThisMonth = stats.find(s => s.status === "APROBADO")?._count || 0;
  const rejectedThisMonth = stats.find(s => s.status === "RECHAZADO")?._count || 0;

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-600 font-bold uppercase tracking-wider text-sm">
            <Scale size={20} />
            Departamento Legal
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Panel de Revisión
          </h1>
          <p className="text-gray-500 text-lg">
            Gestione la validación de candidatos y documentación oficial.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[180px]">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">{candidates.length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase">En Cola</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[180px]">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">{approvedThisMonth}</div>
              <div className="text-xs font-bold text-gray-400 uppercase">Aprobados mes</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[180px]">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
              <XCircle size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">{rejectedThisMonth}</div>
              <div className="text-xs font-bold text-gray-400 uppercase">Rechazados mes</div>
            </div>
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Candidatos Pendientes</h2>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>
        <LegalReviewQueue initialCandidates={candidates as React.ComponentProps<typeof LegalReviewQueue>['initialCandidates']} />
      </section>
    </div>
  );
}
