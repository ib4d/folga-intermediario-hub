import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CreditCard, ExternalLink, Zap } from "lucide-react";
import Link from "next/link";
import { getPlanLimits } from "@/lib/billing/limits";
import { getStripePortalUrl, isStripeConfigured } from "@/lib/billing/stripe";
import { canAccessModule } from "@/lib/permissions";
import { redirect } from "next/navigation";

function formatLimit(value: number) {
  return value === Infinity ? "Ilimitado" : value.toLocaleString("es-ES");
}

function usagePercent(used: number, limit: number) {
  if (limit === Infinity) return 0;
  return Math.min((used / limit) * 100, 100);
}

export default async function BillingPage() {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "billing")) redirect("/sin-permisos");
  const stripeConfigured = isStripeConfigured();
  const portalUrl = getStripePortalUrl();

  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    include: { subscription: true },
  });

  if (!organization) return null;

  const limits = getPlanLimits(organization.plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [candidateUsage, userUsage, documentUsage, ocrUsage] = await Promise.all([
    prisma.candidate.count({ where: { organizationId: tenant.organizationId } }),
    prisma.membership.count({ where: { organizationId: tenant.organizationId, isActive: true } }),
    prisma.document.count({ where: { organizationId: tenant.organizationId, createdAt: { gte: startOfMonth } } }),
    prisma.auditLog.count({
      where: {
        organizationId: tenant.organizationId,
        action: { in: ["OCR_EXTRACTED_PENDING_REVIEW", "OCR_FAILED"] },
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  return (
    <div className="content-shell">
      <section className="hero-section">
        <h1>Suscripcion y Facturacion</h1>
        <p>Gestiona el plan, limites operativos y estado de pagos de la organizacion.</p>
      </section>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>Plan Actual</h3>
            <Zap size={24} color="var(--amber-flame)" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--pitch-black)", marginBottom: "1rem" }}>
            {organization.plan}
          </div>
          <Link href="/billing/plans" className="button" style={{ width: "100%" }}>
            Cambiar Plan
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Metodo de Pago</h3>
            <CreditCard size={24} />
          </div>
          <div style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--muted-foreground)" }}>
            {organization.subscription?.provider
              ? `Gestionado via ${organization.subscription.provider}`
              : stripeConfigured
                ? "Stripe configurado, sin suscripcion activa"
                : "Stripe pendiente de configurar"}
          </div>
          {portalUrl ? (
            <a className="button button-secondary" style={{ width: "100%" }} href={portalUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Gestionar en Stripe
            </a>
          ) : (
            <button className="button button-secondary" style={{ width: "100%" }} disabled>
              Portal Stripe no disponible
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Uso de Limites</h2>
        </div>
        <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
          <UsageBar label="Candidatos" used={candidateUsage} limit={limits.candidates} />
          <UsageBar label="Usuarios" used={userUsage} limit={limits.users} />
          <UsageBar label="Documentos este ciclo" used={documentUsage} limit={limits.documentsPerMonth} />
          <UsageBar label="OCR este ciclo" used={ocrUsage} limit={limits.ocrPerMonth} />
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", gap: "1rem" }}>
        <span style={{ fontWeight: 800 }}>{label}</span>
        <span style={{ fontWeight: 800 }}>
          {used.toLocaleString("es-ES")} / {formatLimit(limit)}
        </span>
      </div>
      <div style={{ height: "8px", backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            backgroundColor: "var(--amber-flame)",
            width: `${usagePercent(used, limit)}%`,
          }}
        />
      </div>
    </div>
  );
}
