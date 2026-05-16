"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";

export default function ReferralWidget({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/onboarding?ref=${code || "folga-early"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ border: '1px dashed var(--amber-flame)', backgroundColor: '#fffcf5' }}>
      <h3>Motor de Referidos 🎁</h3>
      <p style={{ fontSize: '0.8rem', margin: '0.5rem 0' }}>
        Comparte ORI CRUIT HUB con otros socios y obtén un 20% de descuento vitalicio por cada referido que active su plan.
      </p>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <input 
          readOnly 
          value={referralLink} 
          style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.8rem' }} 
        />
        <button onClick={handleCopy} className="button button-secondary" style={{ padding: '0.5rem' }}>
          {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
        </button>
      </div>

      <button className="button" style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Share2 size={16} /> Compartir en LinkedIn
      </button>
    </div>
  );
}
