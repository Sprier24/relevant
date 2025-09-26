import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// In your /api/certificate_report route (the first code you shared)
export async function POST(request: Request) {
  try {
    const { increment = true } = await request.json(); // Default to true if not provided
    
    // Generate certificate number logic
    const now = new Date();
    const yearStart = String(now.getFullYear()).slice(-2);
    const yearEnd = String(now.getFullYear() + 1).slice(-2);
    const yearRange = `${yearStart}-${yearEnd}`;

    const result = await client.execute({
      sql: `SELECT last_number FROM certificate_report WHERE id = ? LIMIT 1`,
      args: ["certificate"],
    });

    let newNumber: number;
    let certificateNumber: string;

    if (result.rows.length === 0) {
      newNumber = 1;
      certificateNumber = `RPS/CER/${yearRange}/${String(newNumber).padStart(4, "0")}`;

      await client.execute({
        sql: `INSERT INTO certificate_report (id, last_number, genrate_num) VALUES (?, ?, ?)`,
        args: ["certificate", newNumber, certificateNumber],
      });
    } else {
      const last = result.rows[0].last_number as number;
      newNumber = increment ? last + 1 : last; // Only increment if increment is true
      certificateNumber = `RPS/CER/${yearRange}/${String(newNumber).padStart(4, "0")}`;

      if (increment) { // Only update if we're incrementing
        await client.execute({
          sql: `UPDATE certificate_report SET last_number = ?, genrate_num = ? WHERE id = ?`,
          args: [newNumber, certificateNumber, "certificate"],
        });
      }
    }

    return NextResponse.json({ certificateNumber }, { status: 200 });
  } catch (err) {
    console.error("Error processing request:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
