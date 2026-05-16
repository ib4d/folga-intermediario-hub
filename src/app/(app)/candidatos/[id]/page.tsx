import { auth } from "@/auth";
import AuditTimeline from "@/components/audit/AuditTimeline";
import CopyRegistrationLink from "@/components/CopyRegistrationLink";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";
import DocumentReviewModal from "@/components/DocumentReviewModal";
import DocumentUploadButton from "@/components/DocumentUploadButton";
import RequestLegalReview from "@/components/RequestLegalReview";
import UpdateNotes from "@/components/UpdateNotes";
import UpdatePaymentStatus from "@/components/UpdatePaymentStatus";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import {
  formatDocumentDisplayDate,
  getDocumentDisplayExpiry,
  getDocumentDisposition,
  getDocumentDispositionLabel,
  getDocumentDisplayNumber,
} from "@/lib/document-display";
import { parseStructuredLegalOutcome } from "@/lib/legal-outcome";
import { candidateAccessWhere, requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  History,
  Info,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  const resolvedParams = await params;

  const candidate = await prisma.candidate.findFirst({
    where: candidateAccessWhere(tenant, resolvedParams.id),
    include: {
      intermediary: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      logistics: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!candidate) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: tenant.organizationId,
      entityType: "Candidate",
      entityId: candidate.id,
    },
    include: {
      User: {
        select: { name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const checklist = getCandidateDocumentChecklist(candidate as Parameters<typeof getCandidateDocumentChecklist>[0]);
  const role = tenant.role;
  const legalOutcome = parseStructuredLegalOutcome(candidate.status === "RECHAZADO" ? candidate.rejectionReason : candidate.reviewNotes);
  const arrivalReadiness = getArrivalReadiness(candidate);

  return (
    <div className="candidate-detail-shell">
      <div className="candidate-detail-toolbar">
        <Link href="/candidatos" className="candidate-back-link">
          <ArrowLeft size={18} />
          Volver a Candidatos
        </Link>

        <div className="candidate-detail-actions">
          {candidate.registrationToken ? <CopyRegistrationLink token={candidate.registrationToken} /> : null}
          {role !== "LEGAL" ? (
            <Link href={`/candidatos/${candidate.id}/edit`} className="button button-secondary flex items-center gap-2">
              Editar Perfil
            </Link>
          ) : null}
        </div>
      </div>

      <div className="candidate-profile-hero card">
        <div
          style={{
            padding: "2rem 2rem 1.75rem",
            background:
              "linear-gradient(135deg, rgba(252, 186, 4, 0.14), rgba(255, 255, 255, 0.92))",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="candidate-hero-content">
            <div className="candidate-hero-main">
              <div className="candidate-status-row">
                <span
                  className={`status-badge ${
                    candidate.status === "APROBADO"
                      ? "active"
                      : candidate.status === "RECHAZADO"
                        ? "danger"
                        : candidate.status === "EN_REVISION_LEGAL"
                          ? "info"
                          : "warning"
                  }`}
                >
                  {candidate.status.replace(/_/g, " ")}
                </span>
                {candidate.selfRegistered ? (
                  <span className="status-badge" style={{ backgroundColor: "var(--surface)", color: "var(--pitch-black)" }}>
                    Auto-Registrado
                  </span>
                ) : null}
              </div>

              <h1 className="candidate-title">
                {candidate.firstName} {candidate.lastName}
              </h1>

              <div className="candidate-meta-row" style={{ color: "var(--muted-foreground)" }}>
                <span>
                  <Info size={18} /> {candidate.country}
                </span>
                <span>
                  <FileText size={18} /> {candidate.passportNumber || "Sin Pasaporte"}
                </span>
                <span>
                  <ClipboardList size={18} /> {candidate.phone || "Sin Telefono"}
                </span>
              </div>
            </div>

            <div
              style={{
                minWidth: "260px",
                padding: "1.25rem",
                backgroundColor: "rgba(255,255,255,0.75)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div className="candidate-owner-label" style={{ color: "var(--muted)" }}>Intermediario</div>
              <div className="candidate-owner-row">
                <div className="candidate-owner-avatar" style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}>
                  {candidate.intermediary.name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ color: "var(--pitch-black)" }}>{candidate.intermediary.name}</div>
                  <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>{candidate.intermediary.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="candidate-stat-strip">
          <div className="candidate-stat-item">
            <div
              className={`candidate-stat-icon ${
                candidate.paid400pln ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <div className="candidate-stat-label">Pago 400 PLN</div>
              <div className="font-bold">{candidate.paid400pln ? "Confirmado" : "Pendiente"}</div>
            </div>
          </div>

          <div className="candidate-stat-item">
            <div
              className={`candidate-stat-icon ${
                checklist.isComplete ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              }`}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="candidate-stat-label">Documentacion</div>
              <div className="font-bold">{checklist.isComplete ? "Completa" : `${checklist.missing.length} Faltantes`}</div>
            </div>
          </div>

          <div className="candidate-stat-item">
            <div className="candidate-stat-icon bg-blue-100 text-blue-600">
              <Truck size={20} />
            </div>
            <div>
              <div className="candidate-stat-label">Logistica</div>
              <div className="font-bold">{candidate.logistics.length > 0 ? "Programada" : "No asignada"}</div>
            </div>
          </div>

          <div className="candidate-stat-item">
            <div className="candidate-stat-icon bg-gray-100 text-gray-600">
              <History size={20} />
            </div>
            <div>
              <div className="candidate-stat-label">Ultimo Cambio</div>
              <div className="font-bold">{new Date(candidate.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="candidate-workspace-grid">
        <div className="candidate-main-column">
          {candidate.status === "RECHAZADO" || candidate.status === "REVISION_ADICIONAL" ? (
            <div
              className={`p-6 rounded-2xl border-2 flex gap-4 ${
                candidate.status === "RECHAZADO"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <AlertTriangle className="shrink-0" size={24} />
              <div>
                <h3 className="font-black uppercase tracking-tight mb-1">
                  {candidate.status === "RECHAZADO" ? "Candidato Rechazado" : "Revision Adicional Requerida"}
                </h3>
                {legalOutcome?.category ? (
                  <div className="mb-3 inline-flex rounded-full border border-current/20 bg-white/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    {legalOutcome.category}
                  </div>
                ) : null}
                <p className="text-lg font-medium whitespace-pre-line">
                  {legalOutcome?.summary ?? (candidate.status === "RECHAZADO" ? candidate.rejectionReason : candidate.reviewNotes)}
                </p>
                {legalOutcome && legalOutcome.followUpActions.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {legalOutcome.followUpActions.map((action) => (
                      <span
                        key={action}
                        className="rounded-full border border-current/20 bg-white/60 px-3 py-1 text-[11px] font-bold"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="candidate-summary-grid candidate-summary-grid-primary">
            <SummaryTile
              label="Listo Legal"
              value={checklist.isReadyForLegal ? "Si" : "No"}
              tone={checklist.isReadyForLegal ? "success" : "danger"}
              hint={checklist.isReadyForLegal ? "Sin bloqueos activos" : `${checklist.blockers.length} bloqueos`}
            />
            <SummaryTile
              label="Pendientes OCR"
              value={String(checklist.stats.pendingReviewDocuments)}
              tone={checklist.stats.pendingReviewDocuments > 0 ? "warning" : "neutral"}
              hint="Documentos por validar"
            />
            <SummaryTile
              label="Por Vencer"
              value={String(checklist.stats.expiringSoonDocuments)}
              tone={checklist.stats.expiringSoonDocuments > 0 ? "warning" : "neutral"}
              hint="Expiran en 30 dias"
            />
            <SummaryTile
              label="Duplicados"
              value={String(checklist.stats.duplicateGroups)}
              tone={checklist.stats.duplicateGroups > 0 ? "warning" : "neutral"}
              hint="Grupos a revisar"
            />
            <SummaryTile
              label="Verificados"
              value={`${checklist.stats.verifiedDocuments}/${checklist.stats.totalDocuments}`}
              tone={checklist.stats.verifiedDocuments > 0 ? "success" : "neutral"}
              hint="Documentos confirmados"
            />
          </div>

          <div className="candidate-summary-grid candidate-summary-grid-secondary">
            <SummaryTile
              label="Listo Llegada"
              value={arrivalReadiness.isReadyForArrival ? "Si" : "No"}
              tone={arrivalReadiness.isReadyForArrival ? "success" : "warning"}
              hint={arrivalReadiness.statusLabel}
            />
            <SummaryTile
              label="Transporte"
              value={arrivalReadiness.transportScheduled ? "OK" : "Falta"}
              tone={arrivalReadiness.transportScheduled ? "success" : "danger"}
              hint={candidate.logistics.length > 0 ? `${candidate.logistics.length} evento(s)` : "Sin evento creado"}
            />
            <SummaryTile
              label="Recogida"
              value={arrivalReadiness.pickupAssigned ? "OK" : "Falta"}
              tone={arrivalReadiness.pickupAssigned ? "success" : "danger"}
              hint={candidate.logistics[0]?.pickedUpBy || "Sin responsable"}
            />
            <SummaryTile
              label="Alojamiento"
              value={arrivalReadiness.accommodationAssigned ? "OK" : "Falta"}
              tone={arrivalReadiness.accommodationAssigned ? "success" : "danger"}
              hint={candidate.accommodation || "No asignado"}
            />
          </div>

          <div className="candidate-section-card">
            <h2 className="candidate-section-title">
              <ClipboardList className="text-blue-600" />
              Informacion Detallada
            </h2>
            <div className="candidate-info-grid">
              {[
                { label: "Nacionalidad", val: candidate.nationality },
                { label: "Fecha Nacimiento", val: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : null },
                { label: "Lugar Nacimiento", val: candidate.birthPlace },
                { label: "Pasaporte", val: candidate.passportNumber },
                {
                  label: "Pasaporte Biometrico",
                  val:
                    typeof candidate.passportBiometric === "boolean"
                      ? candidate.passportBiometric
                        ? "Si"
                        : "No"
                      : null,
                },
                { label: "Exp. Pasaporte", val: candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : null },
                { label: "PESEL", val: candidate.peselNumber },
                { label: "Karta Pobytu", val: candidate.kartaPobytuNumber },
                { label: "Tipo Karta", val: candidate.kartaPobytuType },
                { label: "Exp. Karta", val: candidate.kartaPobytuExpiry ? new Date(candidate.kartaPobytuExpiry).toLocaleDateString() : null },
                { label: "Estatura", val: candidate.heightCm ? `${candidate.heightCm} cm` : null },
                { label: "Direccion PL", val: candidate.polishAddress },
                { label: "Ciudad PL", val: candidate.polishCity },
                { label: "Llegada", val: candidate.arrivalDate ? new Date(candidate.arrivalDate).toLocaleDateString() : null },
                { label: "Alojamiento", val: candidate.accommodation },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</div>
                  <div className="font-bold text-gray-900">{item.val || "No disponible"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="candidate-section-card candidate-documents-card">
            <div className="candidate-section-header">
              <h2 className="candidate-section-title">
                <FileText className="text-blue-600" />
                Documentacion Subida
              </h2>
              {role !== "LEGAL" ? <DocumentUploadButton candidateId={candidate.id} /> : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Numero</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Expiracion</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidate.documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                        No se han cargado documentos aun.
                      </td>
                    </tr>
                  ) : (
                    candidate.documents.map((doc) => {
                      const dispositionLabel = getDocumentDispositionLabel(getDocumentDisposition(doc));

                      return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <div className="flex flex-col gap-1">
                            <span>{doc.type}</span>
                            {dispositionLabel ? (
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {dispositionLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">{getDocumentDisplayNumber(doc) ?? "-"}</td>
                        <td className="px-6 py-4 text-sm">{formatDocumentDisplayDate(getDocumentDisplayExpiry(doc))}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              doc.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {doc.isVerified ? "Verificado" : doc.ocrStatus || "Pendiente"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {["LEGAL", "ADMIN", "SUPERADMIN"].includes(role) ? (
                              <DocumentReviewModal
                                doc={{
                                  id: doc.id,
                                  type: doc.type,
                                  number: doc.number,
                                  expiryDate: doc.expiryDate,
                                  issueDate: doc.issueDate,
                                  extractedData:
                                    doc.extractedData &&
                                    typeof doc.extractedData === "object" &&
                                    !Array.isArray(doc.extractedData)
                                      ? (doc.extractedData as Record<string, unknown>)
                                      : null,
                                }}
                              />
                            ) : null}
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              Ver
                            </a>
                            {role !== "LEGAL" ? <DeleteDocumentButton documentId={doc.id} /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="candidate-side-column">
          <div className="candidate-section-card">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Estado de Documentacion</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verificados</div>
                <div className="text-lg font-black text-gray-900">
                  {checklist.stats.verifiedDocuments}/{checklist.stats.totalDocuments}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pendientes OCR</div>
                <div className="text-lg font-black text-gray-900">{checklist.stats.pendingReviewDocuments}</div>
              </div>
            </div>
            <div className="space-y-4">
              {checklist.required.map((requiredDoc) => (
                <div key={requiredDoc} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    {checklist.verified.includes(requiredDoc as Parameters<typeof checklist.verified.includes>[0]) ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : checklist.uploaded.includes(requiredDoc as Parameters<typeof checklist.uploaded.includes>[0]) ? (
                      <div className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
                        <AlertTriangle size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                        <XCircle size={14} />
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-700">{requiredDoc}</span>
                  </div>
                  {!checklist.uploaded.includes(requiredDoc as Parameters<typeof checklist.uploaded.includes>[0]) ? (
                    <span className="text-[10px] font-black text-red-500 uppercase">Faltante</span>
                  ) : !checklist.verified.includes(requiredDoc as Parameters<typeof checklist.verified.includes>[0]) ? (
                    <span className="text-[10px] font-black text-amber-700 uppercase">Por verificar</span>
                  ) : null}
                </div>
              ))}
            </div>

            {checklist.blockers.length > 0 ? (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase">
                  <AlertTriangle size={14} /> Bloqueos legales
                </div>
                <ul className="text-xs text-red-800 space-y-1">
                  {checklist.blockers.map((blocker, index) => (
                    <li key={`${blocker}-${index}`}>- {blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {checklist.warnings.length > 0 ? (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase">
                  <AlertTriangle size={14} /> Advertencias
                </div>
                <ul className="text-xs text-amber-800 space-y-1">
                  {checklist.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>- {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="candidate-section-card candidate-action-card">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Centro de Acciones</h3>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-gray-500">Readiness de llegada</div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: arrivalReadiness.isReadyForArrival ? "#dcfce7" : "#fef3c7",
                    color: arrivalReadiness.isReadyForArrival ? "#166534" : "#92400e",
                  }}
                >
                  {arrivalReadiness.statusLabel.toUpperCase()}
                </span>
                {arrivalReadiness.legalFollowUpOpen ? (
                  <span className="status-badge" style={{ backgroundColor: "#eef2ff", color: "#4338ca" }}>
                    SEGUIMIENTO LEGAL
                  </span>
                ) : null}
              </div>
              {arrivalReadiness.blockers.length > 0 ? (
                <div className="text-xs font-semibold text-red-700">
                  Bloqueos: {arrivalReadiness.blockers.join(" | ")}
                </div>
              ) : null}
              {arrivalReadiness.warnings.length > 0 ? (
                <div className="text-xs font-semibold text-amber-700">
                  Alertas: {arrivalReadiness.warnings.join(" | ")}
                </div>
              ) : null}
            </div>

            {["LEGAL", "ADMIN", "SUPERADMIN"].includes(role) ? (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                <h4 className="text-xs font-bold text-blue-700 uppercase">Revision Legal</h4>
                <RequestLegalReview
                  candidateId={candidate.id}
                  currentStatus={candidate.status}
                  isReadyForLegal={checklist.isReadyForLegal}
                  blockers={checklist.blockers}
                  missing={checklist.missing}
                />
              </div>
            ) : null}

            <div className="space-y-4">
              <UpdatePaymentStatus candidateId={candidate.id} initialValue={candidate.paid400pln} />
              <div className="h-px bg-gray-100 my-4" />
              <UpdateNotes candidateId={candidate.id} initialNotes={candidate.notes || ""} />
            </div>
          </div>

          <div className="candidate-section-card">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Historial de Estados</h3>
            <div className="space-y-6">
              {candidate.statusHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay registros de historial.</p>
              ) : (
                candidate.statusHistory.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="relative pl-6 pb-6 last:pb-0">
                    {index !== Math.min(candidate.statusHistory.length, 5) - 1 ? (
                      <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-200" />
                    ) : null}
                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900">{entry.toStatus.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      {entry.reason ? <p className="text-xs text-gray-500">{entry.reason}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="candidate-section-card">
            <AuditTimeline logs={auditLogs as React.ComponentProps<typeof AuditTimeline>["logs"]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "warning" | "danger" | "success";
}) {
  return (
    <div className={`candidate-summary-tile tone-${tone}`}>
      <div className="candidate-summary-label">{label}</div>
      <div className="candidate-summary-value">{value}</div>
      <div className="candidate-summary-hint">{hint}</div>
    </div>
  );
}

