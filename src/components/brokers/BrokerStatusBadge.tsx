type Tone = "default" | "success" | "warning" | "danger" | "info";

function getTone(value: string): Tone {
  const upper = value.toUpperCase();
  if (["ACTIVE", "PAID", "PROVIDER", "READY", "SENT", "RESPONDED", "REPLIED", "CANDIDATE"].includes(upper)) {
    return "success";
  }
  if (["DRAFT", "NEW", "TESTING", "UNKNOWN", "PENDING"].includes(upper)) {
    return "warning";
  }
  if (["REJECTED", "DISPUTED", "DELIVERY_FAILED", "FAILED", "LOW_PERFORMANCE"].includes(upper)) {
    return "danger";
  }
  if (["MIXED", "CONTACTED", "WHATSAPP", "CALL"].includes(upper)) {
    return "info";
  }
  return "default";
}

const toneStyles: Record<Tone, React.CSSProperties> = {
  default: { backgroundColor: "#f3f4f6", color: "#111827" },
  success: { backgroundColor: "#dcfce7", color: "#166534" },
  warning: { backgroundColor: "#fef3c7", color: "#92400e" },
  danger: { backgroundColor: "#fee2e2", color: "#991b1b" },
  info: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
};

export default function BrokerStatusBadge({
  value,
}: {
  value: string | null | undefined;
}) {
  if (!value) return <span style={{ opacity: 0.5 }}>-</span>;
  const tone = getTone(value);

  return (
    <span
      style={{
        ...toneStyles[tone],
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.25rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
