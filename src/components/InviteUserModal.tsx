"use client";

import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";

export default function InviteUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call for inviting user
    setTimeout(() => {
      setIsSubmitting(false);
      setIsOpen(false);
      alert("Usuario invitado con éxito. Se le ha enviado un correo electrónico.");
    }, 1500);
  };

  return (
    <>
      <button className="button" onClick={() => setIsOpen(true)}>
        <UserPlus size={16} style={{ marginRight: '0.5rem' }} /> Invitar Usuario
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', right: '1rem', top: '1rem', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={24} /> Invitar Nuevo Usuario
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Nombre</label>
                <input type="text" className="input" required placeholder="Nombre completo" />
              </div>
              
              <div>
                <label className="label">Correo Electrónico</label>
                <input type="email" className="input" required placeholder="correo@ejemplo.com" />
              </div>
              
              <div>
                <label className="label">Rol</label>
                <select className="input" required>
                  <option value="INTERMEDIARIO">Intermediario</option>
                  <option value="LEGAL">Legal</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Solo los Superadmins pueden crear otros administradores.
                </p>
              </div>

              <button 
                type="submit" 
                className="button" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} /> Enviando...</> : "Enviar Invitación"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
