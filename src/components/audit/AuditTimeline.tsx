"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FileText, 
  User, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Upload, 
  Search,
  MessageSquare,
  Lock
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  user: {
    name: string | null;
    role: string;
  } | null;
}

interface Props {
  logs: AuditLog[];
}

export default function AuditTimeline({ logs }: Props) {
  const getIcon = (action: string) => {
    switch (action) {
      case "CANDIDATE_CREATED": return <User size={16} className="text-blue-500" />;
      case "CANDIDATE_UPDATED": return <RefreshCw size={16} className="text-amber-500" />;
      case "DOCUMENT_UPLOADED": return <Upload size={16} className="text-green-500" />;
      case "DOCUMENT_DELETED": return <XCircle size={16} className="text-red-500" />;
      case "DOCUMENT_VERIFIED": return <CheckCircle size={16} className="text-emerald-500" />;
      case "OCR_EXTRACTED_PENDING_REVIEW": return <Search size={16} className="text-purple-500" />;
      case "STATUS_CHANGED": return <CheckCircle size={16} className="text-indigo-500" />;
      case "LOGISTICS_EVENT_CREATED": return <Truck size={16} className="text-sky-500" />;
      case "LOGISTICS_EVENT_CONFIRMED": return <CheckCircle size={16} className="text-emerald-600" />;
      case "CANDIDATE_NOTES_UPDATED": return <MessageSquare size={16} className="text-gray-500" />;
      case "LOGIN": return <Lock size={16} className="text-slate-600" />;
      default: return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getLabel = (action: string) => {
    return action.replace(/_/g, " ").toLowerCase();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Search size={20} /> Historial de Auditoría (Trazabilidad)
      </h3>
      
      <div className="relative border-l-2 border-gray-200 ml-3 pl-6 space-y-8">
        {logs.length === 0 && (
          <p className="text-muted-foreground italic">No hay registros de auditoría disponibles.</p>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className="relative">
            {/* Dot */}
            <div className="absolute -left-[31px] top-1 bg-white p-1 rounded-full border-2 border-gray-200">
              {getIcon(log.action)}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
              <div>
                <p className="font-semibold capitalize text-sm sm:text-base">
                  {getLabel(log.action)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Por <span className="font-medium text-foreground">{log.user?.name || "Sistema"}</span> ({log.user?.role || "SYSTEM"})
                </p>
              </div>
              <time className="text-[10px] sm:text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded-md self-start">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
              </time>
            </div>
            
            {log.details && (
              <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-xs font-mono overflow-x-auto max-h-24">
                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
