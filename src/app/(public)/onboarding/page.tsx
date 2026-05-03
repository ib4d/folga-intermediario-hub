import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  // If already has organization, skip onboarding
  if (session.user.organizationId) redirect("/dashboard");

  async function createOrg(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autorizado");

    const name = formData.get("name") as string;
    if (!name || name.trim().length < 3) {
        throw new Error("El nombre de la organización debe tener al menos 3 caracteres.");
    }

    let slug = name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    
    if (!slug) slug = `org-${Math.random().toString(36).substring(2, 7)}`;

    try {
        // We use 'any' casting here because the Prisma Client generation is being blocked 
        // by the active dev server, causing stale types in the IDE/Build.
        const org = await (prisma as any).$transaction(async (tx: any) => {
            // Check if slug exists
            const existing = await tx.organization.findUnique({ where: { slug } });
            const finalSlug = existing ? `${slug}-${Math.random().toString(36).substring(2, 5)}` : slug;

            const newOrg = await tx.organization.create({
                data: {
                    name,
                    slug: finalSlug,
                    memberships: {
                        create: {
                            userId: session.user.id,
                            role: "SUPERADMIN",
                            isActive: true
                        }
                    }
                }
            });

            // 2. Update user's organization context
            await tx.user.update({
                where: { id: session.user.id },
                data: { 
                    organizationId: newOrg.id, 
                    role: "SUPERADMIN" 
                }
            });

            return newOrg;
        });

        console.log(`[Onboarding] Organization created: ${org.name} (${org.id})`);
    } catch (error) {
        console.error("[Onboarding] Error creating organization:", error);
        throw new Error("Hubo un error al crear la organización. Por favor intente de nuevo.");
    }

  revalidatePath("/", "layout");
  redirect("/dashboard");
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--pitch-black)' }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '3rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 900 }}>Bienvenido a Folga Hub</h1>
          <p style={{ opacity: 0.7 }}>Para comenzar, necesitamos crear tu organización.</p>
        </div>

        <form action={createOrg} style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Nombre de la Empresa / Agencia</label>
            <input 
              name="name" 
              type="text" 
              placeholder="Ej: Mi Agencia de Reclutamiento" 
              required 
              minLength={3}
              className="input"
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>

          <button type="submit" className="button" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            CREAR ORGANIZACIÓN
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>
          Al crear una organización, aceptas nuestros términos de servicio y políticas de privacidad para SaaS.
        </p>
      </div>
    </div>
  );
}
