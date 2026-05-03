import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, XCircle, Info, History, DollarSign, Truck, ClipboardList, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import DocumentUploadButton from "@/components/DocumentUploadButton";
import RequestLegalReview from "@/components/RequestLegalReview";
import UpdatePaymentStatus from "@/components/UpdatePaymentStatus";
import UpdateNotes from "@/components/UpdateNotes";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import CopyRegistrationLink from "@/components/CopyRegistrationLink";
import AuditTimeline from "@/components/audit/AuditTimeline";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id: resolvedParams.id },
    include: {
      intermediary: true,
      documents: {
        orderBy: { createdAt: "desc" }
      },
      statusHistory: {
        orderBy: { createdAt: "desc" }
      },
      logistics: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!candidate) {
    notFound();
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entity: "Candidate",
      entityId: candidate.id
    },
    include: {
      user: {
        select: { name: true, role: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const checklist = getCandidateDocumentChecklist(candidate as Parameters<typeof getCandidateDocumentChecklist>[0]);
  const role = session.user.role;

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">
      {/* Header / Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Link href="/candidatos" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-semibold">
          <ArrowLeft size={18} />
          Volver a Candidatos
        </Link>
        
        <div className="flex gap-2 w-full md:w-auto">
          {candidate.registrationToken && (
            <CopyRegistrationLink token={candidate.registrationToken} />
          )}
          {role !== "LEGAL" && (
            <Link href={`/candidatos/${candidate.id}/edit`} className="button button-secondary flex items-center gap-2">
              Editar Perfil
            </Link>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 lg:p-12 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                  candidate.status === 'APROBADO' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  candidate.status === 'RECHAZADO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  candidate.status === 'EN_REVISION_LEGAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {candidate.status.replace(/_/g, ' ')}
                </span>
                {candidate.selfRegistered && (
                  <span className="px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    Auto-Registrado
                  </span>
                )}
              </div>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <div className="flex flex-wrap gap-6 text-gray-400 font-medium">
                <span className="flex items-center gap-2"><Info size={18} /> {candidate.country}</span>
                <span className="flex items-center gap-2"><FileText size={18} /> {candidate.passportNumber || "Sin Pasaporte"}</span>
                <span className="flex items-center gap-2"><ClipboardList size={18} /> {candidate.phone || "Sin Teléfono"}</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 min-w-[240px]">
              <div className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-widest">Intermediario</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center font-black text-xl">
                  {candidate.intermediary.name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-lg">{candidate.intermediary.name}</div>
                  <div className="text-sm text-gray-400">{candidate.intermediary.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats / Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-t border-gray-100">
          <div className="p-6 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${candidate.paid400pln ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Pago 400 PLN</div>
              <div className="font-bold">{candidate.paid400pln ? 'Confirmado' : 'Pendiente'}</div>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${checklist.isComplete ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Documentación</div>
              <div className="font-bold">{checklist.isComplete ? 'Completa' : `${checklist.missing.length} Faltantes`}</div>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Truck size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Logística</div>
              <div className="font-bold">{candidate.logistics.length > 0 ? 'Programada' : 'No asignada'}</div>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Último Cambio</div>
              <div className="font-bold">{new Date(candidate.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details & Documents */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Rejection / Review Alert */}
          {(candidate.status === 'RECHAZADO' || candidate.status === 'REVISION_ADICIONAL') && (
            <div className={`p-6 rounded-2xl border-2 flex gap-4 ${
              candidate.status === 'RECHAZADO' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <AlertTriangle className="shrink-0" size={24} />
              <div>
                <h3 className="font-black uppercase tracking-tight mb-1">
                  {candidate.status === 'RECHAZADO' ? 'Candidato Rechazado' : 'Revisión Adicional Requerida'}
                </h3>
                <p className="text-lg font-medium">
                  {candidate.status === 'RECHAZADO' ? candidate.rejectionReason : candidate.reviewNotes}
                </p>
              </div>
            </div>
          )}

          {/* Personal Data Grid */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ClipboardList className="text-blue-600" />
              Información Detallada
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { label: "Nacionalidad", val: candidate.nationality },
                { label: "Fecha Nacimiento", val: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : null },
                { label: "Lugar Nacimiento", val: candidate.birthPlace },
                { label: "Pasaporte", val: candidate.passportNumber },
                { label: "Exp. Pasaporte", val: candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : null },
                { label: "PESEL", val: candidate.peselNumber },
                { label: "Karta Pobytu", val: candidate.kartaPobytuNumber },
                { label: "Exp. Karta", val: candidate.kartaPobytuExpiry ? new Date(candidate.kartaPobytuExpiry).toLocaleDateString() : null },
                { label: "Dirección PL", val: candidate.polishAddress },
                { label: "Ciudad PL", val: candidate.polishCity },
                { label: "Llegada", val: candidate.arrivalDate ? new Date(candidate.arrivalDate).toLocaleDateString() : null },
                { label: "Alojamiento", val: candidate.accommodation },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</div>
                  <div className="font-bold text-gray-900">{item.val || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-blue-600" />
                Documentación Subida
              </h2>
              {role !== "LEGAL" && <DocumentUploadButton candidateId={candidate.id} />}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Número</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Expiración</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidate.documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                        No se han cargado documentos aún.
                      </td>
                    </tr>
                  ) : (
                    candidate.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{doc.type}</td>
                        <td className="px-6 py-4 text-sm font-mono">{doc.number || "—"}</td>
                        <td className="px-6 py-4 text-sm">
                          {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {doc.isVerified ? 'Verificado' : doc.ocrStatus || 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors"
                            >Ver</a>
                            {role !== "LEGAL" && <DeleteDocumentButton documentId={doc.id} />}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Status & Actions */}
        <div className="space-y-8">
          {/* Document Checklist */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Estado de Documentación</h3>
            <div className="space-y-4">
              {checklist.required.map((req) => (
                <div key={req} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    {checklist.uploaded.includes(req as Parameters<typeof checklist.uploaded.includes>[0]) ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                        <XCircle size={14} />
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-700">{req}</span>
                  </div>
                  {!checklist.uploaded.includes(req as Parameters<typeof checklist.uploaded.includes>[0]) && (
                    <span className="text-[10px] font-black text-red-500 uppercase">Faltante</span>
                  )}
                </div>
              ))}
            </div>

            {checklist.warnings.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase">
                  <AlertTriangle size={14} /> Advertencias
                </div>
                <ul className="text-xs text-amber-800 space-y-1">
                  {checklist.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Action Center */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Centro de Acciones</h3>
            
            {/* Legal Actions */}
            {["LEGAL", "ADMIN", "SUPERADMIN"].includes(role) && (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                <h4 className="text-xs font-bold text-blue-700 uppercase">Revisión Legal</h4>
                <RequestLegalReview 
                  candidateId={candidate.id} 
                  currentStatus={candidate.status} 
                />
              </div>
            )}

            {/* General Actions */}
            <div className="space-y-4">
              <UpdatePaymentStatus 
                candidateId={candidate.id} 
                initialValue={candidate.paid400pln} 
              />
              
              <div className="h-px bg-gray-100 my-4"></div>
              
              <UpdateNotes 
                candidateId={candidate.id} 
                initialNotes={candidate.notes || ""} 
              />
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Historial de Estados</h3>
            <div className="space-y-6">
              {candidate.statusHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay registros de historial.</p>
              ) : (
                candidate.statusHistory.slice(0, 5).map((h, i) => (
                  <div key={h.id} className="relative pl-6 pb-6 last:pb-0">
                    {i !== Math.min(candidate.statusHistory.length, 5) - 1 && (
                      <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-200"></div>
                    )}
                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900">{h.toStatus.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</span>
                      </div>
                      {h.reason && <p className="text-xs text-gray-500">{h.reason}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <AuditTimeline logs={auditLogs as React.ComponentProps<typeof AuditTimeline>['logs']} />
          </div>
        </div>
      </div>
    </div>
  );
}
