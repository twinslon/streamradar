import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "streamradar.db");
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(process.cwd());
  } catch {
    entries = ["<readdir failed>"];
  }
  return NextResponse.json({
    cwd: process.cwd(),
    dataDirExists: fs.existsSync(dir),
    dbExists: fs.existsSync(file),
    rootEntries: entries.slice(0, 40),
    hasDataEntry: entries.includes("data"),
  });
}
