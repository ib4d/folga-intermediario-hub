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
import { auth } from "@/auth";
import { normalizeLanguage, t } from "@/lib/i18n";
import {
  canCreateCandidates,
  canDeleteCandidates,
  canImportCandidates,
  canViewCandidateContact,
} from "@/lib/permissions";

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; limit?: string; status?: string }>;
}) {
  const { q, page = "1", limit = "20", status } = await searchParams;
  const tenant = await requireTenant();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

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
        title={labels("candidates.title")}
        description={labels("candidates.description")}
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
                {labels("candidates.add")}
              </Link>
            ) : null}
          </>
        }
      />

      <CandidateSearch
        labels={{
          placeholder: labels("candidates.searchPlaceholder"),
          option20: labels("candidates.perPage20"),
          option10: labels("candidates.perPage10"),
          option50: labels("candidates.perPage50"),
          option100: labels("candidates.perPage100"),
          option200: labels("candidates.perPage200"),
          option500: labels("candidates.perPage500"),
          option1000: labels("candidates.perPage1000"),
          optionAll: labels("candidates.perPageAll"),
        }}
      />
      {candidates.length === 0 ? (
        <div className="card">
          <EmptyState
            title={labels("candidates.emptyTitle")}
            description={labels("candidates.emptyDescription")}
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
          canViewContact={canViewCandidateContact(tenant.role)}
          labels={{
            summaryCount: labels("candidates.summaryCount"),
            summaryPluralSuffix: labels("candidates.summarySuffixPlural"),
            summaryView: labels("candidates.summaryView"),
            summaryAll: labels("candidates.summaryAll"),
            bulkDelete: labels("candidates.bulkDelete"),
            bulkDeleted: labels("candidates.bulkDeleted"),
            singleDeleted: labels("candidates.singleDeleted"),
            deleteFailed: labels("candidates.deleteFailed"),
            deleteOneFailed: labels("candidates.deleteOneFailed"),
            selectAll: labels("candidates.selectAll"),
            selectOne: labels("candidates.selectOne"),
            noName: labels("candidates.noName"),
            noPhone: labels("candidates.noPhone"),
            tableCandidate: labels("candidates.tableCandidate"),
            tableCountry: labels("candidates.tableCountry"),
            tableDocs: labels("candidates.tableDocs"),
            tableIntermediary: labels("candidates.tableIntermediary"),
            tableStatus: labels("candidates.tableStatus"),
            tableActions: labels("candidates.tableActions"),
            view: labels("dashboard.view"),
            delete: labels("candidates.delete"),
            firstPage: labels("candidates.firstPage"),
            previousPage: labels("candidates.previousPage"),
            nextPage: labels("candidates.nextPage"),
            lastPage: labels("candidates.lastPage"),
            pageOf: labels("candidates.pageOf"),
            goToPage: labels("candidates.goToPage"),
            deleteDialogTitleSingle: labels("candidates.deleteDialogTitleSingle"),
            deleteDialogTitleBulk: labels("candidates.deleteDialogTitleBulk"),
            deleteDialogDescriptionBulk: labels("candidates.deleteDialogDescriptionBulk"),
            deleteDialogDescriptionSingle: labels("candidates.deleteDialogDescriptionSingle"),
          }}
        />
      )}
    </>
  );
}
