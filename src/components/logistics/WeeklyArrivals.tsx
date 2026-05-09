"use client";

import { Candidate, LogisticsEvent } from "@prisma/client";
import { Plane, Train, Car, User, MapPin, CheckCircle, Clock } from "lucide-react";
import { confirmLogisticsEvent } from "@/app/actions/logistics";

interface Props {
  events: (LogisticsEvent & { candidate: Candidate })[];
}

const TransportIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case "AVION": return <Plane size={20} strokeWidth={2.5} />;
    case "TREN": return <Train size={20} strokeWidth={2.5} />;
    case "COCHE_EMPRESA":
    case "PROPIO": return <Car size={20} strokeWidth={2.5} />;
    default: return <Clock size={20} strokeWidth={2.5} />;
  }
};

export default function WeeklyArrivals({ events }: Props) {
  const handleConfirm = async (id: string) => {
    try {
      await confirmLogisticsEvent(id);
    } catch {
      alert("Error al confirmar");
    }
  };

  if (events.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
        <p style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>NO HAY LLEGADAS PROGRAMADAS PARA ESTA SEMANA.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {events.map((event) => (
        <div 
          key={event.id} 
          className="card"
          style={{ 
            backgroundColor: event.confirmed ? '#f0fdf4' : 'var(--background)',
            borderColor: event.confirmed ? '#4ade80' : 'var(--pitch-black)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                padding: '0.5rem', 
                backgroundColor: event.confirmed ? '#4ade80' : 'var(--primary)', 
                border: '2px solid var(--pitch-black)' 
              }}>
                <TransportIcon type={event.transportType} />
              </div>
              <div>
                <h4 style={{ fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase' }}>
                  {event.candidate.firstName} {event.candidate.lastName}
                </h4>
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--muted)', margin: 0 }}>
                  {event.arrivalDate 
                    ? new Date(event.arrivalDate).toLocaleString("es-ES", { dateStyle: 'short', timeStyle: 'short' }) 
                    : 'FECHA PENDIENTE'}
                </p>
              </div>
            </div>
            {event.confirmed ? (
              <span className="status-badge active" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={10} /> CONFIRMADO
              </span>
            ) : (
              <button
                onClick={() => handleConfirm(event.id)}
                className="button"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}
              >
                CONFIRMAR
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.terminal || "TBA"}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.pickedUpBy || "SIN ASIGNAR"}
              </span>
            </div>
            {event.flightOrTrain && (
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--white-smoke)', border: '1px solid var(--pitch-black)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                REF: {event.flightOrTrain}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
