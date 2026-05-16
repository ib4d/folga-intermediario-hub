"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(251, 249, 255, 0.7)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--pitch-black)',
        padding: '2rem',
        boxShadow: '8px 8px 0px var(--amber-flame)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <Loader2 className="animate-spin" size={48} color="var(--amber-flame)" />
        <h2 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>CARGANDO ORI CRUIT HUB...</h2>
        <div style={{ width: '100%', height: '4px', backgroundColor: '#333', marginTop: '0.5rem' }}>
          <div className="loading-bar-animation" style={{ height: '100%', backgroundColor: 'var(--amber-flame)' }}></div>
        </div>
      </div>
      
      <style jsx>{`
        .loading-bar-animation {
          animation: loadingBar 2s infinite ease-in-out;
        }
        @keyframes loadingBar {
          0% { width: 0; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
