"use client";

import { Candidate, LogisticsEvent } from "@prisma/client";
import WeeklyArrivals from "./WeeklyArrivals";
import LogisticsEventForm from "./LogisticsEventForm";
import { Truck, AlertTriangle, CheckCircle, UserCheck } from "lucide-react";
import Link from "next/link";

interface Props {
  pendingCandidates: Candidate[];
  weeklyEvents: (LogisticsEvent & { candidate: Candidate })[];
}

export default function LogisticsDashboard({ pendingCandidates, weeklyEvents }: Props) {
  const confirmedCount = weeklyEvents.filter(e => e.confirmed).length;
  const pendingConfirm = weeklyEvents.filter(
    e => !e.confirmed && e.arrivalDate && new Date(e.arrivalDate) < new Date()
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Stat Cards */}
      <div className="dashboard-grid">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ 
            width: '56px', height: '56px', 
            backgroundColor: 'var(--primary)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--pitch-black)',
            flexShrink: 0
          }}>
            <UserCheck size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{pendingCandidates.length}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.25rem' }}>SIN LOGÍSTICA</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ 
            width: '56px', height: '56px', 
            backgroundColor: 'var(--pitch-black)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--pitch-black)',
            flexShrink: 0
          }}>
            <Truck size={28} strokeWidth={2.5} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{weeklyEvents.length}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.25rem' }}>LLEGADAS SEMANA</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#4ade80' }}>
          <div style={{ 
            width: '56px', height: '56px', 
            backgroundColor: 'var(--pitch-black)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--pitch-black)',
            flexShrink: 0
          }}>
            <CheckCircle size={28} strokeWidth={2.5} color="#4ade80" />
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{confirmedCount}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--pitch-black)', marginTop: '0.25rem' }}>CONFIRMADAS</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: pendingConfirm > 0 ? '#ffccd5' : 'var(--background)' }}>
          <div style={{ 
            width: '56px', height: '56px', 
            backgroundColor: '#e63946', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--pitch-black)',
            flexShrink: 0
          }}>
            <AlertTriangle size={28} strokeWidth={2.5} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{pendingConfirm}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.25rem' }}>PENDIENTE CONFIRMAR</div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Weekly Arrivals */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ whiteSpace: 'nowrap', fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase' }}>LLEGADAS DE LA SEMANA</h2>
              <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--pitch-black)' }}></div>
            </div>
            <WeeklyArrivals events={weeklyEvents} />
          </section>

          {/* Pending Logistics Table */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ whiteSpace: 'nowrap', fontSize: '1.75rem', fontWeight: '900', textTransform: 'uppercase' }}>APROBADOS SIN LOGÍSTICA</h2>
              <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--pitch-black)' }}></div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>CANDIDATO</th>
                    <th>PAÍS</th>
                    <th>ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        NO HAY CANDIDATOS APROBADOS PENDIENTES DE LOGÍSTICA.
                      </td>
                    </tr>
                  ) : (
                    pendingCandidates.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '900' }}>{c.firstName} {c.lastName}</td>
                        <td style={{ fontWeight: 'bold' }}>{c.country}</td>
                        <td>
                          <Link 
                            href={`/candidatos/${c.id}`}
                            className="button button-secondary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            VER CANDIDATO
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar Form */}
        <aside>
          <LogisticsEventForm candidates={pendingCandidates} />
        </aside>
      </div>
    </div>
  );
}
