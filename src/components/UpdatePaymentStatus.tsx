"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function UpdatePaymentStatus({ 
  candidateId, 
  initialValue 
}: { 
  candidateId: string; 
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = async () => {
    const newValue = !checked;
    setChecked(newValue);
    setMessage("");
    setError("");
    
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
          const result = await res.json().catch(() => null);
          setError(result?.error || "Error al actualizar estado de pago");
          return;
        }
        setMessage(newValue ? "Pago confirmado y guardado." : "Pago marcado como pendiente.");
        router.refresh();
      } catch {
        setChecked(!newValue);
        setError("Error de conexion al actualizar pago");
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
      {message ? (
        <p style={{ margin: "0.5rem 0 0", color: "#166534", fontSize: "0.8rem", fontWeight: 700 }}>{message}</p>
      ) : null}
      {error ? (
        <p style={{ margin: "0.5rem 0 0", color: "#b91c1c", fontSize: "0.8rem", fontWeight: 700 }}>{error}</p>
      ) : null}
    </div>
  );
}
