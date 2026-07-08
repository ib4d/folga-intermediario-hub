import assert from "node:assert/strict";

function normalizeText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseBrokerDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();
  if (!text) return null;

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

  const native = new Date(text);
  if (!Number.isNaN(native.getTime())) return native;

  return null;
}

function parseReferencePeriod(value) {
  const text = normalizeText(value);
  if (!text) return { start: null, end: null };

  const normalized = text
    .replace(/\u2013|\u2014/g, " - ")
    .replace(/\s+al\s+/gi, " - ")
    .replace(/\s+to\s+/gi, " - ")
    .replace(/\s+/g, " ")
    .trim();

  const dateMatches = normalized.match(
    /\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2}|\d{4}\.\d{2}\.\d{2}/g
  );

  if (dateMatches && dateMatches.length >= 2) {
    return {
      start: parseBrokerDate(dateMatches[0]),
      end: parseBrokerDate(dateMatches[1]),
    };
  }

  const explicitParts = normalized.split(/\s-\s|--/).map((part) => part.trim()).filter(Boolean);
  if (explicitParts.length >= 2) {
    return {
      start: parseBrokerDate(explicitParts[0]),
      end: parseBrokerDate(explicitParts[1]),
    };
  }

  return { start: parseBrokerDate(normalized), end: null };
}

function normalizeLeadType(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";
  if (["provider", "proveedor", "broker", "intermediario", "pośrednik", "posrednik"].some((token) => text.includes(token))) {
    return "PROVIDER";
  }
  if (["candidate", "candidato", "worker", "trabajador", "pracownik"].some((token) => text.includes(token))) {
    return "CANDIDATE";
  }
  return "UNKNOWN";
}

function inferBrokerLeadType(input) {
  const explicit = normalizeLeadType(input.explicitLeadType);
  if (explicit !== "UNKNOWN") return explicit;

  const rawStatusType = normalizeLeadType(input.rawStatus);
  if (rawStatusType !== "UNKNOWN") return rawStatusType;

  const normalizedStatusType = normalizeLeadType(input.normalizedStatus);
  if (normalizedStatusType !== "UNKNOWN") return normalizedStatusType;

  const declaredSupplyText = normalizeText(input.declaredSupplyText)?.toLowerCase() ?? "";
  if (
    declaredSupplyText &&
    (/\d/.test(declaredSupplyText) ||
      ["persona", "personas", "workers", "trabajadores", "pracownik", "dostarc", "supply", "semana", "mes"].some((token) =>
        declaredSupplyText.includes(token)
      ))
  ) {
    return "PROVIDER";
  }

  const personalSignals = [input.firstName, input.lastName, input.city, input.phone, input.email]
    .map((value) => normalizeText(value))
    .filter(Boolean).length;

  if (personalSignals >= 2) return "CANDIDATE";

  return "UNKNOWN";
}

const dashedPeriod = parseReferencePeriod("2026-06-01 - 2026-06-30");
assert.ok(dashedPeriod.start instanceof Date);
assert.ok(dashedPeriod.end instanceof Date);
assert.equal(dashedPeriod.start?.toISOString().slice(0, 10), "2026-06-01");
assert.equal(dashedPeriod.end?.toISOString().slice(0, 10), "2026-06-30");

const dottedPeriod = parseReferencePeriod("01.06.2026 – 30.06.2026");
assert.ok(dottedPeriod.start instanceof Date);
assert.ok(dottedPeriod.end instanceof Date);
assert.equal(dottedPeriod.start?.toISOString().slice(0, 10), "2026-06-01");
assert.equal(dottedPeriod.end?.toISOString().slice(0, 10), "2026-06-30");

assert.equal(normalizeLeadType("provider"), "PROVIDER");
assert.equal(normalizeLeadType("pośrednik"), "PROVIDER");
assert.equal(normalizeLeadType("intermediario"), "PROVIDER");
assert.equal(normalizeLeadType("candidate"), "CANDIDATE");
assert.equal(normalizeLeadType("trabajador"), "CANDIDATE");
assert.equal(normalizeLeadType("sin dato"), "UNKNOWN");

assert.equal(inferBrokerLeadType({ explicitLeadType: null, rawStatus: "Provider" }), "PROVIDER");
assert.equal(
  inferBrokerLeadType({
    explicitLeadType: null,
    rawStatus: "Replied",
    declaredSupplyText: "15 personas por mes",
    firstName: "Mario",
    lastName: "Lopez",
  }),
  "PROVIDER"
);
assert.equal(
  inferBrokerLeadType({
    explicitLeadType: null,
    rawStatus: "Replied",
    firstName: "Rodrigo",
    lastName: "Moran",
    city: "Jutiapa",
    phone: "50248394841",
  }),
  "CANDIDATE"
);
assert.equal(
  inferBrokerLeadType({
    explicitLeadType: null,
    rawStatus: null,
    normalizedStatus: null,
    declaredSupplyText: null,
    firstName: null,
    lastName: null,
    city: null,
    phone: null,
    email: null,
  }),
  "UNKNOWN"
);

console.log("Broker regression checks passed.");
