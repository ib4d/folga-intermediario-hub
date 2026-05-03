"use client";

import { useState } from "react";
import { generateRegistrationLink } from "@/app/actions/candidates";
import { Link as LinkIcon, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  candidateId?: string;
  token?: string | null;
}

export default function CopyRegistrationLink({ candidateId, token }: Props) {
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
      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
        copied ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
      title="Copiar link de autoregistro"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        copied ? <CheckCircle size={16} /> : <LinkIcon size={16} />
      )}
      {copied ? "Link Copiado!" : "Copiar Link de Registro"}
    </button>
  );
}
