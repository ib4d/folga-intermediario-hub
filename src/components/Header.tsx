import { UserCircle, LogOut } from "lucide-react";
import Link from "next/link";
import NotificationsDropdown from "./NotificationsDropdown";
import { auth, signOut } from "@/auth";
import GlobalSearch from "./GlobalSearch";
import { prisma } from "@/lib/prisma";
import { normalizeLanguage, t } from "@/lib/i18n";

function getRoleLabel(role: string, language: ReturnType<typeof normalizeLanguage>) {
  switch (role) {
    case "SUPERADMIN":
      return t(language, "role.superadmin");
    case "ADMIN":
      return t(language, "role.admin");
    case "INTERMEDIARIO":
      return t(language, "role.intermediario");
    case "LEGAL":
      return t(language, "role.legal");
    case "LOGISTICA":
      return t(language, "role.logistica");
    default:
      return role;
  }
}

type BillingAttention = {
  status: string;
  currentPeriodEnd: Date | null;
};

type HeaderOrganization = {
  name: string;
  billingAttention: BillingAttention | null;
};

async function getHeaderOrganization(organizationId: string | null | undefined): Promise<HeaderOrganization | null> {
  if (!organizationId) return null;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        plan: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!organization) {
      return null;
    }

    const status = organization.subscription?.status?.toLowerCase() ?? "missing";
    const isHealthy = organization.plan === "FREE" || ["active", "trialing"].includes(status);

    return {
      name: organization.name,
      billingAttention: isHealthy
        ? null
        : {
            status,
            currentPeriodEnd: organization.subscription?.currentPeriodEnd ?? null,
          },
    };
  } catch (error) {
    console.error("[Header] Organization lookup failed", error);
    return null;
  }
}

function getBillingAttentionStatusLabel(status: string, language: ReturnType<typeof normalizeLanguage>) {
  switch (status) {
    case "missing":
      return t(language, "billing.subscriptionAttentionStatusMissing");
    case "past_due":
      return t(language, "billing.subscriptionAttentionStatusPastDue");
    case "canceled":
      return t(language, "billing.subscriptionAttentionStatusCanceled");
    case "unpaid":
      return t(language, "billing.subscriptionAttentionStatusUnpaid");
    case "incomplete":
    case "incomplete_expired":
      return t(language, "billing.subscriptionAttentionStatusIncomplete");
    default:
      return t(language, "billing.subscriptionAttentionStatusUnknown");
  }
}

export default async function Header() {
  const session = await auth();
  if (!session) return null;

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const organization = await getHeaderOrganization(session.user.organizationId);
  const labels = t.bind(null, language);
  const dateFormatter = new Intl.DateTimeFormat(language, { dateStyle: "medium" });

  return (
    <div>
      {organization?.billingAttention ? (
        <div
          style={{
            borderBottom: "1px solid rgba(185, 28, 28, 0.2)",
            background: "linear-gradient(90deg, rgba(254, 242, 242, 0.95), rgba(255, 247, 237, 0.95))",
            padding: "0.75rem 1rem",
            color: "var(--pitch-black)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: "0.15rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase", color: "#991b1b" }}>
                {labels("billing.subscriptionAttentionTitle")}
              </div>
              <div style={{ fontWeight: 700, lineHeight: 1.45 }}>
                {labels("billing.subscriptionAttentionMessage")}
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.72)" }}>
                {labels("billing.subscriptionAttentionStatus").replace(
                  "{status}",
                  getBillingAttentionStatusLabel(organization.billingAttention.status, language),
                )}
              </div>
              {organization.billingAttention.currentPeriodEnd ? (
                <div style={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.72)" }}>
                  {labels("billing.subscriptionAttentionPeriodEnd").replace(
                    "{date}",
                    dateFormatter.format(organization.billingAttention.currentPeriodEnd),
                  )}
                </div>
              ) : null}
            </div>
            <Link href="/billing" className="button" style={{ textDecoration: "none" }}>
              {labels("billing.manageStripe")}
            </Link>
          </div>
        </div>
      ) : null}

      <header className="header">
        <div className="header-primary">
          <GlobalSearch />
          {organization?.name ? (
            <span className="badge org-badge" title={organization.name}>
              {organization.name}
            </span>
          ) : null}
        </div>

        <div className="header-actions">
          <NotificationsDropdown language={language} />

          <div
            className="user-chip"
            style={{
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div
              className="user-chip-text"
              style={{
                textAlign: "right",
                display: "flex",
                flexDirection: "column",
                gap: "0.1rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {session.user.name}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {getRoleLabel(session.user.role, language)}
              </div>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <UserCircle size={28} strokeWidth={2.2} />
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button
              type="submit"
              className="icon-button"
              title={t(language, "header.logout")}
              style={{ backgroundColor: "#fff1f2", color: "#991b1b" }}
            >
              <LogOut size={18} strokeWidth={3} />
            </button>
          </form>
        </div>
      </header>
    </div>
  );
}
