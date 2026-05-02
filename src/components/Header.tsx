import { UserCircle, LogOut } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { auth, signOut } from "@/auth";
import GlobalSearch from "./GlobalSearch";

export default async function Header() {
  const session = await auth();
  if (!session) return null;

  return (
    <header className="header">
      <GlobalSearch />
      
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
