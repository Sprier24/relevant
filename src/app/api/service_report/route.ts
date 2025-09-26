import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function POST(request: Request) {
  try {
    const { increment = true } = await request.json(); 

    const now = new Date();
    const yearStart = String(now.getFullYear()).slice(-2);
    const yearEnd = String(now.getFullYear() + 1).slice(-2);
    const yearRange = `${yearStart}-${yearEnd}`;

    const result = await client.execute({
      sql: `SELECT last_number FROM service_report WHERE id = ? LIMIT 1`,
      args: ["service"],
    });

    let newNumber: number;
    let serviceReportNo: string;

    if (result.rows.length === 0) {
      newNumber = 1;
      serviceReportNo = `RPS/SER/${yearRange}/${String(newNumber).padStart(4, "0")}`;

      await client.execute({
        sql: `INSERT INTO service_report (id, last_number, genrate_num) VALUES (?, ?, ?)`,
        args: ["service", newNumber, serviceReportNo],
      });
    } else {
      const last = result.rows[0].last_number as number;
      newNumber = increment ? last + 1 : last; // Only increment if `increment` is true
      serviceReportNo = `RPS/SER/${yearRange}/${String(newNumber).padStart(4, "0")}`;

      if (increment) {
        await client.execute({
          sql: `UPDATE service_report SET last_number = ?, genrate_num = ? WHERE id = ?`,
          args: [newNumber, serviceReportNo, "service"],
        });
      }
    }

    return NextResponse.json({ serviceReportNo }, { status: 200 });
  } catch (err) {
    console.error("Error generating service report number:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
