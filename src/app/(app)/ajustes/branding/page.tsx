import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { normalizeLanguage, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import Image from "next/image";
import Link from "next/link";
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

  async function saveBranding(formData: FormData) {
    "use server";
    const { updateOrganizationBranding } = await import("@/app/actions/settings");
    await updateOrganizationBranding({
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      logoUrl: formData.get("logoUrl") as string,
    });
  }

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

      <div className="card settings-form-card">
        <form action={saveBranding} className="settings-form-grid">
          <div className="settings-field">
            <label htmlFor="logoUrl">{labels("settings.logoUrl")}</label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={org.logoUrl || ""}
              placeholder="https://example.com/logo.png"
              className="input"
            />
            {org.logoUrl && (
              <Image
                src={org.logoUrl}
                alt={labels("settings.logoCurrent")}
                width={160}
                height={48}
                unoptimized
                className="settings-logo-preview"
              />
            )}
          </div>

          <div className="settings-field">
            <label htmlFor="primaryColor">{labels("settings.primaryColor")}</label>
            <div className="settings-color-row">
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={org.primaryColor || "#fcba04"}
                className="settings-color-input"
              />
              <input type="text" defaultValue={org.primaryColor || "#fcba04"} className="input settings-color-copy" readOnly />
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="secondaryColor">{labels("settings.secondaryColor")}</label>
            <div className="settings-color-row">
              <input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                defaultValue={org.secondaryColor || "#1a1a1a"}
                className="settings-color-input"
              />
              <input type="text" defaultValue={org.secondaryColor || "#1a1a1a"} className="input settings-color-copy" readOnly />
            </div>
          </div>

          <div className="settings-form-footer">
            <button type="submit" className="button settings-submit-button">
              {labels("settings.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
