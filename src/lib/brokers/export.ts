import ExcelJS from "exceljs";

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: unknown): string {
  return `PLN ${Number(value ?? 0).toFixed(2)}`;
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: unknown[]): string {
  return values.map((value) => escapeCsv(value)).join(";");
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet): void {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text = value === null || value === undefined ? "" : String(value);
      maxLength = Math.max(maxLength, text.length + 2);
    });
    column.width = Math.min(Math.max(maxLength, 12), 42);
  });
}

export interface BrokerExportRow {
  displayName: string;
  legalOrBillingName: string | null;
  country: string | null;
  city: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  brokerType: string;
  status: string;
  qualityRating: number | null;
  leadCount: number;
  referralCount: number;
  invoiceCount: number;
  accumulatedBilling: unknown;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BrokerLeadExportRow {
  leadDate: Date | string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  sourceCountrySheet: string;
  leadType: string;
  rawStatus: string | null;
  normalizedStatus: string | null;
  flowStatus: string | null;
  emailStatus: string | null;
  lastReplyDate: Date | string | null;
  contactAttempts: number;
  brokerName: string | null;
  assignedOwnerName: string | null;
}

export interface BrokerDetailExportData {
  id: string;
  displayName: string;
  legalOrBillingName: string | null;
  country: string | null;
  city: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  declaredSupplyText: string | null;
  brokerType: string;
  status: string;
  qualityRating: number | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  metrics: {
    totalReferrals: number;
    eligibleReferrals: number;
    baseTotal: number;
    finalAmountTotal: number;
  };
  leads: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    leadType: string;
    rawStatus: string | null;
  }>;
  referrals: Array<{
    id: string;
    workerFullName: string;
    workerStatusRaw: string | null;
    hoursWorked: unknown;
    minimumHoursThreshold: number | null;
    minimumHoursMet: boolean | null;
    finalAmount: unknown;
    sourceInvoiceSheet: string | null;
    referencePeriodStart: Date | string | null;
    referencePeriodEnd: Date | string | null;
  }>;
  invoices: Array<{
    id: string;
    referencePeriodStart: Date | string | null;
    referencePeriodEnd: Date | string | null;
    invoiceType: string | null;
    minimumHoursThreshold: number | null;
    candidateCountEligible: number;
    baseTotal: unknown;
    vatAmount: unknown;
    finalAmount: unknown;
    status: string;
  }>;
}

export interface BrokerLeadDetailExportData {
  id: string;
  sourceCountrySheet: string;
  sourceFileName: string | null;
  sourceRowHash: string;
  leadDate: Date | string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  declaredSupplyText: string | null;
  rawStatus: string | null;
  normalizedStatus: string | null;
  flowStatus: string | null;
  flowSentDate: Date | string | null;
  emailStatus: string | null;
  deliveryError: string | null;
  leadType: string;
  lastReplyDate: Date | string | null;
  notes: string | null;
  brokerName: string | null;
  assignedOwnerName: string | null;
  contactAttempts: Array<{
    attemptNo: number;
    channel: string;
    contactDate: Date | string | null;
    result: string | null;
    summary: string | null;
    nextStep: string | null;
    nextStepDate: Date | string | null;
  }>;
}

export async function buildBrokersWorkbook(rows: BrokerExportRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Brokers");
  worksheet.columns = [
    { header: "Broker", key: "displayName" },
    { header: "Nombre legal", key: "legalOrBillingName" },
    { header: "Pais", key: "country" },
    { header: "Ciudad", key: "city" },
    { header: "Email", key: "primaryEmail" },
    { header: "Telefono", key: "primaryPhone" },
    { header: "Broker type", key: "brokerType" },
    { header: "Status", key: "status" },
    { header: "Quality rating", key: "qualityRating" },
    { header: "Leads", key: "leadCount" },
    { header: "Referrals", key: "referralCount" },
    { header: "Invoices", key: "invoiceCount" },
    { header: "Facturacion", key: "accumulatedBilling" },
    { header: "Notas", key: "notes" },
    { header: "Creado", key: "createdAt" },
    { header: "Actualizado", key: "updatedAt" },
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      displayName: row.displayName,
      legalOrBillingName: row.legalOrBillingName ?? "",
      country: row.country ?? "",
      city: row.city ?? "",
      primaryEmail: row.primaryEmail ?? "",
      primaryPhone: row.primaryPhone ?? "",
      brokerType: row.brokerType,
      status: row.status,
      qualityRating: row.qualityRating ?? "",
      leadCount: row.leadCount,
      referralCount: row.referralCount,
      invoiceCount: row.invoiceCount,
      accumulatedBilling: formatMoney(row.accumulatedBilling),
      notes: row.notes ?? "",
      createdAt: formatDateTime(row.createdAt),
      updatedAt: formatDateTime(row.updatedAt),
    });
  });

  applyHeaderStyle(worksheet);
  autoFitColumns(worksheet);
  return workbook;
}

export function buildBrokersCsv(rows: BrokerExportRow[]): string {
  const lines = [csvRow([
    "Broker",
    "Nombre legal",
    "Pais",
    "Ciudad",
    "Email",
    "Telefono",
    "Broker type",
    "Status",
    "Quality rating",
    "Leads",
    "Referrals",
    "Invoices",
    "Facturacion",
    "Notas",
    "Creado",
    "Actualizado",
  ])];

  rows.forEach((row) => {
    lines.push(csvRow([
      row.displayName,
      row.legalOrBillingName ?? "",
      row.country ?? "",
      row.city ?? "",
      row.primaryEmail ?? "",
      row.primaryPhone ?? "",
      row.brokerType,
      row.status,
      row.qualityRating ?? "",
      row.leadCount,
      row.referralCount,
      row.invoiceCount,
      formatMoney(row.accumulatedBilling),
      row.notes ?? "",
      formatDateTime(row.createdAt),
      formatDateTime(row.updatedAt),
    ]));
  });

  return lines.join("\n");
}

export async function buildBrokerLeadsWorkbook(rows: BrokerLeadExportRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Leads");
  worksheet.columns = [
    { header: "Lead date", key: "leadDate" },
    { header: "Nombre", key: "fullName" },
    { header: "Email", key: "email" },
    { header: "Telefono", key: "phone" },
    { header: "Ciudad", key: "city" },
    { header: "Hoja", key: "sourceCountrySheet" },
    { header: "Lead type", key: "leadType" },
    { header: "Raw status", key: "rawStatus" },
    { header: "Normalized status", key: "normalizedStatus" },
    { header: "Flow status", key: "flowStatus" },
    { header: "Email status", key: "emailStatus" },
    { header: "Last reply", key: "lastReplyDate" },
    { header: "Contact attempts", key: "contactAttempts" },
    { header: "Broker", key: "brokerName" },
    { header: "Owner", key: "assignedOwnerName" },
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      leadDate: formatDate(row.leadDate),
      fullName: `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
      email: row.email ?? "",
      phone: row.phone ?? "",
      city: row.city ?? "",
      sourceCountrySheet: row.sourceCountrySheet,
      leadType: row.leadType,
      rawStatus: row.rawStatus ?? "",
      normalizedStatus: row.normalizedStatus ?? "",
      flowStatus: row.flowStatus ?? "",
      emailStatus: row.emailStatus ?? "",
      lastReplyDate: formatDateTime(row.lastReplyDate),
      contactAttempts: row.contactAttempts,
      brokerName: row.brokerName ?? "",
      assignedOwnerName: row.assignedOwnerName ?? "",
    });
  });

  applyHeaderStyle(worksheet);
  autoFitColumns(worksheet);
  return workbook;
}

export function buildBrokerLeadsCsv(rows: BrokerLeadExportRow[]): string {
  const lines = [csvRow([
    "Lead date",
    "Nombre",
    "Email",
    "Telefono",
    "Ciudad",
    "Hoja",
    "Lead type",
    "Raw status",
    "Normalized status",
    "Flow status",
    "Email status",
    "Last reply",
    "Contact attempts",
    "Broker",
    "Owner",
  ])];

  rows.forEach((row) => {
    lines.push(csvRow([
      formatDate(row.leadDate),
      `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
      row.email ?? "",
      row.phone ?? "",
      row.city ?? "",
      row.sourceCountrySheet,
      row.leadType,
      row.rawStatus ?? "",
      row.normalizedStatus ?? "",
      row.flowStatus ?? "",
      row.emailStatus ?? "",
      formatDateTime(row.lastReplyDate),
      row.contactAttempts,
      row.brokerName ?? "",
      row.assignedOwnerName ?? "",
    ]));
  });

  return lines.join("\n");
}

export async function buildBrokerDetailWorkbook(data: BrokerDetailExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Campo", key: "field" },
    { header: "Valor", key: "value" },
  ];

  [
    ["Broker ID", data.id],
    ["Nombre visible", data.displayName],
    ["Nombre legal", data.legalOrBillingName ?? ""],
    ["Pais", data.country ?? ""],
    ["Ciudad", data.city ?? ""],
    ["Email", data.primaryEmail ?? ""],
    ["Telefono", data.primaryPhone ?? ""],
    ["Declared supply", data.declaredSupplyText ?? ""],
    ["Broker type", data.brokerType],
    ["Status", data.status],
    ["Quality rating", data.qualityRating ?? ""],
    ["Notas", data.notes ?? ""],
    ["Leads asociados", data.metrics.totalReferrals ? data.leads.length : data.leads.length],
    ["Referrals", data.metrics.totalReferrals],
    ["Elegibles", data.metrics.eligibleReferrals],
    ["Base total", formatMoney(data.metrics.baseTotal)],
    ["Final total", formatMoney(data.metrics.finalAmountTotal)],
    ["Creado", formatDateTime(data.createdAt)],
    ["Actualizado", formatDateTime(data.updatedAt)],
  ].forEach(([field, value]) => summary.addRow({ field, value }));

  applyHeaderStyle(summary);
  autoFitColumns(summary);

  const leads = workbook.addWorksheet("Leads");
  leads.columns = [
    { header: "Nombre", key: "fullName" },
    { header: "Email", key: "email" },
    { header: "Lead type", key: "leadType" },
    { header: "Raw status", key: "rawStatus" },
  ];
  data.leads.forEach((lead) => {
    leads.addRow({
      fullName: `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
      email: lead.email ?? "",
      leadType: lead.leadType,
      rawStatus: lead.rawStatus ?? "",
    });
  });
  applyHeaderStyle(leads);
  autoFitColumns(leads);

  const referrals = workbook.addWorksheet("Referrals");
  referrals.columns = [
    { header: "Trabajador", key: "workerFullName" },
    { header: "Status raw", key: "workerStatusRaw" },
    { header: "Horas", key: "hoursWorked" },
    { header: "Threshold", key: "minimumHoursThreshold" },
    { header: "Elegible", key: "minimumHoursMet" },
    { header: "Final", key: "finalAmount" },
    { header: "Periodo inicio", key: "referencePeriodStart" },
    { header: "Periodo fin", key: "referencePeriodEnd" },
    { header: "Sheet", key: "sourceInvoiceSheet" },
  ];
  data.referrals.forEach((referral) => {
    referrals.addRow({
      workerFullName: referral.workerFullName,
      workerStatusRaw: referral.workerStatusRaw ?? "",
      hoursWorked: referral.hoursWorked != null ? Number(referral.hoursWorked).toFixed(2) : "",
      minimumHoursThreshold: referral.minimumHoursThreshold ?? "",
      minimumHoursMet: referral.minimumHoursMet == null ? "" : referral.minimumHoursMet ? "SI" : "NO",
      finalAmount: referral.finalAmount != null ? formatMoney(referral.finalAmount) : "",
      referencePeriodStart: formatDate(referral.referencePeriodStart),
      referencePeriodEnd: formatDate(referral.referencePeriodEnd),
      sourceInvoiceSheet: referral.sourceInvoiceSheet ?? "",
    });
  });
  applyHeaderStyle(referrals);
  autoFitColumns(referrals);

  const invoices = workbook.addWorksheet("Facturas");
  invoices.columns = [
    { header: "Periodo inicio", key: "referencePeriodStart" },
    { header: "Periodo fin", key: "referencePeriodEnd" },
    { header: "Invoice type", key: "invoiceType" },
    { header: "Threshold", key: "minimumHoursThreshold" },
    { header: "Elegibles", key: "candidateCountEligible" },
    { header: "Base", key: "baseTotal" },
    { header: "VAT", key: "vatAmount" },
    { header: "Final", key: "finalAmount" },
    { header: "Status", key: "status" },
  ];
  data.invoices.forEach((invoice) => {
    invoices.addRow({
      referencePeriodStart: formatDate(invoice.referencePeriodStart),
      referencePeriodEnd: formatDate(invoice.referencePeriodEnd),
      invoiceType: invoice.invoiceType ?? "",
      minimumHoursThreshold: invoice.minimumHoursThreshold ?? "",
      candidateCountEligible: invoice.candidateCountEligible,
      baseTotal: formatMoney(invoice.baseTotal),
      vatAmount: formatMoney(invoice.vatAmount),
      finalAmount: formatMoney(invoice.finalAmount),
      status: invoice.status,
    });
  });
  applyHeaderStyle(invoices);
  autoFitColumns(invoices);

  return workbook;
}

export function buildBrokerDetailCsv(data: BrokerDetailExportData): string {
  const lines = [
    csvRow(["Campo", "Valor"]),
    csvRow(["Broker ID", data.id]),
    csvRow(["Nombre visible", data.displayName]),
    csvRow(["Nombre legal", data.legalOrBillingName ?? ""]),
    csvRow(["Pais", data.country ?? ""]),
    csvRow(["Ciudad", data.city ?? ""]),
    csvRow(["Email", data.primaryEmail ?? ""]),
    csvRow(["Telefono", data.primaryPhone ?? ""]),
    csvRow(["Broker type", data.brokerType]),
    csvRow(["Status", data.status]),
    csvRow(["Quality rating", data.qualityRating ?? ""]),
    csvRow(["Referrals", data.metrics.totalReferrals]),
    csvRow(["Elegibles", data.metrics.eligibleReferrals]),
    csvRow(["Base total", formatMoney(data.metrics.baseTotal)]),
    csvRow(["Final total", formatMoney(data.metrics.finalAmountTotal)]),
    "",
    csvRow(["LEADS"]),
    csvRow(["Nombre", "Email", "Lead type", "Raw status"]),
  ];

  data.leads.forEach((lead) => {
    lines.push(csvRow([
      `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
      lead.email ?? "",
      lead.leadType,
      lead.rawStatus ?? "",
    ]));
  });

  lines.push("");
  lines.push(csvRow(["REFERRALS"]));
  lines.push(csvRow(["Trabajador", "Status raw", "Horas", "Threshold", "Elegible", "Final"]));
  data.referrals.forEach((referral) => {
    lines.push(csvRow([
      referral.workerFullName,
      referral.workerStatusRaw ?? "",
      referral.hoursWorked != null ? Number(referral.hoursWorked).toFixed(2) : "",
      referral.minimumHoursThreshold ?? "",
      referral.minimumHoursMet == null ? "" : referral.minimumHoursMet ? "SI" : "NO",
      referral.finalAmount != null ? formatMoney(referral.finalAmount) : "",
    ]));
  });

  lines.push("");
  lines.push(csvRow(["FACTURAS"]));
  lines.push(csvRow(["Periodo inicio", "Periodo fin", "Invoice type", "Threshold", "Elegibles", "Base", "VAT", "Final", "Status"]));
  data.invoices.forEach((invoice) => {
    lines.push(csvRow([
      formatDate(invoice.referencePeriodStart),
      formatDate(invoice.referencePeriodEnd),
      invoice.invoiceType ?? "",
      invoice.minimumHoursThreshold ?? "",
      invoice.candidateCountEligible,
      formatMoney(invoice.baseTotal),
      formatMoney(invoice.vatAmount),
      formatMoney(invoice.finalAmount),
      invoice.status,
    ]));
  });

  return lines.join("\n");
}

export async function buildBrokerLeadDetailWorkbook(data: BrokerLeadDetailExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Campo", key: "field" },
    { header: "Valor", key: "value" },
  ];

  [
    ["Lead ID", data.id],
    ["Nombre", `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim()],
    ["Email", data.email ?? ""],
    ["Telefono", data.phone ?? ""],
    ["Ciudad", data.city ?? ""],
    ["Hoja", data.sourceCountrySheet],
    ["Source file", data.sourceFileName ?? ""],
    ["Row hash", data.sourceRowHash],
    ["Lead type", data.leadType],
    ["Raw status", data.rawStatus ?? ""],
    ["Normalized status", data.normalizedStatus ?? ""],
    ["Flow status", data.flowStatus ?? ""],
    ["Email status", data.emailStatus ?? ""],
    ["Delivery error", data.deliveryError ?? ""],
    ["Last reply", formatDateTime(data.lastReplyDate)],
    ["Lead date", formatDateTime(data.leadDate)],
    ["Broker", data.brokerName ?? ""],
    ["Owner", data.assignedOwnerName ?? ""],
    ["Notas", data.notes ?? ""],
  ].forEach(([field, value]) => summary.addRow({ field, value }));

  applyHeaderStyle(summary);
  autoFitColumns(summary);

  const attempts = workbook.addWorksheet("Contactos");
  attempts.columns = [
    { header: "Intento", key: "attemptNo" },
    { header: "Canal", key: "channel" },
    { header: "Fecha", key: "contactDate" },
    { header: "Resultado", key: "result" },
    { header: "Summary", key: "summary" },
    { header: "Next step", key: "nextStep" },
    { header: "Next step date", key: "nextStepDate" },
  ];

  data.contactAttempts.forEach((attempt) => {
    attempts.addRow({
      attemptNo: attempt.attemptNo,
      channel: attempt.channel,
      contactDate: formatDateTime(attempt.contactDate),
      result: attempt.result ?? "",
      summary: attempt.summary ?? "",
      nextStep: attempt.nextStep ?? "",
      nextStepDate: formatDateTime(attempt.nextStepDate),
    });
  });

  applyHeaderStyle(attempts);
  autoFitColumns(attempts);

  return workbook;
}

export function buildBrokerLeadDetailCsv(data: BrokerLeadDetailExportData): string {
  const lines = [
    csvRow(["Campo", "Valor"]),
    csvRow(["Lead ID", data.id]),
    csvRow(["Nombre", `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim()]),
    csvRow(["Email", data.email ?? ""]),
    csvRow(["Telefono", data.phone ?? ""]),
    csvRow(["Ciudad", data.city ?? ""]),
    csvRow(["Hoja", data.sourceCountrySheet]),
    csvRow(["Lead type", data.leadType]),
    csvRow(["Raw status", data.rawStatus ?? ""]),
    csvRow(["Normalized status", data.normalizedStatus ?? ""]),
    csvRow(["Flow status", data.flowStatus ?? ""]),
    csvRow(["Email status", data.emailStatus ?? ""]),
    csvRow(["Delivery error", data.deliveryError ?? ""]),
    csvRow(["Broker", data.brokerName ?? ""]),
    csvRow(["Owner", data.assignedOwnerName ?? ""]),
    "",
    csvRow(["CONTACTOS"]),
    csvRow(["Intento", "Canal", "Fecha", "Resultado", "Summary", "Next step", "Next step date"]),
  ];

  data.contactAttempts.forEach((attempt) => {
    lines.push(csvRow([
      attempt.attemptNo,
      attempt.channel,
      formatDateTime(attempt.contactDate),
      attempt.result ?? "",
      attempt.summary ?? "",
      attempt.nextStep ?? "",
      formatDateTime(attempt.nextStepDate),
    ]));
  });

  return lines.join("\n");
}
