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
  const numberValue = Number(value ?? 0);
  return `PLN ${numberValue.toFixed(2)}`;
}

function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text =
        value === null || value === undefined ? "" : String(value);

      maxLength = Math.max(maxLength, text.length + 2);
    });

    column.width = Math.min(Math.max(maxLength, 12), 42);
  });
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet): void {
  const headerRow = worksheet.getRow(1);

  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function csvRow(values: unknown[]): string {
  return values.map((value) => escapeCsv(value)).join(";");
}

export interface BrokerInvoiceExportLine {
  workerFullName: string;
  workerStatusRaw: string | null;
  hoursWorked: unknown;
  minimumHoursThreshold: number | null;
  eligible: boolean | null;
  rateApplied: unknown;
  baseAmount: unknown;
  vatRate: unknown;
  finalAmount: unknown;
  notes: string | null;
  workerReferral?: {
    sourceRowHash: string | null;
  } | null;
}

export interface BrokerInvoiceExportData {
  id: string;
  sourceInvoiceSheet: string;
  sourceFileName: string | null;
  referencePeriodStart: Date | string | null;
  referencePeriodEnd: Date | string | null;
  invoiceType: string | null;
  minimumHoursThreshold: number | null;
  candidateCountEligible: number;
  baseTotal: unknown;
  vatAmount: unknown;
  finalAmount: unknown;
  currency: string;
  status: string;
  notes: string | null;
  summaryBaseTotal: unknown;
  summaryVatAmount: unknown;
  summaryFinalAmount: unknown;
  summaryCandidateCount: number | null;
  summaryMismatchWarning: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  broker: {
    displayName: string;
    legalOrBillingName: string | null;
    country: string | null;
    city: string | null;
    primaryEmail: string | null;
    primaryPhone: string | null;
    brokerType: string;
    status: string;
  };
  lines: BrokerInvoiceExportLine[];
}

export interface BrokerInvoiceListExportRow {
  brokerName: string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  invoiceType: string | null;
  minimumHoursThreshold: number | null;
  candidateCountEligible: number;
  baseTotal: unknown;
  vatAmount: unknown;
  finalAmount: unknown;
  status: string;
  sourceInvoiceSheet: string;
  sourceFileName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export async function buildBrokerInvoiceWorkbook(invoice: BrokerInvoiceExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Campo", key: "field" },
    { header: "Valor", key: "value" },
  ];

  const periodStart = formatDate(invoice.referencePeriodStart);
  const periodEnd = formatDate(invoice.referencePeriodEnd);

  [
    ["Factura ID", invoice.id],
    ["Broker", invoice.broker.displayName],
    ["Nombre legal", invoice.broker.legalOrBillingName ?? ""],
    ["País", invoice.broker.country ?? ""],
    ["Ciudad", invoice.broker.city ?? ""],
    ["Email", invoice.broker.primaryEmail ?? ""],
    ["Teléfono", invoice.broker.primaryPhone ?? ""],
    ["Broker type", invoice.broker.brokerType],
    ["Broker status", invoice.broker.status],
    ["Sheet origen", invoice.sourceInvoiceSheet],
    ["Archivo origen", invoice.sourceFileName ?? ""],
    ["Periodo inicio", periodStart],
    ["Periodo fin", periodEnd],
    ["Invoice type", invoice.invoiceType ?? ""],
    ["Umbral horas", invoice.minimumHoursThreshold ?? ""],
    ["Elegibles", invoice.candidateCountEligible],
    ["Base total", formatMoney(invoice.baseTotal)],
    ["VAT amount", formatMoney(invoice.vatAmount)],
    ["Final amount", formatMoney(invoice.finalAmount)],
    ["Summary base total", formatMoney(invoice.summaryBaseTotal)],
    ["Summary VAT amount", formatMoney(invoice.summaryVatAmount)],
    ["Summary final amount", formatMoney(invoice.summaryFinalAmount)],
    ["Summary candidates", invoice.summaryCandidateCount ?? ""],
    ["Warning", invoice.summaryMismatchWarning ?? ""],
    ["Status", invoice.status],
    ["Notas", invoice.notes ?? ""],
    ["Creada", formatDateTime(invoice.createdAt)],
    ["Actualizada", formatDateTime(invoice.updatedAt)],
  ].forEach(([field, value]) => {
    summary.addRow({ field, value });
  });

  applyHeaderStyle(summary);
  autoFitColumns(summary);

  const lines = workbook.addWorksheet("Lineas");
  lines.columns = [
    { header: "Trabajador", key: "workerFullName" },
    { header: "Status raw", key: "workerStatusRaw" },
    { header: "Horas", key: "hoursWorked" },
    { header: "Threshold", key: "minimumHoursThreshold" },
    { header: "Elegible", key: "eligible" },
    { header: "Rate", key: "rateApplied" },
    { header: "Base", key: "baseAmount" },
    { header: "VAT", key: "vatRate" },
    { header: "Final", key: "finalAmount" },
    { header: "Notas", key: "notes" },
    { header: "Row hash", key: "sourceRowHash" },
  ];

  invoice.lines.forEach((line) => {
    lines.addRow({
      workerFullName: line.workerFullName,
      workerStatusRaw: line.workerStatusRaw ?? "",
      hoursWorked: line.hoursWorked != null ? Number(line.hoursWorked).toFixed(2) : "",
      minimumHoursThreshold: line.minimumHoursThreshold ?? "",
      eligible: line.eligible == null ? "" : line.eligible ? "SI" : "NO",
      rateApplied: line.rateApplied != null ? formatMoney(line.rateApplied) : "",
      baseAmount: line.baseAmount != null ? formatMoney(line.baseAmount) : "",
      vatRate: line.vatRate != null ? `${Number(line.vatRate) * 100}%` : "",
      finalAmount: line.finalAmount != null ? formatMoney(line.finalAmount) : "",
      notes: line.notes ?? "",
      sourceRowHash: line.workerReferral?.sourceRowHash ?? "",
    });
  });

  applyHeaderStyle(lines);
  autoFitColumns(lines);

  return workbook;
}

export function buildBrokerInvoiceCsv(invoice: BrokerInvoiceExportData): string {
  const rows: string[] = [];

  rows.push(csvRow(["Campo", "Valor"]));
  rows.push(csvRow(["Factura ID", invoice.id]));
  rows.push(csvRow(["Broker", invoice.broker.displayName]));
  rows.push(csvRow(["Nombre legal", invoice.broker.legalOrBillingName ?? ""]));
  rows.push(csvRow(["Sheet origen", invoice.sourceInvoiceSheet]));
  rows.push(csvRow(["Archivo origen", invoice.sourceFileName ?? ""]));
  rows.push(csvRow(["Periodo inicio", formatDate(invoice.referencePeriodStart)]));
  rows.push(csvRow(["Periodo fin", formatDate(invoice.referencePeriodEnd)]));
  rows.push(csvRow(["Invoice type", invoice.invoiceType ?? ""]));
  rows.push(csvRow(["Umbral horas", invoice.minimumHoursThreshold ?? ""]));
  rows.push(csvRow(["Elegibles", invoice.candidateCountEligible]));
  rows.push(csvRow(["Base total", formatMoney(invoice.baseTotal)]));
  rows.push(csvRow(["VAT amount", formatMoney(invoice.vatAmount)]));
  rows.push(csvRow(["Final amount", formatMoney(invoice.finalAmount)]));
  rows.push(csvRow(["Status", invoice.status]));
  rows.push("");
  rows.push(csvRow([
    "Trabajador",
    "Status raw",
    "Horas",
    "Threshold",
    "Elegible",
    "Rate",
    "Base",
    "VAT",
    "Final",
    "Notas",
    "Row hash",
  ]));

  invoice.lines.forEach((line) => {
    rows.push(csvRow([
      line.workerFullName,
      line.workerStatusRaw ?? "",
      line.hoursWorked != null ? Number(line.hoursWorked).toFixed(2) : "",
      line.minimumHoursThreshold ?? "",
      line.eligible == null ? "" : line.eligible ? "SI" : "NO",
      line.rateApplied != null ? formatMoney(line.rateApplied) : "",
      line.baseAmount != null ? formatMoney(line.baseAmount) : "",
      line.vatRate != null ? `${Number(line.vatRate) * 100}%` : "",
      line.finalAmount != null ? formatMoney(line.finalAmount) : "",
      line.notes ?? "",
      line.workerReferral?.sourceRowHash ?? "",
    ]));
  });

  return rows.join("\n");
}

export async function buildBrokerInvoicesWorkbook(rows: BrokerInvoiceListExportRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Facturas");
  worksheet.columns = [
    { header: "Broker", key: "brokerName" },
    { header: "Periodo inicio", key: "periodStart" },
    { header: "Periodo fin", key: "periodEnd" },
    { header: "Invoice type", key: "invoiceType" },
    { header: "Threshold", key: "minimumHoursThreshold" },
    { header: "Elegibles", key: "candidateCountEligible" },
    { header: "Base", key: "baseTotal" },
    { header: "VAT", key: "vatAmount" },
    { header: "Final", key: "finalAmount" },
    { header: "Status", key: "status" },
    { header: "Sheet origen", key: "sourceInvoiceSheet" },
    { header: "Archivo origen", key: "sourceFileName" },
    { header: "Creada", key: "createdAt" },
    { header: "Actualizada", key: "updatedAt" },
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      brokerName: row.brokerName,
      periodStart: formatDate(row.periodStart),
      periodEnd: formatDate(row.periodEnd),
      invoiceType: row.invoiceType ?? "",
      minimumHoursThreshold: row.minimumHoursThreshold ?? "",
      candidateCountEligible: row.candidateCountEligible,
      baseTotal: formatMoney(row.baseTotal),
      vatAmount: formatMoney(row.vatAmount),
      finalAmount: formatMoney(row.finalAmount),
      status: row.status,
      sourceInvoiceSheet: row.sourceInvoiceSheet,
      sourceFileName: row.sourceFileName ?? "",
      createdAt: formatDateTime(row.createdAt),
      updatedAt: formatDateTime(row.updatedAt),
    });
  });

  applyHeaderStyle(worksheet);
  autoFitColumns(worksheet);

  return workbook;
}

export function buildBrokerInvoicesCsv(rows: BrokerInvoiceListExportRow[]): string {
  const lines = [
    csvRow([
      "Broker",
      "Periodo inicio",
      "Periodo fin",
      "Invoice type",
      "Threshold",
      "Elegibles",
      "Base",
      "VAT",
      "Final",
      "Status",
      "Sheet origen",
      "Archivo origen",
      "Creada",
      "Actualizada",
    ]),
  ];

  rows.forEach((row) => {
    lines.push(csvRow([
      row.brokerName,
      formatDate(row.periodStart),
      formatDate(row.periodEnd),
      row.invoiceType ?? "",
      row.minimumHoursThreshold ?? "",
      row.candidateCountEligible,
      formatMoney(row.baseTotal),
      formatMoney(row.vatAmount),
      formatMoney(row.finalAmount),
      row.status,
      row.sourceInvoiceSheet,
      row.sourceFileName ?? "",
      formatDateTime(row.createdAt),
      formatDateTime(row.updatedAt),
    ]));
  });

  return lines.join("\n");
}
