import assert from "node:assert/strict";

import { inferBrokerLeadType, normalizeLeadType, parseReferencePeriod } from "../src/lib/brokers/utils";

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
