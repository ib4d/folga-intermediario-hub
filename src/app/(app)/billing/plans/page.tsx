import { requireTenant } from "@/lib/tenant";
import { PLAN_LIMITS } from "@/lib/billing/limits";
import { getStripePaymentLink } from "@/lib/billing/stripe";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Plan } from "@prisma/client";
import { canAccessModule } from "@/lib/permissions";
import { redirect } from "next/navigation";

const plans: Array<{ name: Plan; price: string; desc: string }> = [
  { name: Plan.FREE, price: "0 EUR", desc: "Para validar la operacion inicial." },
  { name: Plan.STARTER, price: "49 EUR", desc: "Para agencias pequenas con flujo activo." },
  { name: Plan.PRO, price: "149 EUR", desc: "Para equipos con OCR y revision legal recurrente." },
  { name: Plan.BUSINESS, price: "399 EUR", desc: "Para operaciones multi-equipo y alto volumen." },
];

function formatLimit(value: number, label: string) {
  return value === Infinity ? `${label} ilimitados` : `${value.toLocaleString("es-ES")} ${label}`;
}

export default async function PlansPage() {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "billing")) redirect("/sin-permisos");

  return (
    <div className="content-shell">
      <section className="hero-section" style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1>Planes y Precios</h1>
        <p>Escala ORI CRUIT HUB segun volumen real de candidatos, usuarios y documentos.</p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
        {plans.map((plan) => {
          const limits = PLAN_LIMITS[plan.name];
          const paymentLink = getStripePaymentLink(plan.name);
          const isRecommended = plan.name === Plan.PRO;

          return (
            <div
              key={plan.name}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "440px",
                border: isRecommended ? "2px solid var(--amber-flame)" : "1px solid var(--border-subtle)",
                backgroundColor: "white",
                color: "var(--pitch-black)",
                position: "relative",
              }}
            >
              {isRecommended ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: "var(--amber-flame)",
                    color: "var(--pitch-black)",
                    padding: "0.4rem 0.7rem",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  Recomendado
                </div>
              ) : null}

              <div style={{ marginBottom: "1.5rem", paddingRight: isRecommended ? "5rem" : 0 }}>
                <h2 style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>{plan.name}</h2>
                <div style={{ fontSize: "2.1rem", fontWeight: 900, marginBottom: "0.5rem" }}>
                  {plan.price}
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted-foreground)" }}>/mes</span>
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--muted-foreground)", margin: 0 }}>{plan.desc}</p>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem", flex: 1 }}>
                {[
                  formatLimit(limits.candidates, "candidatos"),
                  formatLimit(limits.users, "usuarios"),
                  formatLimit(limits.ocrPerMonth, "lecturas OCR/mes"),
                  formatLimit(limits.documentsPerMonth, "documentos/mes"),
                  "Dashboard operativo",
                  "Soporte por email",
                ].map((feature) => (
                  <li key={feature} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.name === Plan.FREE ? (
                <button className="button button-secondary" style={{ width: "100%", marginTop: "1.5rem" }} disabled>
                  Plan inicial
                </button>
              ) : paymentLink ? (
                <a className="button" href={paymentLink} target="_blank" rel="noreferrer" style={{ width: "100%", marginTop: "1.5rem" }}>
                  <ExternalLink size={16} />
                  Seleccionar Plan
                </a>
              ) : (
                <button className="button button-secondary" style={{ width: "100%", marginTop: "1.5rem" }} disabled>
                  Stripe pendiente
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
