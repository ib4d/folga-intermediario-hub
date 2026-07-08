import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

import {
  computeRowHash,
  inferContactChannel,
  inferThresholdFromText,
  normalizeBooleanFlag,
  normalizeEmail,
  normalizeLeadStatus,
  normalizeLeadType,
  normalizePhone,
  normalizeText,
  parseBrokerDate,
  parseNumber,
  parseReferencePeriod,
  titleCaseName,
} from "./utils";

type BrokerLeadRow = Record<string, unknown>;
type BrokerSheetSummaryRow = Record<string, unknown>;

export async function importBrokerLeadsWorkbook(input: {
  organizationId: string;
  actorUserId?: string | null;
  fileName: string;
  fileBuffer: Buffer;
  sourceCountrySheet?: string;
}) {
  const workbook = XLSX.read(input.fileBuffer, { type: "buffer" });
  const sourceCountrySheet = input.sourceCountrySheet ?? "GWATEMALA";
  const worksheet =
    workbook.Sheets[sourceCountrySheet] ??
    workbook.Sheets[sourceCountrySheet.toUpperCase()] ??
    workbook.Sheets[sourceCountrySheet.toLowerCase()] ??
    workbook.Sheets["GUATEMALA"] ??
    workbook.Sheets["GWATEMALA"];

  if (!worksheet) {
    throw new Error(`No se encontro la hoja ${sourceCountrySheet} en ${input.fileName}.`);
  }

  const rows = XLSX.utils.sheet_to_json<BrokerLeadRow>(worksheet, { defval: null });
  let imported = 0;

  for (const row of rows) {
    const firstName = normalizeText(row["IMIĘ"]);
    const lastName = normalizeText(row["NAZWISKO"]);
    const email = normalizeEmail(row["MAIL"]);
    const phone = normalizePhone(row["NUMER TELEFONU"]);
    const city = normalizeText(row["MIASTO"]);
    const leadDate = parseBrokerDate(row["DATA LEADu"]);
    const sourceRowHash = computeRowHash({
      leadDate: normalizeText(row["DATA LEADu"]),
      firstName,
      lastName,
      email,
      phone,
      city,
      declaredSupplyText: normalizeText(row["ILE OSÓB JESTEŚ W STANIE DOSTARCZYĆ"]),
      rawStatus: normalizeText(row["STATUS"]),
      leadType: normalizeText(row["LEAD_TYPE"]),
    });

    const lead = await prisma.brokerLead.upsert({
      where: {
        organizationId_sourceCountrySheet_sourceRowHash: {
          organizationId: input.organizationId,
          sourceCountrySheet,
          sourceRowHash,
        },
      },
      update: {
        sourceFileName: input.fileName,
        leadDate,
        firstName,
        lastName,
        email,
        phone,
        city,
        declaredSupplyText: normalizeText(row["ILE OSÓB JESTEŚ W STANIE DOSTARCZYĆ"]),
        rawStatus: normalizeText(row["STATUS"]),
        normalizedStatus: normalizeLeadStatus(row["STATUS"]),
        flowStatus: normalizeText(row["FLOW_STATUS"]),
        flowSentDate: parseBrokerDate(row["FLOW_SENT_DATE"]),
        emailStatus: normalizeText(row["EMAIL_STATUS"]),
        deliveryError: normalizeText(row["DELIVERY_ERROR"]),
        leadType: normalizeLeadType(row["LEAD_TYPE"]),
        lastReplyDate: parseBrokerDate(row["LAST_REPLY_DATE"]),
        assignedOwnerId: input.actorUserId ?? null,
      },
      create: {
        organizationId: input.organizationId,
        sourceCountrySheet,
        sourceFileName: input.fileName,
        sourceRowHash,
        leadDate,
        firstName,
        lastName,
        email,
        phone,
        city,
        declaredSupplyText: normalizeText(row["ILE OSÓB JESTEŚ W STANIE DOSTARCZYĆ"]),
        rawStatus: normalizeText(row["STATUS"]),
        normalizedStatus: normalizeLeadStatus(row["STATUS"]),
        flowStatus: normalizeText(row["FLOW_STATUS"]),
        flowSentDate: parseBrokerDate(row["FLOW_SENT_DATE"]),
        emailStatus: normalizeText(row["EMAIL_STATUS"]),
        deliveryError: normalizeText(row["DELIVERY_ERROR"]),
        leadType: normalizeLeadType(row["LEAD_TYPE"]),
        lastReplyDate: parseBrokerDate(row["LAST_REPLY_DATE"]),
        assignedOwnerId: input.actorUserId ?? null,
      },
    });

    const attemptPayload = [
      {
        attemptNo: 1,
        contactDate: parseBrokerDate(row["DATA KONTAKT 1"]),
        result: normalizeText(row["KONTAKT"]),
      },
      {
        attemptNo: 2,
        contactDate: parseBrokerDate(row["DATA KONTAKT 2"]),
        result: normalizeText(row["KONTAKT2"]),
      },
      {
        attemptNo: 3,
        contactDate: parseBrokerDate(row["DATA KONTAKT 3"]),
        result: normalizeText(row["KONTAKT3"]),
      },
    ].filter((attempt) => attempt.contactDate || attempt.result);

    await prisma.brokerContactAttempt.deleteMany({
      where: {
        organizationId: input.organizationId,
        brokerLeadId: lead.id,
      },
    });

    if (attemptPayload.length > 0) {
      await prisma.brokerContactAttempt.createMany({
        data: attemptPayload.map((attempt) => ({
          organizationId: input.organizationId,
          brokerLeadId: lead.id,
          attemptNo: attempt.attemptNo,
          channel: inferContactChannel(attempt.result),
          contactDate: attempt.contactDate,
          result: attempt.result,
          summary: attempt.result,
        })),
      });
    }

    imported += 1;
  }

  return {
    imported,
    sourceCountrySheet,
    totalRows: rows.length,
  };
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as unknown[][];
}

function getSummaryMap(rows: BrokerSheetSummaryRow[]): Map<string, BrokerSheetSummaryRow> {
  const map = new Map<string, BrokerSheetSummaryRow>();
  for (const row of rows) {
    const brokerKey = normalizeText(row["INTERMEDIARIO"]);
    if (brokerKey) map.set(brokerKey.toUpperCase(), row);
  }
  return map;
}

export async function importBrokerInvoicesWorkbook(input: {
  organizationId: string;
  fileName: string;
  fileBuffer: Buffer;
}) {
  const workbook = XLSX.read(input.fileBuffer, { type: "buffer" });
  const summarySheetName = workbook.SheetNames.find((name) => name.toUpperCase() === "RESUMEN_FV");
  const summaryRows = summarySheetName
    ? XLSX.utils.sheet_to_json<BrokerSheetSummaryRow>(workbook.Sheets[summarySheetName], { defval: null })
    : [];
  const summaryMap = getSummaryMap(summaryRows);

  const importedSheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toUpperCase() === "RESUMEN_FV") continue;

    const rows = getSheetRows(workbook, sheetName);
    if (rows.length === 0) continue;

    const brokerName = titleCaseName(normalizeText(rows[0]?.[1]) ?? sheetName) ?? sheetName;
    const referencePeriod = parseReferencePeriod(rows[1]?.[1]);
    const invoiceType = normalizeText(rows[2]?.[1]);
    const ratePerPersonPln = parseNumber(rows[3]?.[1]);
    const headerRowIndex = rows.findIndex((row) =>
      row.some((cell) => normalizeText(cell)?.toUpperCase().includes("NAZWISKO I IMIE"))
    );

    if (headerRowIndex < 0) continue;

    const headerRow = rows[headerRowIndex].map((value) => normalizeText(value) ?? "");
    const detailRows = rows.slice(headerRowIndex + 1).filter((row) => normalizeText(row[0]));
    const threshold =
      inferThresholdFromText(invoiceType) ??
      inferThresholdFromText(headerRow.find((cell) => cell.includes("MIN")) ?? null);

    const broker = await prisma.broker.upsert({
      where: {
        organizationId_displayName: {
          organizationId: input.organizationId,
          displayName: brokerName,
        },
      },
      update: {
        legalOrBillingName: brokerName,
        status: "ACTIVE",
        brokerType: "PROVIDER",
        country: "PL",
      },
      create: {
        organizationId: input.organizationId,
        displayName: brokerName,
        legalOrBillingName: brokerName,
        status: "ACTIVE",
        brokerType: "PROVIDER",
        country: "PL",
      },
    });

    const summaryRow = summaryMap.get(sheetName.toUpperCase());

    const invoiceWhere = {
      organizationId: input.organizationId,
      sourceInvoiceSheet: sheetName,
      referencePeriodStart: referencePeriod.start,
      referencePeriodEnd: referencePeriod.end,
    };

    const existingInvoice = await prisma.brokerInvoice.findFirst({
      where: invoiceWhere,
      select: { id: true },
    });

    const invoice = existingInvoice
      ? await prisma.brokerInvoice.update({
          where: { id: existingInvoice.id },
          data: {
            brokerId: broker.id,
            sourceFileName: input.fileName,
            invoiceType,
            ratePerPersonPln,
            minimumHoursThreshold: threshold,
            vatRate: parseNumber(detailRows[0]?.[8]) ?? 0.23,
            summaryBaseTotal: parseNumber(summaryRow?.["BASE TOTAL"]),
            summaryVatAmount: parseNumber(summaryRow?.["IVA (23%)"]),
            summaryFinalAmount: parseNumber(summaryRow?.["IMPORTE FINAL"]),
            summaryCandidateCount: parseNumber(summaryRow?.["CANDIDATOS >=200H"]) ?? null,
            summaryMismatchWarning: null,
          },
        })
      : await prisma.brokerInvoice.create({
          data: {
            organizationId: input.organizationId,
            brokerId: broker.id,
            sourceInvoiceSheet: sheetName,
            sourceFileName: input.fileName,
            referencePeriodStart: referencePeriod.start,
            referencePeriodEnd: referencePeriod.end,
            invoiceType,
            ratePerPersonPln,
            minimumHoursThreshold: threshold,
            vatRate: parseNumber(detailRows[0]?.[8]) ?? 0.23,
            summaryBaseTotal: parseNumber(summaryRow?.["BASE TOTAL"]),
            summaryVatAmount: parseNumber(summaryRow?.["IVA (23%)"]),
            summaryFinalAmount: parseNumber(summaryRow?.["IMPORTE FINAL"]),
            summaryCandidateCount: parseNumber(summaryRow?.["CANDIDATOS >=200H"]) ?? null,
          },
        });

    await prisma.brokerInvoiceLine.deleteMany({
      where: { organizationId: input.organizationId, brokerInvoiceId: invoice.id },
    });

    for (const row of detailRows) {
      const workerFullName = titleCaseName(normalizeText(row[0])) ?? "Sin nombre";
      const hoursWorked = parseNumber(row[4]);
      const lineThreshold = inferThresholdFromText(headerRow[5]) ?? threshold;
      const eligibleFromSheet = normalizeBooleanFlag(row[5]);
      const minimumHoursMet =
        eligibleFromSheet ?? (hoursWorked != null && lineThreshold != null ? hoursWorked >= lineThreshold : null);
      const rateApplied = parseNumber(row[6]) ?? ratePerPersonPln;
      const baseAmount = parseNumber(row[7]) ?? (minimumHoursMet ? rateApplied : 0);
      const vatRate = parseNumber(row[8]) ?? 0.23;
      const importedFinal = parseNumber(row[9]);
      const finalAmount =
        importedFinal ??
        (baseAmount != null && vatRate != null ? Number((baseAmount * (1 + vatRate)).toFixed(2)) : baseAmount);

      const workerReferralWhere = {
        organizationId: input.organizationId,
        brokerId: broker.id,
        workerFullName,
        sourceInvoiceSheet: sheetName,
        referencePeriodStart: referencePeriod.start,
        referencePeriodEnd: referencePeriod.end,
      };

      const existingWorkerReferral = await prisma.workerReferral.findFirst({
        where: workerReferralWhere,
        select: { id: true },
      });

      const workerReferral = existingWorkerReferral
        ? await prisma.workerReferral.update({
            where: { id: existingWorkerReferral.id },
            data: {
              workerStatusRaw: normalizeText(row[2]),
              cycleLengthDays: parseNumber(row[3]) ?? undefined,
              hoursWorked,
              minimumHoursThreshold: lineThreshold,
              minimumHoursMet,
              ratePerPersonPln: rateApplied,
              baseAmount,
              vatRate,
              finalAmount,
              notes: normalizeText(row[10]),
              sourceFileName: input.fileName,
              sourceRowHash: computeRowHash({ sheetName, row }),
            },
          })
        : await prisma.workerReferral.create({
            data: {
              organizationId: input.organizationId,
              brokerId: broker.id,
              workerFullName,
              workerStatusRaw: normalizeText(row[2]),
              cycleLengthDays: parseNumber(row[3]) ?? undefined,
              hoursWorked,
              minimumHoursThreshold: lineThreshold,
              minimumHoursMet,
              ratePerPersonPln: rateApplied,
              baseAmount,
              vatRate,
              finalAmount,
              notes: normalizeText(row[10]),
              sourceInvoiceSheet: sheetName,
              sourceFileName: input.fileName,
              sourceRowHash: computeRowHash({ sheetName, row }),
              referencePeriodStart: referencePeriod.start,
              referencePeriodEnd: referencePeriod.end,
            },
          });

      await prisma.brokerInvoiceLine.create({
        data: {
          organizationId: input.organizationId,
          brokerInvoiceId: invoice.id,
          workerReferralId: workerReferral.id,
          workerFullName,
          workerStatusRaw: normalizeText(row[2]),
          cycleLengthDays: parseNumber(row[3]) ?? undefined,
          hoursWorked,
          minimumHoursThreshold: lineThreshold,
          eligible: minimumHoursMet,
          rateApplied,
          baseAmount,
          vatRate,
          finalAmount,
          notes: normalizeText(row[10]),
          sourceRowHash: computeRowHash({ sheetName, row }),
        },
      });
    }

    const totals = await prisma.brokerInvoiceLine.aggregate({
      where: { organizationId: input.organizationId, brokerInvoiceId: invoice.id },
      _sum: {
        baseAmount: true,
        finalAmount: true,
      },
      _count: {
        _all: true,
      },
    });

    const eligibleCount = await prisma.brokerInvoiceLine.count({
      where: {
        organizationId: input.organizationId,
        brokerInvoiceId: invoice.id,
        eligible: true,
      },
    });

    const vatRate = parseNumber(detailRows[0]?.[8]) ?? 0.23;
    const baseTotal = Number(totals._sum.baseAmount ?? 0);
    const finalAmount = Number(totals._sum.finalAmount ?? 0);
    const vatAmount = Number((finalAmount - baseTotal).toFixed(2));

    const summaryBaseTotal = parseNumber(summaryRow?.["BASE TOTAL"]);
    const summaryFinalAmount = parseNumber(summaryRow?.["IMPORTE FINAL"]);
    const summaryMismatchWarning =
      summaryBaseTotal != null && summaryFinalAmount != null &&
      (Math.abs(summaryBaseTotal - baseTotal) > 0.01 || Math.abs(summaryFinalAmount - finalAmount) > 0.01)
        ? "El resumen RESUMEN_FV no cuadra con el detalle importado."
        : threshold == null
        ? "No se pudo inferir con seguridad el umbral de horas de esta hoja."
        : null;

    await prisma.brokerInvoice.update({
      where: { id: invoice.id },
      data: {
        candidateCountEligible: eligibleCount,
        baseTotal,
        vatRate,
        vatAmount,
        finalAmount,
        summaryMismatchWarning,
        status: "READY",
      },
    });

    importedSheets.push(sheetName);
  }

  return {
    importedSheets,
    totalSheets: importedSheets.length,
  };
}

export async function promoteBrokerLeadToBroker(input: {
  organizationId: string;
  brokerLeadId: string;
}) {
  const lead = await prisma.brokerLead.findFirst({
    where: {
      id: input.brokerLeadId,
      organizationId: input.organizationId,
    },
  });

  if (!lead) {
    throw new Error("Lead de broker no encontrado.");
  }

  const displayName =
    titleCaseName([lead.firstName, lead.lastName].filter(Boolean).join(" ")) ??
    lead.email ??
    lead.phone ??
    "Broker sin nombre";

  const broker = await prisma.broker.upsert({
    where: {
      organizationId_displayName: {
        organizationId: input.organizationId,
        displayName,
      },
    },
    update: {
      primaryEmail: lead.email,
      primaryPhone: lead.phone,
      city: lead.city,
      country: lead.sourceCountrySheet,
      declaredSupplyText: lead.declaredSupplyText,
      legalOrBillingName: displayName,
      brokerType: lead.leadType === "PROVIDER" ? "PROVIDER" : "UNKNOWN",
      status: "ACTIVE",
    },
    create: {
      organizationId: input.organizationId,
      displayName,
      legalOrBillingName: displayName,
      primaryEmail: lead.email,
      primaryPhone: lead.phone,
      city: lead.city,
      country: lead.sourceCountrySheet,
      declaredSupplyText: lead.declaredSupplyText,
      brokerType: lead.leadType === "PROVIDER" ? "PROVIDER" : "UNKNOWN",
      status: "ACTIVE",
    },
  });

  await prisma.brokerLead.update({
    where: { id: lead.id },
    data: { brokerId: broker.id },
  });

  return broker;
}

export async function importBrokerSummaryFixturesForSeed(organizationId: string) {
  const simon = await prisma.broker.upsert({
    where: {
      organizationId_displayName: {
        organizationId,
        displayName: "Simon Szczypanik",
      },
    },
    update: { status: "ACTIVE", brokerType: "PROVIDER", country: "PL" },
    create: {
      organizationId,
      displayName: "Simon Szczypanik",
      legalOrBillingName: "SIMON SZCZYPANIK",
      status: "ACTIVE",
      brokerType: "PROVIDER",
      country: "PL",
    },
  });

  return { simon };
}
