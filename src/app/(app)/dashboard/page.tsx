import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardCharts from "@/components/DashboardCharts";
import ExportButton from "@/components/ExportButton";
import DashboardOverview from "@/components/DashboardOverview";
import ExpandableText from "@/components/ui/ExpandableText";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
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
      <div className="dashboard-empty-state">
        <h1 className="dashboard-empty-title">{labels("dashboard.emptyTitle")}</h1>
        <p className="dashboard-empty-copy">
          {labels("dashboard.emptyDescription")}
        </p>
        <div className="dashboard-empty-actions">
          <Link href="/candidatos/nuevo" className="button dashboard-empty-button">
            {labels("dashboard.emptyPrimary")}
          </Link>
          <Link href="/ajustes/branding" className="button button-secondary dashboard-empty-button dashboard-empty-button-secondary">
            {labels("dashboard.emptySecondary")}
          </Link>
        </div>
      </div>
    );
  }

  const dashboardIntro = `${labels("dashboard.welcomePending")
    .replace("{name}", session.user.name ?? "")
    .replace("{count}", recopilando.toString())} ${labels("dashboard.focusDescription")}`;

  return (
    <>
      <PageHeader
        title={labels("dashboard.title")}
        eyebrow={labels("dashboard.focusTitle")}
        icon={<AlertTriangle size={14} />}
        description={dashboardIntro}
        actions={<ExportButton />}
      />

      <div className="dashboard-secondary-grid dashboard-metric-band">
        <MetricCard
          title={labels("dashboard.queueDocuments")}
          value={recopilando}
          href="/candidatos?status=RECOPILANDO_DOCS"
          tone="accent"
        />
        <MetricCard
          title={labels("dashboard.queueLegal")}
          value={enRevision}
          href="/legal"
          tone="default"
        />
        <MetricCard
          title={labels("dashboard.queueOcr")}
          value={pendingOcr}
          href="/documentos?status=REVIEW_REQUIRED"
          tone="danger"
        />
        <MetricCard
          title={labels("dashboard.queueLogistics")}
          value={readyForArrival}
          href="/logistica"
          tone="success"
        />
      </div>

      <div className="card dashboard-section-card">
        <div className="dashboard-section-header">
          <div>
            <h2 className="dashboard-section-title">{labels("dashboard.quickActionsTitle")}</h2>
            <p className="dashboard-section-description">{labels("dashboard.quickActionsDescription")}</p>
          </div>
        </div>
        <div className="page-section-actions">
          <Link href="/candidatos/nuevo" className="button">
            {labels("dashboard.quickActionCandidate")}
          </Link>
          <Link href="/documentos" className="button button-secondary">
            {labels("dashboard.quickActionDocuments")}
          </Link>
          <Link href="/legal" className="button button-secondary">
            {labels("dashboard.quickActionLegal")}
          </Link>
          <Link href="/logistica" className="button button-secondary">
            {labels("dashboard.quickActionLogistics")}
          </Link>
        </div>
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
        storageAvailableValue={availableStorage.map((provider) => provider.statusLabel)}
        ocrLabel={labels("dashboard.ocrLabel")}
        ocrValue={manualOcrMode ? labels("dashboard.ocrManualMode") : labels("dashboard.ocrAutomaticMode")}
        ocrNote={manualOcrMode ? labels("dashboard.ocrManualNote") : labels("dashboard.ocrAutomaticNote")}
        ocrAvailableLabel={labels("dashboard.providersAvailable")}
        ocrAvailableValue={availableOcr.map((provider) => provider.statusLabel)}
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
            title: "En revisión legal",
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
            title: "Listos para legal",
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
            helper: "Faltantes o validación",
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
            title: "Docs por vencer",
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
            title: "Revisión adicional",
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
            helper: "Falta asignación",
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
            title: "Llegadas vencidas",
            value: overdueArrivals,
            href: "/logistica",
            tone: overdueArrivals > 0 ? "danger" : "default",
            helper: "Sin confirmación operativa",
            icon: "alert",
          },
        ]}
      />

      {(topOutcomeCategories.length > 0 || recentFollowUps.length > 0) ? (
        <div className="card dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2 className="dashboard-section-title">Pulso legal</h2>
              <p className="dashboard-section-description">
                Categorías recientes y carga de seguimiento para el equipo.
              </p>
            </div>
            <Link href="/legal" className="button dashboard-section-link">
              {labels("dashboard.openLegal")}
            </Link>
          </div>

          {topOutcomeCategories.length > 0 ? (
            <div className="dashboard-pill-list">
              {topOutcomeCategories.map(([category, count]) => (
                <div key={category} className="dashboard-pill">
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
                  className="dashboard-pulse-link"
                >
                  <div className="card dashboard-pulse-card">
                    <div className="dashboard-pulse-card-head">
                      <div className="dashboard-pulse-name">
                        {candidate.firstName} {candidate.lastName}
                      </div>
                      <span className="status-badge dashboard-pulse-status">
                        {candidate.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {outcome?.category ? (
                      <div className="dashboard-pulse-category">
                        {outcome.category}
                      </div>
                    ) : null}
                    {outcome?.summary ? (
                      <ExpandableText maxLength={120} className="dashboard-pulse-summary">
                        {outcome.summary}
                      </ExpandableText>
                    ) : null}
                    <div className="dashboard-pulse-actions">
                      {outcome?.followUpActions.length ? (
                        <ExpandableText maxLength={96} className="dashboard-pulse-actions-text">
                          {outcome.followUpActions.join(" | ")}
                        </ExpandableText>
                      ) : null}
                    </div>
                    <div className={`dashboard-pulse-footer ${checklist.isReadyForLegal ? "dashboard-pulse-footer--ready" : "dashboard-pulse-footer--blocked"}`}>
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
        <div className="card dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2 className="dashboard-section-title">Pulso de llegadas</h2>
              <p className="dashboard-section-description">
                Casos con handoff incompleto antes de aterrizar en logística.
              </p>
            </div>
            <Link href="/logistica" className="button dashboard-section-link">
              {labels("dashboard.openLogistics")}
            </Link>
          </div>

          <div className="dashboard-pulse-grid">
            {logisticsAttention.map(({ candidate, arrivalReadiness, operationalAlerts }) => (
              <Link
                key={candidate.id}
                href={`/candidatos/${candidate.id}`}
                className="dashboard-pulse-link"
              >
                <div className="card dashboard-pulse-card">
                  <div className="dashboard-pulse-card-head">
                    <div className="dashboard-pulse-name">
                      {candidate.firstName} {candidate.lastName}
                    </div>
                    <span className="status-badge dashboard-pulse-status">
                      {arrivalReadiness.statusLabel.toUpperCase()}
                    </span>
                  </div>
                  {arrivalReadiness.blockers.length > 0 ? (
                    <ExpandableText maxLength={110} className="dashboard-pulse-summary dashboard-pulse-summary--danger">
                      {arrivalReadiness.blockers.join(" | ")}
                    </ExpandableText>
                  ) : null}
                  {arrivalReadiness.warnings.length > 0 ? (
                    <ExpandableText maxLength={96} className="dashboard-pulse-summary dashboard-pulse-summary--warning">
                      {arrivalReadiness.warnings.join(" | ")}
                    </ExpandableText>
                  ) : null}
                  {operationalAlerts.length > 0 ? (
                    <ExpandableText maxLength={100} className="dashboard-pulse-alerts">
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
          <div className="card dashboard-section-card dashboard-alert-card">
          <div className="card-header dashboard-alert-header">
            <h3 className="dashboard-alert-title">
              <AlertTriangle size={28} strokeWidth={3} /> CANDIDATOS ESTANCADOS (INACTIVOS {'>'} 7 DÍAS)
            </h3>
          </div>
          <div className="dashboard-pulse-grid">
            {stuckCandidates.map((c) => (
              <Link key={c.id} href={`/candidatos/${c.id}`} className="dashboard-pulse-link">
                <div className="card dashboard-pulse-card dashboard-pulse-card--white">
                  <div className="dashboard-pulse-name dashboard-pulse-name--stuck">{c.firstName} {c.lastName}</div>
                  <div className="status-badge dashboard-pulse-status">{c.status.replace(/_/g, ' ')}</div>
                  <div className="dashboard-pulse-footer dashboard-pulse-footer--blocked">SIN CAMBIOS DESDE {new Date(c.updatedAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card dashboard-section-card">
          <div className="dashboard-section-header">
          <h2>{labels("dashboard.recentCandidates")}</h2>
          <Link href="/candidatos" className="button dashboard-section-link">
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
                  <td className="dashboard-table-name">
                    {candidate.firstName} {candidate.lastName}
                  </td>
                  <td>{candidate.country}</td>
                  <td>
                    <span className={`status-badge ${candidate.status === "APROBADO" ? "active" : ""}`}>
                      {candidate.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="dashboard-table-actions">
                    <Link
                      href={`/candidatos/${candidate.id}`}
                      className="button button-secondary dashboard-table-action"
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

