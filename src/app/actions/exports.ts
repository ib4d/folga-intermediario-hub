"use server";

import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { requireTenant } from "@/lib/tenant";

export async function exportCandidatesXLSX(filters: Record<string, unknown> = {}) {
  const tenant = await requireTenant();
  
  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      organizationId: tenant.organizationId!,
      status: filters.status || undefined,
      country: filters.country || undefined,
      intermediaryId: filters.intermediaryId || undefined,
      paid400pln: filters.paid400pln !== undefined ? filters.paid400pln === "true" : undefined,
    },
    include: {
      intermediary: { select: { name: true } },
    },
  });

  const data = candidates.map((c) => ({
    ID: c.id,
    Nombre: c.firstName,
    Apellido: c.lastName,
    Email: c.email,
    Teléfono: c.phone,
    País: c.country,
    Estado: c.status,
    Intermediario: c.intermediary?.name || "N/A",
    "Pago 400 PLN": c.paid400pln ? "Sí" : "No",
    "Fecha Registro": c.createdAt.toLocaleDateString(),
    Pasaporte: c.passportNumber,
    "Exp. Pasaporte": c.passportExpiry?.toLocaleDateString() || "",
    PESEL: c.peselNumber,
    "Ubicación PL": c.locationStatus,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Candidatos");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = buffer.toString("base64");
  const filename = `candidates_export_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { base64, filename };
}

// Alias for compatibility
export const exportCandidatesToXLSX = exportCandidatesXLSX;

export async function exportLegalReviewXLSX() {
  const tenant = await requireTenant();
  
  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const candidates = await prisma.candidate.findMany({
    where: { 
      organizationId: tenant.organizationId!,
      status: "EN_REVISION_LEGAL" 
    },
    include: { intermediary: { select: { name: true } } },
  });

  const data = candidates.map(c => ({
    Candidato: `${c.firstName} ${c.lastName}`,
    Pasaporte: c.passportNumber,
    "Exp. Pasaporte": c.passportExpiry?.toLocaleDateString() || "",
    "Karta Pobytu": c.kartaPobytuNumber || "No",
    PESEL: c.peselNumber || "No",
    Intermediario: c.intermediary?.name || "N/A",
    "Fecha Solicitud": c.updatedAt.toLocaleDateString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Revision Legal");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = buffer.toString("base64");
  const filename = `legal_review_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { base64, filename };
}

export async function exportLogisticsArrivalsXLSX() {
  const tenant = await requireTenant();
  
  if (!["ADMIN", "SUPERADMIN", "LOGISTICA"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const events = await prisma.logisticsEvent.findMany({
    where: { organizationId: tenant.organizationId! },
    include: { candidate: true },
    orderBy: { arrivalDate: "asc" },
  });

  const data = events.map(e => ({
    Fecha: e.arrivalDate?.toLocaleString() || "Pendiente",
    Candidato: `${e.candidate.firstName} ${e.candidate.lastName}`,
    Transporte: e.transportType,
    Terminal: e.terminal,
    "Vuelo/Tren": e.flightOrTrain,
    "Recoge": e.pickedUpBy,
    Confirmado: e.confirmed ? "SÍ" : "NO",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Llegadas");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = buffer.toString("base64");
  const filename = `logistics_arrivals_${new Date().toISOString().split('T')[0]}.xlsx`;

  return { base64, filename };
}