import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { canAccessModule } from "@/lib/permissions";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BrandingSettingsPage() {
  const tenant = await requireTenant();
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
    <div style={{ padding: "2rem", maxWidth: "640px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/ajustes" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem" }}>
          ← Volver a Ajustes
        </Link>
        <h1 style={{ marginTop: "0.5rem" }}>Branding de la Organización</h1>
        <p style={{ opacity: 0.7 }}>Personaliza la apariencia de tu espacio de trabajo.</p>
      </div>

      <div className="card">
        <form action={saveBranding} style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <label htmlFor="logoUrl" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
              URL del Logo
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={org.logoUrl || ""}
              placeholder="https://example.com/logo.png"
              className="input"
              style={{ width: "100%" }}
            />
            {org.logoUrl && (
              <Image
                src={org.logoUrl}
                alt="Logo actual"
                width={160}
                height={48}
                unoptimized
                style={{ marginTop: "0.75rem", height: "48px", objectFit: "contain" }}
              />
            )}
          </div>

          <div>
            <label htmlFor="primaryColor" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Color Primario
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={org.primaryColor || "#fcba04"}
                style={{ height: "42px", width: "80px", border: "none", cursor: "pointer", borderRadius: "8px" }}
              />
              <input
                type="text"
                defaultValue={org.primaryColor || "#fcba04"}
                placeholder="#fcba04"
                className="input"
                style={{ flex: 1 }}
                readOnly
              />
            </div>
          </div>

          <div>
            <label htmlFor="secondaryColor" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Color Secundario
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                defaultValue={org.secondaryColor || "#1a1a1a"}
                style={{ height: "42px", width: "80px", border: "none", cursor: "pointer", borderRadius: "8px" }}
              />
              <input
                type="text"
                defaultValue={org.secondaryColor || "#1a1a1a"}
                placeholder="#1a1a1a"
                className="input"
                style={{ flex: 1 }}
                readOnly
              />
            </div>
          </div>

          <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--muted)" }}>
            <button type="submit" className="button" style={{ width: "100%" }}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
