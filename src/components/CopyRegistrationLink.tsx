"use client";

import { useState } from "react";
import { generateRegistrationLink } from "@/app/actions/candidates";
import { Link as LinkIcon, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  candidateId?: string;
  token?: string | null;
  className?: string;
}

export default function CopyRegistrationLink({ candidateId, token, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      setLoading(true);
      let url = "";
      
      if (token) {
        url = `/registro/${token}`;
      } else if (candidateId) {
        const result = await generateRegistrationLink(candidateId);
        url = result.url;
      } else {
        return;
      }

      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al copiar el link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCopy}
      disabled={loading || copied}
      className={["button button-outline", className].filter(Boolean).join(" ")}
      title="Copiar link de autoregistro"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        copied ? <CheckCircle size={14} /> : <LinkIcon size={14} />
      )}
      {copied ? "Link Copiado!" : "COPIAR LINK DE REGISTRO"}
    </button>
  );
}
