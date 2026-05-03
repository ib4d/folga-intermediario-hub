"use client";

import { useState } from "react";
import { Send, CheckCircle, ChevronRight, ChevronLeft, Mail } from "lucide-react";
import { sendLeadOutreach } from "@/app/actions/sales";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}

export default function OutreachRunner({ leads }: { leads: Lead[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [sentLeads, setSentLeads] = useState<string[]>([]);

  const currentLead = leads[currentIndex];

  const handleSend = async () => {
    if (!currentLead) return;
    setIsSending(true);
    try {
      const message = `Hola ${currentLead.name},\n\nTrabajo con agencias que tienen caos en WhatsApp y Excel para su reclutamiento internacional. Hemos creado Folga Hub para automatizar precisamente eso.\n\n¿Te interesaría ver una demo de 10 min?\n\n- Daniel`;
      await sendLeadOutreach(currentLead.id, message, 1);
      setSentLeads([...sentLeads, currentLead.id]);
      if (currentIndex < leads.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      console.error("Outreach failed", error);
    } finally {
      setIsSending(false);
    }
  };

  if (leads.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>No hay leads pendientes de outreach para hoy.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ border: '2px solid var(--amber-flame)' }}>
      <div className="card-header">
        <h2>Modo Outreach Diario ({currentIndex + 1} / {leads.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="button button-secondary">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentIndex(Math.min(leads.length - 1, currentIndex + 1))} className="button button-secondary">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentLead.company || "Empresa"}</div>
        <div style={{ opacity: 0.7 }}>{currentLead.name} ({currentLead.email})</div>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', border: '1px solid #ddd', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.9rem' }}>
          <strong>De:</strong> Daniel @ Folga Hub<br/>
          <strong>Para:</strong> {currentLead.email}<br/>
          <strong>Asunto:</strong> Propuesta para {currentLead.company}<br/>
          <hr style={{ margin: '1rem 0' }} />
          Hola {currentLead.name},<br/><br/>
          Trabajo con agencias que tienen caos en WhatsApp y Excel para su reclutamiento internacional. Hemos creado Folga Hub para automatizar precisamente eso.<br/><br/>
          ¿Te interesaría ver una demo de 10 min?<br/><br/>
          - Daniel
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button 
            className="button" 
            style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
            onClick={handleSend}
            disabled={isSending || sentLeads.includes(currentLead.id)}
          >
            {isSending ? "Enviando..." : sentLeads.includes(currentLead.id) ? "Enviado ✅" : "Enviar Email de Outreach"}
          </button>
          <button className="button button-secondary" style={{ padding: '1rem' }}>
            Abrir en LinkedIn ↗
          </button>
        </div>
      </div>
    </div>
  );
}
