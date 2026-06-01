import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardCharts from "@/components/DashboardCharts";
import ExportButton from "@/components/ExportButton";
import DashboardOverview from "@/components/DashboardOverview";
import ExpandableText from "@/components/ui/ExpandableText";
import ProviderStatusCard from "@/components/ProviderStatusCard";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { normalizeLanguage, t } from "@/lib/i18n";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { getCandidateOperationalAlerts } from "@/lib/operational-alerts-shared";
import { getProviderStatus } from "@/lib/provider-status";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);
  const providerStatus = getProviderStatus();
  const { storage, availableStorage, availableOcr, manualOcrMode } = providerStatus;

  const tenant = await requireTenant();
  const whereClause = candidateVisibilityWhere(tenant);

  const [total, recopilando, enRevision, aprobados, recientes, byStatusRaw, byCountryRaw, stuckCandidates, documentHealthCandidates] =
    await Promise.all([
      prisma.candidate.count({ where: whereClause }),
      prisma.candidate.count({ where: candidateVisibilityWhere(tenant, { status: "RECOPILANDO_DOCS" }) }),
      prisma.candidate.count({ where: candidateVisibilityWhere(tenant, { status: "EN_REVISION_LEGAL" }) }),
      prisma.candidate.count({ where: candidateVisibilityWhere(tenant, { status: "APROBADO" }) }),
      prisma.candidate.findMany({
        where: whereClause,
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { intermediary: { select: { name: true } } },
      }),
      prisma.candidate.groupBy({ by: ["status"], where: whereClause, _count: { _all: true } }),
      prisma.candidate.groupBy({ by: ["country"], where: whereClause, _count: { _all: true } }),
      (async () => {
        // eslint-disable-next-line react-hooks/purity
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return prisma.candidate.findMany({
          where: candidateVisibilityWhere(tenant, {
            updatedAt: { lte: sevenDaysAgo },
            status: { notIn: ["APROBADO", "RECHAZADO"] }
          }),
          take: 3,
          select: { id: true, firstName: true, lastName: true, status: true, updatedAt: true }
        });
      })(),
      prisma.candidate.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          birthPlace: true,
          birthCountry: true,
          citizenship: true,
          nationality: true,
          heightCm: true,
          country: true,
          locationStatus: true,
          polishAddress: true,
          polishCity: true,
          passportNumber: true,
          passportIssueDate: true,
          passportExpiry: true,
          passportBiometric: true,
          kartaPobytuNumber: true,
          kartaPobytuIssueDate: true,
          kartaPobytuExpiry: true,
          kartaPobytuType: true,
          peselNumber: true,
          voivodatoNumber: true,
          voivodatoIssueDate: true,
          voivodatoExpiry: true,
          voivodatoStatus: true,
          recruitmentSource: true,
          recruiterId: true,
          arrivalDate: true,
          accommodation: true,
          accommodationNotes: true,
          arrivalNotes: true,
          status: true,
          rejectionReason: true,
          notes: true,
          paid400pln: true,
          paymentDate: true,
          gdprConsent: true,
          gdprConsentDate: true,
          intermediaryId: true,
          selfRegistered: true,
          registrationToken: true,
          ocrProcessed: true,
          ocrSource: true,
          organizationId: true,
          dataRetentionUntil: true,
          isArchived: true,
          reviewNotes: true,
          score: true,
          scoreLevel: true,
          scoreUpdatedAt: true,
          createdAt: true,
          updatedAt: true,
          documents: true,
          logistics: true,
        },
      }),
    ]);

  const checklistSummaries = documentHealthCandidates.map((candidate) =>
    getCandidateDocumentChecklist(candidate as Parameters<typeof getCandidateDocumentChecklist>[0]),
  );
  const legalOutcomeSummaries = documentHealthCandidates
    .map((candidate) => ({
      candidate,
      outcome: getCandidateLegalOutcome(candidate),
      checklist: getCandidateDocumentChecklist(candidate as Parameters<typeof getCandidateDocumentChecklist>[0]),
      arrivalReadiness: getArrivalReadiness(candidate),
    }))
    .filter((entry) => entry.outcome);
  const arrivalSummaries = documentHealthCandidates.map((candidate) => ({
    candidate,
    arrivalReadiness: getArrivalReadiness(candidate),
    operationalAlerts: getCandidateOperationalAlerts(candidate),
  }));

  const readyForLegal = checklistSummaries.filter((summary) => summary.isReadyForLegal).length;
  const blockedForLegal = checklistSummaries.filter((summary) => !summary.isReadyForLegal).length;
  const expiringSoon = checklistSummaries.reduce((sum, summary) => sum + summary.stats.expiringSoonDocuments, 0);
  const pendingOcr = checklistSummaries.reduce((sum, summary) => sum + summary.stats.pendingReviewDocuments, 0);
  const duplicateGroups = checklistSummaries.reduce((sum, summary) => sum + summary.stats.duplicateGroups, 0);
  const reviewAdditionalCount = documentHealthCandidates.filter((candidate) => candidate.status === "REVISION_ADICIONAL").length;
  const followUpActionCount = legalOutcomeSummaries.reduce((sum, entry) => sum + (entry.outcome?.followUpActions.length ?? 0), 0);
  const outcomeCategoryCounts = legalOutcomeSummaries.reduce<Record<string, number>>((acc, entry) => {
    const category = entry.outcome?.category;
    if (!category) return acc;
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
  const topOutcomeCategories = Object.entries(outcomeCategoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const recentFollowUps = legalOutcomeSummaries
    .sort((a, b) => new Date(b.candidate.updatedAt).getTime() - new Date(a.candidate.updatedAt).getTime())
    .slice(0, 4);
  const readyForArrival = arrivalSummaries.filter((entry) => entry.arrivalReadiness.isReadyForArrival).length;
  const arrivalsToday = arrivalSummaries.filter((entry) =>
    entry.operationalAlerts.some((alert) => alert.type === "LOGISTICS_ARRIVAL_TODAY"),
  ).length;
  const overdueArrivals = arrivalSummaries.filter((entry) =>
    entry.operationalAlerts.some((alert) => alert.type === "LOGISTICS_ARRIVAL_OVERDUE"),
  ).length;
  const missingTransport = arrivalSummaries.filter((entry) =>
    entry.operationalAlerts.some((alert) => alert.type === "LOGISTICS_MISSING_TRANSPORT"),
  ).length;
  const missingAccommodation = arrivalSummaries.filter((entry) =>
    entry.operationalAlerts.some((alert) => alert.type === "LOGISTICS_MISSING_ACCOMMODATION"),
  ).length;
  const missingPickup = arrivalSummaries.filter((entry) =>
    entry.operationalAlerts.some((alert) => alert.type === "LOGISTICS_MISSING_PICKUP"),
  ).length;
  const logisticsAttention = arrivalSummaries
    .filter((entry) => entry.operationalAlerts.length > 0)
    .sort((a, b) => new Date(b.candidate.updatedAt).getTime() - new Date(a.candidate.updatedAt).getTime())
    .slice(0, 4);

  const timelineData = await Promise.all(
    [3, 2, 1, 0].map(async (weeksAgo) => {
      const start = new Date();
      start.setDate(start.getDate() - (weeksAgo + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - weeksAgo * 7);
      const count = await prisma.candidate.count({
        where: candidateVisibilityWhere(tenant, {
          createdAt: { gte: start, lte: end },
        }),
      });
      return { date: `Semana ${weeksAgo + 1}`, count };
    })
  );

  const chartData = {
    byStatus: byStatusRaw.map((s) => ({ name: s.status.replace(/_/g, " "), value: s._count._all })),
    byCountry: byCountryRaw.map((c) => ({ name: c.country, value: c._count._all })),
    byTimeline: timelineData,
  };

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem", fontWeight: 900 }}>{labels("dashboard.emptyTitle")}</h1>
        <p style={{ fontSize: "1.25rem", opacity: 0.7, marginBottom: "2.5rem" }}>
          {labels("dashboard.emptyDescription")}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/candidatos/nuevo" className="button" style={{ padding: '1rem 2rem' }}>
            {labels("dashboard.emptyPrimary")}
          </Link>
          <Link href="/ajustes/branding" className="button button-secondary" style={{ padding: '1rem 2rem', border: '1px solid var(--pitch-black)' }}>
            {labels("dashboard.emptySecondary")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="hero-section"
        style={{
          padding: "2rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>{labels("dashboard.title")}</h1>
          <p style={{ margin: 0, color: "var(--pitch-black)" }}>
            {labels("dashboard.welcomePending")
              .replace("{name}", session.user.name ?? "")
              .replace("{count}", recopilando.toString())}
          </p>
        </div>
        <ExportButton />
      </div>

      <ProviderStatusCard
        title={labels("dashboard.providersTitle")}
        storageLabel={labels("dashboard.storageLabel")}
        storageValue={storage.mode === "local" ? labels("dashboard.storageLocal") : labels("dashboard.storageSupabase")}
        storageNote={
          storage.mode === "local"
            ? labels("dashboard.storageLocalNote")
            : labels("dashboard.storageSupabaseNote")
        }
        storageAvailableLabel={labels("dashboard.providersAvailable")}
        storageAvailableValue={availableStorage.map((provider) => provider.name).join(" / ")}
        ocrLabel={labels("dashboard.ocrLabel")}
        ocrValue={manualOcrMode ? labels("dashboard.ocrManualMode") : labels("dashboard.ocrAutomaticMode")}
        ocrNote={manualOcrMode ? labels("dashboard.ocrManualNote") : labels("dashboard.ocrAutomaticNote")}
        ocrAvailableLabel={labels("dashboard.providersAvailable")}
        ocrAvailableValue={availableOcr.map((provider) => provider.name).join(" / ")}
      />

      <DashboardOverview
        metrics={[
          {
            id: "total-candidatos",
            title: "Total Candidatos",
            value: total,
            href: "/candidatos",
            tone: "default",
            helper: "Base total activa",
            icon: "users",
          },
          {
            id: "recopilando-docs",
            title: "Recopilando Docs",
            value: recopilando,
            href: "/candidatos?status=RECOPILANDO_DOCS",
            tone: "accent",
            helper: "Pendientes documentales",
            icon: "clock",
          },
          {
            id: "en-revision-legal",
            title: "En Revision Legal",
            value: enRevision,
            href: "/legal",
            tone: "default",
            helper: "Casos en mesa legal",
            icon: "alert",
          },
          {
            id: "aprobados",
            title: "Aprobados",
            value: aprobados,
            href: "/logistica",
            tone: "success",
            helper: "Listos para handoff",
            icon: "check",
          },
          {
            id: "listos-legal",
            title: "Listos Para Legal",
            value: readyForLegal,
            href: "/legal",
            tone: "success",
            helper: "Sin bloqueos documentales",
            icon: "check",
          },
          {
            id: "bloqueados",
            title: "Bloqueados",
            value: blockedForLegal,
            href: "/legal",
            tone: "danger",
            helper: "Faltantes o validacion",
            icon: "alert",
          },
          {
            id: "pendientes-ocr",
            title: "Pendientes OCR",
            value: pendingOcr,
            href: "/documentos?status=REVIEW_REQUIRED",
            tone: "accent",
            helper: "Documentos por revisar",
            icon: "clock",
          },
          {
            id: "docs-vencer",
            title: "Docs Por Vencer",
            value: expiringSoon,
            href: "/documentos",
            tone: "default",
            helper: "Expiran en 30 dias",
            icon: "alert",
          },
          {
            id: "duplicados",
            title: "Duplicados",
            value: duplicateGroups,
            href: "/legal",
            tone: "default",
            helper: "Grupos a clasificar",
            icon: "users",
          },
          {
            id: "revision-adicional",
            title: "Revision Adicional",
            value: reviewAdditionalCount,
            href: "/legal?filter=blocked",
            tone: "danger",
            helper: "Casos devueltos",
            icon: "alert",
          },
          {
            id: "acciones-abiertas",
            title: "Acciones Abiertas",
            value: followUpActionCount,
            href: "/legal",
            tone: "accent",
            helper: "Seguimientos activos",
            icon: "clock",
          },
          {
            id: "listos-llegada",
            title: "Listos para Llegada",
            value: readyForArrival,
            href: "/logistica",
            tone: "success",
            helper: "Handoff completo",
            icon: "check",
          },
          {
            id: "llegadas-hoy",
            title: "Llegadas de Hoy",
            value: arrivalsToday,
            href: "/logistica",
            tone: arrivalsToday > 0 ? "accent" : "default",
            helper: "Pendientes de confirmar",
            icon: "clock",
          },
          {
            id: "sin-transporte",
            title: "Sin Transporte",
            value: missingTransport,
            href: "/logistica",
            tone: missingTransport > 0 ? "danger" : "default",
            helper: "Viajes sin programar",
            icon: "alert",
          },
          {
            id: "sin-alojamiento",
            title: "Sin Alojamiento",
            value: missingAccommodation,
            href: "/logistica",
            tone: "danger",
            helper: "Falta asignacion",
            icon: "alert",
          },
          {
            id: "sin-recogida",
            title: "Sin Recogida",
            value: missingPickup,
            href: "/logistica",
            tone: "danger",
            helper: "Falta responsable",
            icon: "clock",
          },
          {
            id: "llegadas-vencidas",
            title: "Llegadas Vencidas",
            value: overdueArrivals,
            href: "/logistica",
            tone: overdueArrivals > 0 ? "danger" : "default",
            helper: "Sin confirmacion operativa",
            icon: "alert",
          },
        ]}
      />

      {(topOutcomeCategories.length > 0 || recentFollowUps.length > 0) ? (
        <div className="card" style={{ marginTop: "2rem" }}>
          <div
            className="card-header"
            style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
          >
            <div>
              <h2 style={{ marginBottom: "0.25rem" }}>Pulso Legal</h2>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
                Categorias recientes y carga de seguimiento para el equipo.
              </p>
            </div>
            <Link href="/legal" className="button" style={{ fontSize: "0.875rem" }}>
              {labels("dashboard.openLegal")}
            </Link>
          </div>

          {topOutcomeCategories.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {topOutcomeCategories.map(([category, count]) => (
                <div
                  key={category}
                  style={{
                    padding: "0.6rem 0.9rem",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "999px",
                    backgroundColor: "var(--white-smoke)",
                    fontWeight: 800,
                    fontSize: "0.8rem",
                  }}
                >
                  {category}: {count}
                </div>
              ))}
            </div>
          ) : null}

          {recentFollowUps.length > 0 ? (
            <div className="dashboard-pulse-grid">
              {recentFollowUps.map(({ candidate, outcome, checklist }) => (
                <Link
                  key={candidate.id}
                  href={`/candidatos/${candidate.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="card dashboard-pulse-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.6rem" }}>
                      <div style={{ fontWeight: 900 }}>
                        {candidate.firstName} {candidate.lastName}
                      </div>
                      <span className="status-badge" style={{ fontSize: "0.65rem" }}>
                        {candidate.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {outcome?.category ? (
                      <div style={{ marginBottom: "0.45rem", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase", color: "#4338ca" }}>
                        {outcome.category}
                      </div>
                    ) : null}
                    {outcome?.summary ? (
                      <ExpandableText maxLength={120} style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--pitch-black)", marginBottom: "0.7rem" }}>
                        {outcome.summary}
                      </ExpandableText>
                    ) : null}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.7rem" }}>
                      {outcome?.followUpActions.length ? (
                        <ExpandableText maxLength={96} style={{ fontSize: "0.72rem", fontWeight: 800, color: "#4338ca" }}>
                          {outcome.followUpActions.join(" | ")}
                        </ExpandableText>
                      ) : null}
                    </div>
                    <div style={{ marginTop: "auto", fontSize: "0.72rem", fontWeight: 700, color: checklist.isReadyForLegal ? "#15803d" : "#b91c1c" }}>
                      {checklist.isReadyForLegal ? "Listo para volver a legal" : `${checklist.blockers.length} bloqueos activos`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {logisticsAttention.length > 0 ? (
        <div className="card" style={{ marginTop: "2rem" }}>
          <div
            className="card-header"
            style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
          >
            <div>
              <h2 style={{ marginBottom: "0.25rem" }}>Pulso de Llegadas</h2>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
                Casos con handoff incompleto antes de aterrizar en logistica.
              </p>
            </div>
            <Link href="/logistica" className="button" style={{ fontSize: "0.875rem" }}>
              {labels("dashboard.openLogistics")}
            </Link>
          </div>

          <div className="dashboard-pulse-grid">
            {logisticsAttention.map(({ candidate, arrivalReadiness, operationalAlerts }) => (
              <Link
                key={candidate.id}
                href={`/candidatos/${candidate.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="card dashboard-pulse-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 900 }}>
                      {candidate.firstName} {candidate.lastName}
                    </div>
                    <span className="status-badge" style={{ fontSize: "0.65rem" }}>
                      {arrivalReadiness.statusLabel.toUpperCase()}
                    </span>
                  </div>
                  {arrivalReadiness.blockers.length > 0 ? (
                    <ExpandableText maxLength={110} style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#991b1b", marginBottom: "0.55rem" }}>
                      {arrivalReadiness.blockers.join(" | ")}
                    </ExpandableText>
                  ) : null}
                  {arrivalReadiness.warnings.length > 0 ? (
                    <ExpandableText maxLength={96} style={{ display: "block", marginTop: "auto", fontSize: "0.78rem", fontWeight: 700, color: "#92400e" }}>
                      {arrivalReadiness.warnings.join(" | ")}
                    </ExpandableText>
                  ) : null}
                  {operationalAlerts.length > 0 ? (
                    <ExpandableText maxLength={100} style={{ display: "block", marginTop: "0.55rem", fontSize: "0.75rem", fontWeight: 700, color: "#92400e" }}>
                      {operationalAlerts.map((alert) => alert.title).join(" · ")}
                    </ExpandableText>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
 
      <DashboardCharts data={chartData} />
 
      {stuckCandidates.length > 0 && (
        <div className="card" style={{ marginTop: "2rem", backgroundColor: "#ffccd5" }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 900 }}>
              <AlertTriangle size={28} strokeWidth={3} /> CANDIDATOS ESTANCADOS (INACTIVOS {'>'} 7 DIAS)
            </h3>
          </div>
          <div className="dashboard-pulse-grid">
            {stuckCandidates.map((c) => (
              <Link key={c.id} href={`/candidatos/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card dashboard-pulse-card" style={{ backgroundColor: 'white' }}>
                  <div style={{ fontWeight: '900', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{c.firstName} {c.lastName}</div>
                  <div className="status-badge" style={{ marginBottom: '0.5rem', fontSize: '0.65rem' }}>{c.status.replace(/_/g, ' ')}</div>
                  <div style={{ marginTop: "auto", fontSize: '0.75rem', fontWeight: 'bold', color: '#b91c1c' }}>SIN CAMBIOS DESDE {new Date(c.updatedAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <div
          className="card-header"
          style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
        >
          <h2>{labels("dashboard.recentCandidates")}</h2>
          <Link href="/candidatos" className="button" style={{ fontSize: "0.875rem" }}>
            {labels("dashboard.viewAll")}
          </Link>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("dashboard.tableName")}</th>
                <th>{labels("dashboard.tableCountry")}</th>
                <th>{labels("dashboard.tableStatus")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {recientes.map((candidate) => (
                <tr key={candidate.id}>
                  <td style={{ fontWeight: "bold" }}>
                    {candidate.firstName} {candidate.lastName}
                  </td>
                  <td>{candidate.country}</td>
                  <td>
                    <span className={`status-badge ${candidate.status === "APROBADO" ? "active" : ""}`}>
                      {candidate.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/candidatos/${candidate.id}`}
                      className="button button-secondary"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    >
                      {labels("dashboard.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

