import { createHash } from "node:crypto";

export function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function normalizeEmail(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text.toLowerCase() : null;
}

export function normalizePhone(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return text.replace(/^p:\s*/i, "").replace(/\s+/g, "");
}

export function normalizeBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const text = normalizeText(value)?.toLowerCase();
  if (!text) return null;
  if (["si", "sí", "yes", "true", "1"].includes(text)) return true;
  if (["no", "false", "0"].includes(text)) return false;
  return null;
}

export function parseBrokerDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();
  if (!text) return null;

  const native = new Date(text);
  if (!Number.isNaN(native.getTime())) return native;

  const euMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    const [, dd, mm, yyyy] = euMatch;
    const parsed = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dottedDateTime = text.match(
    /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i
  );
  if (dottedDateTime) {
    const [, yyyy, mm, dd, hh, min, sec, ampm] = dottedDateTime;
    let hour = Number(hh);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === "PM" && hour < 12) hour += 12;
      if (upper === "AM" && hour === 12) hour = 0;
    }
    const parsed = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), hour, Number(min), Number(sec)));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function parseReferencePeriod(value: unknown): {
  start: Date | null;
  end: Date | null;
} {
  const text = normalizeText(value);
  if (!text) return { start: null, end: null };

  const parts = text.split(/–|--|-/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { start: parseBrokerDate(text), end: null };

  return {
    start: parseBrokerDate(parts[0]),
    end: parseBrokerDate(parts[1]),
  };
}

export function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).replace(",", ".").replace(/[^\d.-]/g, "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function inferContactChannel(value: unknown): "EMAIL" | "WHATSAPP" | "CALL" | "OTHER" {
  const text = normalizeText(value)?.toLowerCase() ?? "";
  if (text.includes("email") || text.includes("mail")) return "EMAIL";
  if (text.includes("whatsapp") || text.includes("wa")) return "WHATSAPP";
  if (text.includes("call") || text.includes("llamada") || text.includes("phone")) return "CALL";
  return "OTHER";
}

export function normalizeLeadType(value: unknown): "PROVIDER" | "CANDIDATE" | "UNKNOWN" {
  const text = normalizeText(value)?.toLowerCase() ?? "";
  if (text.includes("provider")) return "PROVIDER";
  if (text.includes("candidate")) return "CANDIDATE";
  return "UNKNOWN";
}

export function normalizeLeadStatus(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (lowered === "replied") return "REPLIED";
  if (lowered === "candidate") return "CANDIDATE";
  if (lowered === "provider") return "PROVIDER";
  if (lowered.includes("sent")) return "SENT";
  return text.toUpperCase().replace(/\s+/g, "_");
}

export function inferThresholdFromText(value: unknown): number | null {
  const text = normalizeText(value);
  if (!text) return null;
  const match = text.match(/(\d+)\s*h/i);
  return match ? Number(match[1]) : null;
}

export function computeRowHash(input: unknown): string {
  return createHash("sha1").update(JSON.stringify(input)).digest("hex");
}

export function titleCaseName(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
