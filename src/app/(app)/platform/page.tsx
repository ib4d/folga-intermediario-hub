import { auth } from "@/auth";
import PlatformStatusCard from "@/components/PlatformStatusCard";
import { normalizeLanguage, t } from "@/lib/i18n";
import { getProviderStatus } from "@/lib/provider-status";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity, Building2, FileText, Users } from "lucide-react";

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const providerStatus = getProviderStatus();
  const { storage, ocr } = providerStatus;

  const [orgs, stats] = await Promise.all([
    prisma.organization.findMany({
      include: {
        _count: {
          select: { memberships: true, candidates: true, documents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.aggregate({
      _count: { _all: true },
    }),
  ]);

  const totalUsers = await prisma.user.count();
  const totalCandidates = await prisma.candidate.count();

  return (
    <div style={{ padding: "2rem" }}>
      <div className="hero-section" style={{ marginBottom: "2rem" }}>
        <h1>{labels("platform.title")}</h1>
        <p>{labels("platform.description")}</p>
      </div>

      <PlatformStatusCard
        title={labels("platform.systemStatusTitle")}
        description={labels("platform.systemStatusDescription")}
        databaseLabel={labels("platform.systemStatusDatabase")}
        databaseValue="OK"
        healthLabel={labels("platform.systemStatusHealth")}
        healthValue="OK"
        providersLabel={labels("platform.systemStatusProviders")}
        providersValue={`${storage.statusLabel} · ${ocr.statusLabel}`}
        openHealthLabel={labels("platform.systemStatusOpenHealth")}
        openProvidersLabel={labels("platform.systemStatusOpenProviders")}
      />

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.organizations")}</h3>
            <Building2 size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>{stats._count._all}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.totalUsers")}</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>{totalUsers}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.totalCandidates")}</h3>
            <FileText size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>{totalCandidates}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{labels("platform.activeTenants")}</h2>
          <Activity size={20} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.organization")}</th>
                <th>{labels("platform.plan")}</th>
                <th>{labels("platform.status")}</th>
                <th>{labels("platform.users")}</th>
                <th>{labels("platform.candidates")}</th>
                <th>{labels("platform.documents")}</th>
                <th>{labels("platform.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td style={{ fontWeight: "bold" }}>
                    {org.name}
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{org.slug}</div>
                  </td>
                  <td>
                    <span
                      className="status-badge active"
                      style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}
                    >
                      {org.plan}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${org.isActive ? "active" : ""}`}>
                      {org.isActive ? labels("platform.active") : labels("platform.inactive")}
                    </span>
                  </td>
                  <td>{org._count.memberships}</td>
                  <td>{org._count.candidates}</td>
                  <td>{org._count.documents}</td>
                  <td>{org.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
