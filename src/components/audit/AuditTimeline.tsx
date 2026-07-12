"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle,
  FileText,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Truck,
  Upload,
  User,
  XCircle,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  User: {
    name: string | null;
    role: string;
  } | null;
}

interface Props {
  logs: AuditLog[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function formatDetailValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry) => formatDetailValue(entry))
      .filter((entry): entry is string => Boolean(entry));
    return items.length > 0 ? items.join(" · ") : null;
  }

  if (value && typeof value === "object") {
    return null;
  }

  return null;
}

function prettifyStatus(value: string | null) {
  return value ? value.replace(/_/g, " ") : null;
}

function renderStructuredDetails(details: Record<string, unknown>) {
  const from = prettifyStatus(asString(details.from));
  const to = prettifyStatus(asString(details.to));
  const category = asString(details.outcomeCategory);
  const followUpActions = asStringArray(details.followUpActions);
  const rejectionReason = asString(details.rejectionReason);
  const reviewNotes = asString(details.reviewNotes);

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
      {from || to ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black uppercase tracking-wide text-slate-500">Estado</span>
          <span className="rounded-md bg-white px-2 py-1 font-semibold text-slate-700">
            {from || "SIN ESTADO"}
          </span>
          <span className="text-slate-400">-&gt;</span>
          <span className="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
            {to || "SIN ESTADO"}
          </span>
        </div>
      ) : null}

      {category ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Categoria</span>
          <p className="mt-1 font-semibold text-slate-800">{category}</p>
        </div>
      ) : null}

      {followUpActions.length > 0 ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Seguimiento</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {followUpActions.map((action) => (
              <span
                key={action}
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800"
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {rejectionReason ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Resultado</span>
          <p className="mt-1 whitespace-pre-line font-medium text-slate-700">{rejectionReason}</p>
        </div>
      ) : null}

      {reviewNotes && reviewNotes !== rejectionReason ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Notas</span>
          <p className="mt-1 whitespace-pre-line font-medium text-slate-700">{reviewNotes}</p>
        </div>
      ) : null}
    </div>
  );
}

function renderGenericDetails(details: Record<string, unknown>) {
  const note = asString(details.notes);
  const filename = asString(details.filename);
  const paymentDate = asString(details.paymentDate);
  const docType = asString(details.docType);
  const firstName = asString(details.firstName);
  const lastName = asString(details.lastName);
  const appliedFields = asStringArray(details.appliedFields);
  const url = asString(details.url);
  const type = asString(details.type);
  const status = asString(details.status);
  const message = asString(details.message);
  const action = asString(details.action);

  if (!note && !filename && !paymentDate && !docType && !firstName && !lastName && appliedFields.length === 0 && !url && !type && !status && !message && !action) {
    const entries = Object.entries(details)
      .map(([key, value]) => ({ key, value: formatDetailValue(value) }))
      .filter((entry) => entry.value);

    return entries.length > 0 ? (
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="mb-2 font-black uppercase tracking-wide text-slate-500">Detalles</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {entries.map((entry) => (
            <div key={entry.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {entry.key.replace(/_/g, " ")}
              </div>
              <div className="mt-1 font-semibold text-slate-800">{entry.value}</div>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex flex-wrap gap-2">
        {type ? <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">{type}</span> : null}
        {status ? <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">{status.replace(/_/g, " ")}</span> : null}
        {action ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">{action.replace(/_/g, " ")}</span> : null}
      </div>

      {firstName || lastName ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Candidato</span>
          <p className="mt-1 font-medium text-slate-800">{`${firstName ?? ""} ${lastName ?? ""}`.trim()}</p>
        </div>
      ) : null}
      {filename ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Archivo</span>
          <p className="mt-1 font-medium text-slate-800">{filename}</p>
        </div>
      ) : null}
      {docType ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Documento</span>
          <p className="mt-1 font-medium text-slate-800">{docType}</p>
        </div>
      ) : null}
      {paymentDate ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Pago</span>
          <p className="mt-1 font-medium text-slate-800">{paymentDate}</p>
        </div>
      ) : null}
      {note ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Nota</span>
          <p className="mt-1 whitespace-pre-line font-medium text-slate-800">{note}</p>
        </div>
      ) : null}
      {message ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Mensaje</span>
          <p className="mt-1 whitespace-pre-line font-medium text-slate-800">{message}</p>
        </div>
      ) : null}
      {url ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">URL</span>
          <p className="mt-1 break-all font-mono text-[11px] font-semibold text-slate-700">{url}</p>
        </div>
      ) : null}
      {appliedFields.length > 0 ? (
        <div>
          <span className="font-black uppercase tracking-wide text-slate-500">Campos aplicados</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {appliedFields.map((field) => (
              <span key={field} className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">
                {field}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AuditTimeline({ logs }: Props) {
  const getIcon = (action: string) => {
    switch (action) {
      case "CANDIDATE_CREATED":
        return <User size={16} className="text-blue-500" />;
      case "CANDIDATE_UPDATED":
        return <RefreshCw size={16} className="text-amber-500" />;
      case "CANDIDATE_DELETED":
        return <XCircle size={16} className="text-red-500" />;
      case "DOCUMENT_UPLOADED":
        return <Upload size={16} className="text-green-500" />;
      case "DOCUMENT_DELETED":
        return <XCircle size={16} className="text-red-500" />;
      case "DOCUMENT_VERIFIED":
        return <CheckCircle size={16} className="text-emerald-500" />;
      case "OCR_EXTRACTED_PENDING_REVIEW":
        return <Search size={16} className="text-purple-500" />;
      case "STATUS_CHANGED":
        return <CheckCircle size={16} className="text-indigo-500" />;
      case "LOGISTICS_EVENT_CREATED":
        return <Truck size={16} className="text-sky-500" />;
      case "LOGISTICS_EVENT_CONFIRMED":
        return <CheckCircle size={16} className="text-emerald-600" />;
      case "CANDIDATE_NOTES_UPDATED":
        return <MessageSquare size={16} className="text-gray-500" />;
      case "LOGIN":
        return <Lock size={16} className="text-slate-600" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getLabel = (action: string) => {
    switch (action) {
      case "DOCUMENT_UPLOADED":
        return "Documento subido";
      case "DOCUMENT_DELETED":
        return "Documento borrado";
      case "DOCUMENT_VERIFIED":
        return "Documento verificado";
      case "OCR_EXTRACTED_PENDING_REVIEW":
        return "OCR extraído";
      case "STATUS_CHANGED":
        return "Cambio de estado";
      case "CANDIDATE_CREATED":
        return "Candidato creado";
      case "CANDIDATE_UPDATED":
        return "Candidato actualizado";
      case "CANDIDATE_DELETED":
        return "Candidato borrado";
      case "LOGISTICS_EVENT_CREATED":
        return "Llegada programada";
      case "LOGISTICS_EVENT_CONFIRMED":
        return "Llegada confirmada";
      case "LOGIN":
        return "Inicio de sesión";
      default:
        return action.replace(/_/g, " ").toLowerCase();
    }
  };

  return (
    <div className="audit-timeline-shell">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Search size={20} /> Historial de auditoría
      </h3>

      <div className="audit-timeline-scroll relative ml-3 space-y-8 border-l-2 border-gray-200 pl-6">
        {logs.length === 0 ? (
          <p className="text-muted-foreground italic">No hay registros de auditoría disponibles.</p>
        ) : null}

        {logs.map((log) => (
          <div key={log.id} className="relative">
            <div className="absolute -left-[31px] top-1 rounded-full border-2 border-gray-200 bg-white p-1">
              {getIcon(log.action)}
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold capitalize sm:text-base">{getLabel(log.action)}</p>
                <p className="text-xs text-muted-foreground">
                  Por <span className="font-medium text-foreground">{log.User?.name || "Sistema"}</span> ({log.User?.role || "SYSTEM"})
                </p>
              </div>
              <time className="self-start rounded-md bg-gray-100 px-2 py-1 text-[10px] text-muted-foreground sm:text-xs">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
              </time>
            </div>

            {log.details ? (
              log.action === "STATUS_CHANGED" && asRecord(log.details) ? (
                renderStructuredDetails(asRecord(log.details)!)
              ) : (
                renderGenericDetails(asRecord(log.details) ?? {})
              )
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
