import { UserCircle, LogOut } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { auth, signOut } from "@/auth";
import GlobalSearch from "./GlobalSearch";
import { prisma } from "@/lib/prisma";

export default async function Header() {
  const session = await auth();
  if (!session) return null;

  const organization = session.user.organizationId 
    ? await prisma.organization.findUnique({ where: { id: session.user.organizationId }, select: { name: true } })
    : null;

  return (
    <header className="header" style={{ padding: '0.75rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        <GlobalSearch />
        {organization && (
          <span className="badge">
            {organization.name}
          </span>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <NotificationsDropdown />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          padding: '0.4rem 0.75rem', 
          border: '2px solid var(--pitch-black)',
          backgroundColor: 'var(--white-smoke)',
          boxShadow: '3px 3px 0px var(--pitch-black)'
        }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1 }}>{session.user.name}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--muted)', textTransform: 'uppercase', lineHeight: 1 }}>{session.user.role}</div>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <UserCircle size={28} strokeWidth={2.5} />
          </div>
        </div>
 
        <form action={async () => { "use server"; await signOut(); }}>
          <button type="submit" className="icon-button" title="CERRAR SESIÓN" style={{ backgroundColor: '#ffccd5' }}>
            <LogOut size={18} strokeWidth={3} />
          </button>
        </form>
      </div>
    </header>
  );
}
