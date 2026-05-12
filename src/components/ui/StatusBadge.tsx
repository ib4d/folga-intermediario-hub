import { CandidateStatus } from "@prisma/client";

type BadgeTone =
  | "neutral"
  | "info"
  | "warning"
  | "success"
  | "danger"
  | "dark"
  | "accent";

const candidateTone: Record<CandidateStatus, BadgeTone> = {
  RECOPILANDO_DOCS: "warning",
  DOCUMENTACION_PENDIENTE: "warning",
  EN_REVISION_LEGAL: "info",
  REVISION_ADICIONAL: "warning",
  APROBADO: "success",
  RECHAZADO: "danger",
  EN_PROCESO_PERMISO: "accent",
  CONTRATADO: "dark",
  RETIRADO: "neutral",
};

const toneStyles: Record<BadgeTone, React.CSSProperties> = {
  neutral: { backgroundColor: "var(--white-smoke)", color: "var(--pitch-black)" },
  info: { backgroundColor: "#dbeafe", color: "#1e40af" },
  warning: { backgroundColor: "#fef3c7", color: "#92400e" },
  success: { backgroundColor: "#d1fae5", color: "#065f46" },
  danger: { backgroundColor: "#fee2e2", color: "#991b1b" },
  dark: { backgroundColor: "var(--pitch-black)", color: "var(--amber-flame)" },
  accent: { backgroundColor: "#f3e8ff", color: "#6b21a8" },
};

function humanize(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

export default function StatusBadge({
  status,
  tone,
  children,
  size = "sm",
}: {
  status?: string;
  tone?: BadgeTone;
  children?: React.ReactNode;
  size?: "xs" | "sm";
}) {
  const resolvedTone =
    tone ??
    (status && status in candidateTone
      ? candidateTone[status as CandidateStatus]
      : "neutral");

  return (
    <span
      className="status-badge"
      style={{
        ...toneStyles[resolvedTone],
        fontSize: size === "xs" ? "0.65rem" : "0.75rem",
      }}
    >
      {children ?? (status ? humanize(status) : "sin estado")}
    </span>
  );
}
