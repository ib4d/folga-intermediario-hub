"use client";

import { Candidate, LogisticsEvent } from "@prisma/client";
import { Plane, Train, Car, User, MapPin, CheckCircle2, Clock } from "lucide-react";
import { confirmLogisticsEvent } from "@/app/actions/logistics";

interface Props {
  events: (LogisticsEvent & { candidate: Candidate })[];
}

const TransportIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case "AVION": return <Plane size={18} />;
    case "TREN": return <Train size={18} />;
    case "COCHE_EMPRESA":
    case "PROPIO": return <Car size={18} />;
    default: return <Clock size={18} />;
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
      <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
        <p className="text-gray-400">No hay llegadas programadas para esta semana.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => (
        <div key={event.id} className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${event.confirmed ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${event.confirmed ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                <TransportIcon type={event.transportType} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">
                  {event.candidate.firstName} {event.candidate.lastName}
                </h4>
                <p className="text-xs text-gray-500">
                  {event.arrivalDate ? new Date(event.arrivalDate).toLocaleString("es-ES", { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha pendiente'}
                </p>
              </div>
            </div>
            {event.confirmed ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">
                <CheckCircle2 size={12} />
                Confirmado
              </span>
            ) : (
              <button 
                onClick={() => handleConfirm(event.id)}
                className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 transition-colors uppercase"
              >
                Confirmar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              <span className="truncate">{event.terminal || "TBA"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-gray-400" />
              <span className="truncate">{event.pickedUpBy || "Sin asignar"}</span>
            </div>
            {event.flightOrTrain && (
              <div className="col-span-2 mt-1 text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">
                REF: {event.flightOrTrain}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
