import { Search, UserCircle, LogOut } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { auth, signOut } from "@/auth";

export default async function Header() {
  const session = await auth();
  if (!session) return null;

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '400px' }}>
        <div className="input-group" style={{ marginBottom: 0, width: '100%' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Buscar candidatos, docs..." 
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <NotificationsDropdown userId={session.user.id} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <span>{session.user.name} ({session.user.role})</span>
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
