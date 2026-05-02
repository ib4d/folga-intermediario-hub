"use client";

import { useState, useTransition } from "react";

export default function UpdatePaymentStatus({ 
  candidateId, 
  initialValue 
}: { 
  candidateId: string; 
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newValue = !checked;
    setChecked(newValue);
    
    startTransition(async () => {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/payment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            paid400pln: newValue,
            paymentDate: newValue ? new Date().toISOString() : null,
          }),
        });
        if (!res.ok) {
          setChecked(!newValue);
          alert("Error al actualizar estado de pago");
        }
      } catch {
        setChecked(!newValue);
        alert("Error de conexión al actualizar pago");
      }
    });
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={handleToggle}
          disabled={isPending}
          style={{ width: '20px', height: '20px', accentColor: 'var(--pitch-black)' }} 
        />
        <span>Pago inicial de 400 PLN completado</span>
        {isPending && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Actualizando...</span>}
      </label>
    </div>
  );
}
