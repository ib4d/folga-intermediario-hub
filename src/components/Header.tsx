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
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <GlobalSearch />
        {organization && (
          <span className="badge" style={{ backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)', fontWeight: 'bold' }}>
            {organization.name}
          </span>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <NotificationsDropdown />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem' }}>{session.user.name}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{session.user.role}</div>
          </div>
          <UserCircle size={28} />
        </div>

        <form action={async () => { "use server"; await signOut(); }}>
          <button type="submit" className="button button-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
