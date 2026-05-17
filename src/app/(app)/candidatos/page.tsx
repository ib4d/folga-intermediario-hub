import { prisma } from "@/lib/prisma";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import CandidateSearch from "@/components/CandidateSearch";
import BulkImportCandidates from "@/components/BulkImportCandidates";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { CandidateStatus, Prisma } from "@prisma/client";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import CandidateTable from "@/components/CandidateTable";
import { canCreateCandidates, canDeleteCandidates, canImportCandidates } from "@/lib/permissions";

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; limit?: string; status?: string }>;
}) {
  const { q, page = "1", limit = "20", status } = await searchParams;
  const tenant = await requireTenant();

  const filters: Prisma.CandidateWhereInput[] = [];

  if (q) {
    filters.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
        { passportNumber: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (status && Object.values(CandidateStatus).includes(status as CandidateStatus)) {
    filters.push({ status: status as CandidateStatus });
  }

  const whereClause = candidateVisibilityWhere(
    tenant,
    filters.length > 0 ? { AND: filters } : {}
  );

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = limit === "ALL" ? undefined : (parseInt(limit, 10) || 20);
  const skip = limitNumber ? (pageNumber - 1) * limitNumber : undefined;

  const totalCandidates = await prisma.candidate.count({ where: whereClause });
  const totalPages = limitNumber ? Math.ceil(totalCandidates / limitNumber) : 1;

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    take: limitNumber,
    skip,
    include: {
      intermediary: { select: { name: true } },
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Candidatos"
        description="Gestion completa de candidatos y sus estados legales."
        actions={
          <>
            {canImportCandidates(tenant.role) ? <BulkImportCandidates /> : null}
            {canCreateCandidates(tenant.role) ? (
              <Link
                href="/candidatos/nuevo"
                className="button"
                style={{ backgroundColor: "var(--pitch-black)", color: "var(--amber-flame)" }}
              >
                <PlusCircle size={20} />
                Anadir Candidato
              </Link>
            ) : null}
          </>
        }
      />

      <CandidateSearch />
      {candidates.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No hay candidatos registrados todavia"
            description="Crea un candidato manualmente o importa una hoja para iniciar el pipeline."
          />
        </div>
      ) : (
        <CandidateTable
          candidates={candidates.map((candidate) => ({
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            phone: candidate.phone,
            country: candidate.country,
            documentsCount: candidate._count.documents,
            intermediaryName: candidate.intermediary.name,
            status: candidate.status,
            selfRegistered: candidate.selfRegistered,
            registrationToken: candidate.registrationToken,
          }))}
          pageNumber={pageNumber}
          totalPages={totalPages}
          totalCandidates={totalCandidates}
          currentLimit={limit}
          canManageCandidates={canDeleteCandidates(tenant.role)}
        />
      )}
    </>
  );
}
