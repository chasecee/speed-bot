import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";

export async function GET() {
  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    return NextResponse.json({ domains });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
