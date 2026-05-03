"use client";

import { Candidate, LogisticsEvent } from "@prisma/client";
import WeeklyArrivals from "./WeeklyArrivals";
import LogisticsEventForm from "./LogisticsEventForm";
import { Truck, AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";

interface Props {
  pendingCandidates: Candidate[];
  weeklyEvents: (LogisticsEvent & { candidate: Candidate })[];
}

export default function LogisticsDashboard({ pendingCandidates, weeklyEvents }: Props) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{pendingCandidates.length}</div>
            <div className="text-xs font-bold text-gray-400 uppercase">Sin Logística</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Truck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{weeklyEvents.length}</div>
            <div className="text-xs font-bold text-gray-400 uppercase">Llegadas Semana</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {weeklyEvents.filter(e => e.confirmed).length}
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase">Confirmadas</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {weeklyEvents.filter(e => !e.confirmed && e.arrivalDate && new Date(e.arrivalDate) < new Date()).length}
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase">Pendiente Confirmar</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Llegadas de la Semana</h2>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            <WeeklyArrivals events={weeklyEvents} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Candidatos Aprobados sin Logística</h2>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Candidato</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">País</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">
                        No hay candidatos aprobados pendientes de logística.
                      </td>
                    </tr>
                  ) : (
                    pendingCandidates.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{c.firstName} {c.lastName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{c.country}</td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 font-bold text-xs hover:underline uppercase">
                            Programar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside>
          <LogisticsEventForm candidates={pendingCandidates} />
        </aside>
      </div>
    </div>
  );
}
