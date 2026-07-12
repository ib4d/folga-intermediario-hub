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
        <div className="billing-alert">
          <div className="billing-alert-inner">
            <div className="billing-alert-copy">
              <div className="billing-alert-kicker">
                {labels("billing.subscriptionAttentionTitle")}
              </div>
              <div className="billing-alert-message">
                {labels("billing.subscriptionAttentionMessage")}
              </div>
              <div className="billing-alert-meta">
                {labels("billing.subscriptionAttentionStatus").replace(
                  "{status}",
                  getBillingAttentionStatusLabel(organization.billingAttention.status, language),
                )}
              </div>
              {organization.billingAttention.currentPeriodEnd ? (
                <div className="billing-alert-meta">
                  {labels("billing.subscriptionAttentionPeriodEnd").replace(
                    "{date}",
                    dateFormatter.format(organization.billingAttention.currentPeriodEnd),
                  )}
                </div>
              ) : null}
            </div>
            <Link href="/billing" className="button button-link">
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

          <div className="user-chip user-chip-panel">
            <div className="user-chip-text">
              <div className="user-chip-name">
                {session.user.name}
              </div>
              <div className="user-chip-role">
                {getRoleLabel(session.user.role, language)}
              </div>
            </div>
            <div className="user-chip-avatar">
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
              className="icon-button icon-button-danger"
              title={t(language, "header.logout")}
            >
              <LogOut size={18} strokeWidth={3} />
            </button>
          </form>
        </div>
      </header>
    </div>
  );
}
