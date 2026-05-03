import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createOrganizationAction } from "@/app/actions/organization";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  // If already has organization, skip onboarding
  if (session.user.organizationId) redirect("/dashboard");

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-deep)',
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 900, 
            background: 'var(--amber-gradient)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            ¡BIENVENIDO A FOLGA HUB!
          </div>
          <p style={{ opacity: 0.8 }}>Configura tu organización para empezar</p>
        </div>

        <form action={createOrganizationAction} style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Nombre de tu Empresa / Agencia</label>
            <input 
              name="name" 
              type="text" 
              placeholder="Ej: Folga Recruitment" 
              required 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)' }}
            />
          </div>

          <button type="submit" className="button" style={{ 
            width: '100%', 
            padding: '1rem', 
            fontWeight: 'bold',
            marginTop: '1rem',
            background: 'var(--amber-gradient)',
            border: 'none'
          }}>
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
