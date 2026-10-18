import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { normalizeLanguage, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import Link from "next/link";
import BrandingSettingsForm from "@/components/BrandingSettingsForm";
import { redirect } from "next/navigation";

export default async function BrandingSettingsPage() {
  const session = await auth();
  const tenant = await requireTenant();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  if (!canAccessModule(tenant.role, "branding")) redirect("/sin-permisos");

  const org = await prisma.organization.findUnique({
    where: { id: tenant.organizationId! },
    select: { name: true, primaryColor: true, secondaryColor: true, logoUrl: true },
  });

  if (!org) return null;

  return (
    <div className="settings-detail-page settings-detail-page--narrow">
      <div className="settings-detail-header">
        <div>
          <Link href="/ajustes" className="settings-back-link">
            {labels("settings.backToSettings")}
          </Link>
          <h1>{labels("settings.brandingTitle")}</h1>
          <p>{labels("settings.brandingDescription")}</p>
        </div>
      </div>

      <BrandingSettingsForm
        organizationName={org.name}
        primaryColor={org.primaryColor || "#e4ff4d"}
        secondaryColor={org.secondaryColor || "#00513f"}
        logoUrl={org.logoUrl || ""}
        language={language}
      />
    </div>
  );
}
