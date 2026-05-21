"use server";

import ExcelJS from "exceljs";
import { CandidateStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canExportCandidates, canExportLegalReview, canExportLogistics } from "@/lib/permissions";

type ExportResponse = {
  base64: string;
  filename: string;
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "";

  return value.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "Pendiente";

  return value.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function workbookToBase64(workbook: ExcelJS.Workbook): Promise<string> {
  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer).toString("base64");
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

    column.width = Math.min(Math.max(maxLength, 12), 40);
  });
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet): void {
  const headerRow = worksheet.getRow(1);

  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function normalizeStringFilter(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBooleanFilter(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return undefined;
}

function normalizeStatusFilter(value: unknown): CandidateStatus | undefined {
  if (typeof value !== "string") return undefined;

  if (Object.values(CandidateStatus).includes(value as CandidateStatus)) {
    return value as CandidateStatus;
  }

  return undefined;
}

export async function exportCandidatesXLSX(
  filters: Record<string, unknown> = {}
): Promise<ExportResponse> {
  const tenant = await requireTenant();

  if (!canExportCandidates(tenant.role)) {
    throw new Error("No autorizado");
  }

  const where: Prisma.CandidateWhereInput = {
    organizationId: tenant.organizationId!,
    status: normalizeStatusFilter(filters.status),
    country: normalizeStringFilter(filters.country),
    intermediaryId: normalizeStringFilter(filters.intermediaryId),
    paid400pln: normalizeBooleanFilter(filters.paid400pln),
  };

  const candidates = await prisma.candidate.findMany({
    where,
    include: {
      intermediary: { select: { name: true } },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Candidatos");

  worksheet.columns = [
    { header: "ID", key: "id" },
    { header: "Nombre", key: "firstName" },
    { header: "Apellido", key: "lastName" },
    { header: "Email", key: "email" },
    { header: "Teléfono", key: "phone" },
    { header: "País", key: "country" },
    { header: "Estado", key: "status" },
    { header: "Intermediario", key: "intermediary" },
    { header: "Pago 400 PLN", key: "paid400pln" },
    { header: "Fecha Registro", key: "createdAt" },
    { header: "Pasaporte", key: "passportNumber" },
    { header: "Exp. Pasaporte", key: "passportExpiry" },
    { header: "PESEL", key: "peselNumber" },
    { header: "Ubicación PL", key: "locationStatus" },
  ];

  candidates.forEach((candidate) => {
    worksheet.addRow({
      id: candidate.id,
      firstName: candidate.firstName ?? "",
      lastName: candidate.lastName ?? "",
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      country: candidate.country,
      status: candidate.status,
      intermediary: candidate.intermediary?.name ?? "N/A",
      paid400pln: candidate.paid400pln ? "Sí" : "No",
      createdAt: formatDate(candidate.createdAt),
      passportNumber: candidate.passportNumber ?? "",
      passportExpiry: formatDate(candidate.passportExpiry),
      peselNumber: candidate.peselNumber ?? "",
      locationStatus: candidate.locationStatus,
    });
  });

  applyHeaderStyle(worksheet);
  autoFitColumns(worksheet);

  const base64 = await workbookToBase64(workbook);
  const filename = `candidates_export_${new Date().toISOString().split("T")[0]}.xlsx`;

  return { base64, filename };
}

export const exportCandidatesToXLSX = exportCandidatesXLSX;

export async function exportLegalReviewXLSX(): Promise<ExportResponse> {
  const tenant = await requireTenant();

  if (!canExportLegalReview(tenant.role)) {
    throw new Error("No autorizado");
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      organizationId: tenant.organizationId!,
      status: CandidateStatus.EN_REVISION_LEGAL,
    },
    include: {
      intermediary: { select: { name: true } },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Revision Legal");

  worksheet.columns = [
    { header: "Candidato", key: "candidate" },
    { header: "Pasaporte", key: "passportNumber" },
    { header: "Exp. Pasaporte", key: "passportExpiry" },
    { header: "Karta Pobytu", key: "kartaPobytuNumber" },
    { header: "PESEL", key: "peselNumber" },
    { header: "Intermediario", key: "intermediary" },
    { header: "Fecha Solicitud", key: "updatedAt" },
  ];

  candidates.forEach((candidate) => {
    worksheet.addRow({
      candidate: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(),
      passportNumber: candidate.passportNumber ?? "",
      passportExpiry: formatDate(candidate.passportExpiry),
      kartaPobytuNumber: candidate.kartaPobytuNumber ?? "No",
      peselNumber: candidate.peselNumber ?? "No",
      intermediary: candidate.intermediary?.name ?? "N/A",
      updatedAt: formatDate(candidate.updatedAt),
    });
  });

  applyHeaderStyle(worksheet);
  autoFitColumns(worksheet);

  const base64 = await workbookToBase64(workbook);
  const filename = `legal_review_${new Date().toISOString().split("T")[0]}.xlsx`;

  return { base64, filename };
}

export async function exportLogisticsArrivalsXLSX(): Promise<ExportResponse> {
  const tenant = await requireTenant();

  if (!canExportLogistics(tenant.role)) {
    throw new Error("No autorizado");
  }

  const events = await prisma.logisticsEvent.findMany({
    where: {
      organizationId: tenant.organizationId!,
    },
    include: {
      candidate: true,
    },
    orderBy: {
      arrivalDate: "asc",
    },
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ORI CRUIT HUB";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Llegadas");

  worksheet.columns = [
    { header: "Fecha", key: "arrivalDate" },
    { header: "Candidato", key: "candidate" },
    { header: "Transporte", key: "transportType" },
    { header: "Terminal", key: "terminal" },
    { header: "Vuelo/Tren", key: "flightOrTrain" },
    { header: "Recoge", key: "pickedUpBy" },
    { header: "Confirmado", key: "confirmed" },
  ];

  events.forEach((event) => {
    worksheet.addRow({
      arrivalDate: formatDateTime(event.arrivalDate),
      candidate: `${event.candidate.firstName ?? ""} ${event.candidate.lastName ?? ""
        }`.trim(),
      transportType: event.transportType ?? "",
      terminal: event.terminal ?? "",
      flightOrTrain: event.flightOrTrain ?? "",
      pickedUpBy: event.pickedUpBy ?? "",
      confirmed: event.confirmed ? "SÍ" : "NO",
    });
  });

  applyHeaderStyle(worksheet);
  autoFitColumns(worksheet);

  const base64 = await workbookToBase64(workbook);
  const filename = `logistics_arrivals_${new Date().toISOString().split("T")[0]}.xlsx`;

  return { base64, filename };
}
