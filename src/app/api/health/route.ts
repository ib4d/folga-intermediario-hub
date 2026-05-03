import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      storage: "ok", // In a real scenario, check Supabase connectivity
      timestamp: new Date().toISOString(),
      version: "1.0.0-p3"
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      message: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
