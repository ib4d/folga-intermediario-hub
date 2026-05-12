import { prisma } from "@/lib/prisma";
import { AlertTriangle, CheckCircle } from "lucide-react";
import BatchUploadButton from "@/components/BatchUploadButton";
import DocumentTable from "@/components/DocumentTable";
import Link from "next/link";
import { canAccessAllCandidates, candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tenant = await requireTenant();
  const documentWhere: Prisma.DocumentWhereInput = {
    organizationId: tenant.organizationId,
    ...(status ? { ocrStatus: status } : {}),
    ...(canAccessAllCandidates(tenant.role)
      ? {}
      : { candidate: { intermediaryId: tenant.userId } }),
  };

  const documents = await prisma.document.findMany({
    where: documentWhere,
    include: { candidate: true },
    orderBy: { createdAt: 'desc' },
    take: status ? undefined : 10
  });

  const candidates = await prisma.candidate.findMany({
    where: candidateVisibilityWhere(tenant),
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' }
  });

  const formattedCandidates = candidates.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`
  }));

  const pendingCount = await prisma.document.count({
    where: { ...documentWhere, ocrStatus: "PENDING" },
  });
  const completedCount = await prisma.document.count({
    where: { ...documentWhere, ocrStatus: { in: ["REVIEW_REQUIRED", "OCR_CAPTURED", "SUCCESS"] } },
  });

  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>
        <h1 style={{ color: 'var(--ghost-white)' }}>Centro de Documentos</h1>
        <p style={{ color: 'var(--grey-olive)' }}>Revisión OCR, gestión de visas, permisos de trabajo y auditoría legal.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <Link href="/documentos?status=PENDING" className="card" style={{ backgroundColor: 'var(--amber-flame)', textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">
            <h3>Pendientes de Revisión</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{pendingCount}</div>
          <p style={{ margin: 0, marginTop: '0.5rem', color: 'var(--pitch-black)' }}>Docs por validar</p>
        </Link>
        
        <div className="card">
          <div className="card-header">
            <h3>OCR Procesados</h3>
            <CheckCircle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{completedCount}</div>
          <p style={{ margin: 0, marginTop: '0.5rem' }}>Extracción automática exitosa</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2>Carga de Documentos</h2>
          <BatchUploadButton candidates={formattedCandidates} />
        </div>
      </div>

      <DocumentTable initialDocuments={documents as never} />
    </>
  );
}
