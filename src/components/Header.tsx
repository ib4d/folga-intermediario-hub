import { Bell, Search, UserCircle } from "lucide-react";

export default function Header() {
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
        <button className="button button-secondary" style={{ padding: '0.5rem', borderRadius: 0 }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <span>Coordinador</span>
          <UserCircle size={28} />
        </div>
      </div>
    </header>
  );
}
