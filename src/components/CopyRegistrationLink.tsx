"use client";

import { useState } from "react";
import { generateRegistrationLink } from "@/app/actions/candidates";
import { Link as LinkIcon, CheckCircle, Loader2 } from "lucide-react";

export default function CopyRegistrationLink({ candidateId }: { candidateId: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateAndCopy = async () => {
    try {
      setLoading(true);
      const { url } = await generateRegistrationLink(candidateId);
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al generar el link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleGenerateAndCopy}
      disabled={loading || copied}
      className="button"
      style={{ 
        padding: "0.25rem 0.5rem", 
        fontSize: "0.75rem", 
        display: "flex", 
        alignItems: "center", 
        gap: "0.25rem",
        backgroundColor: copied ? "#4ade80" : "var(--amber-flame)",
        color: copied ? "#064e3b" : "var(--pitch-black)"
      }}
      title="Generar link de autoregistro"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : (copied ? <CheckCircle size={14} /> : <LinkIcon size={14} />)}
      {copied ? "Copiado!" : "Link"}
    </button>
  );
}
