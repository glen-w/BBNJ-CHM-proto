import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master").get() as {
    count: number;
  };

  return NextResponse.json({
    ok: true,
    tables: row.count,
    databasePath: process.env.DATABASE_PATH ?? "data/chm.sqlite",
  });
}
