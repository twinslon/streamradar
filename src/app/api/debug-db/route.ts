import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export async function GET() {
  const file = path.join(process.cwd(), "data", "streamradar.db");
  const result: Record<string, unknown> = { file, exists: fs.existsSync(file) };

  try {
    const db = new Database(file, { readonly: true, fileMustExist: true });
    result.tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    result.titleCount = (
      db.prepare("SELECT COUNT(*) AS c FROM titles").get() as { c: number }
    ).c;
    result.availabilityCount = (
      db.prepare("SELECT COUNT(*) AS c FROM availability").get() as { c: number }
    ).c;
    result.days = db.prepare("SELECT DISTINCT day FROM availability ORDER BY day DESC LIMIT 3").all();
    result.sample = db
      .prepare(
        "SELECT media_type, tmdb_id, region, day FROM availability WHERE media_type='movie' AND tmdb_id=791523",
      )
      .all();
    db.close();
    result.open = "ok";
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.stack = error instanceof Error ? error.stack?.split("\n").slice(0, 3) : undefined;
  }

  return NextResponse.json(result);
}
