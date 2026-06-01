const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL || process.env.AUTH_URL || "http://127.0.0.1:3000");

const checks = [
  { path: "/api/health", label: "Health API", allow: [200], mustContain: '"status":"ok"' },
  { path: "/api/providers/status", label: "Providers status API", allow: [200], mustContain: '"current"' },
  { path: "/", label: "Marketing/onboarding entry", allow: [200, 302, 307, 308] },
  { path: "/marketing", label: "Marketing explicit entry", allow: [200] },
  { path: "/login", label: "Login", allow: [200] },
  { path: "/dashboard", label: "Dashboard auth gate", allow: [302, 303, 307, 308] },
  { path: "/candidatos", label: "Candidates auth gate", allow: [302, 303, 307, 308] },
  { path: "/documentos", label: "Documents auth gate", allow: [302, 303, 307, 308] },
  { path: "/legal", label: "Legal auth gate", allow: [302, 303, 307, 308] },
  { path: "/logistica", label: "Logistics auth gate", allow: [302, 303, 307, 308] },
  { path: "/ajustes", label: "Settings auth gate", allow: [302, 303, 307, 308] },
  { path: "/billing", label: "Billing auth gate", allow: [302, 303, 307, 308] },
  { path: "/billing/plans", label: "Billing plans auth gate", allow: [302, 303, 307, 308] },
];

const failures = [];

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;

  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        "user-agent": "ori-cruit-hub-smoke-check/1.0",
      },
    });
    const body = await response.text();

    if (!check.allow.includes(response.status)) {
      failures.push(`${check.label}: expected ${check.allow.join("/")} but got ${response.status}`);
      continue;
    }

    if (check.mustContain && !body.includes(check.mustContain)) {
      failures.push(`${check.label}: response did not include ${check.mustContain}`);
      continue;
    }

    console.log(`OK ${check.label} (${response.status})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    failures.push(`${check.label}: ${message}`);
  }
}

if (failures.length > 0) {
  console.error("Production smoke check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production smoke check passed for ${baseUrl}.`);

function normalizeBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://127.0.0.1:3000";
  return trimmed;
}
