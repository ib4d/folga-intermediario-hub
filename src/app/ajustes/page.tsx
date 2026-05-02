import { Users, Database } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ExportButton from "@/components/ExportButton";
import AjustesSettings from "@/components/AjustesSettings";
import InviteUserModal from "@/components/InviteUserModal";

export default async function AjustesPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    orderBy: { role: 'asc' }
  });

  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)', borderBottom: '2px solid var(--grey-olive)' }}>
        <h1 style={{ color: 'var(--ghost-white)' }}>Ajustes del Sistema</h1>
        <p style={{ color: 'var(--grey-olive)' }}>Configuración de usuarios, notificaciones y exportación de datos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} />
                <h2 style={{ margin: 0 }}>Gestión de Usuarios</h2>
              </div>
              {session?.user?.role === 'SUPERADMIN' ? <InviteUserModal /> : <button className="button" disabled title="Solo SUPERADMIN">Invitar Usuario</button>}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 'bold' }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="status-badge" style={{ 
                          backgroundColor: user.role === 'SUPERADMIN' ? 'var(--pitch-black)' : user.role === 'LEGAL' ? 'var(--amber-flame)' : 'var(--ghost-white)',
                          color: user.role === 'SUPERADMIN' ? 'var(--ghost-white)' : 'var(--pitch-black)'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={24} />
                <h2 style={{ margin: 0 }}>Exportación de Datos</h2>
              </div>
            </div>
            <p>Genera reportes para RRHH, marketing o dirección basados en la base de datos actual.</p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <ExportButton />
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <AjustesSettings />
        </div>
      </div>
    </>
  );
}

