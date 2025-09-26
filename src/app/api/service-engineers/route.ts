import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// POST - Create a service engineer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received body:", body);

    const requiredFields = ["id", "name"];
    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    await client.execute({
      sql: `INSERT INTO service_engineers (id, name) VALUES (?, ?)`,
      args: [body.id, body.name],
    });

    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (error) {
    console.error("POST /service-engineers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// GET - Fetch all service engineers or one by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceEngineerId = searchParams.get("id");
    
    if (serviceEngineerId) {
      const result = await client.execute({
        sql: `SELECT * FROM service_engineers WHERE id = ?`,
        args: [serviceEngineerId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Service engineer not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    const result = await client.execute({
      sql: `SELECT * FROM service_engineers`,
      args: [],
    });

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("GET /service-engineers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a service engineer by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceEngineerId = searchParams.get("id");

    if (!serviceEngineerId) {
      return NextResponse.json({ error: "Service engineer ID not provided" }, { status: 400 });
    }

    const checkResult = await client.execute({
      sql: `SELECT * FROM service_engineers WHERE id = ?`,
      args: [serviceEngineerId],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Service engineer not found" }, { status: 404 });
    }

    await client.execute({
      sql: `DELETE FROM service_engineers WHERE id = ?`,
      args: [serviceEngineerId],
    });

    return NextResponse.json({ message: "Service engineer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /service-engineers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
