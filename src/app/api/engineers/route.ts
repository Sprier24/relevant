import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// POST - Create an engineer
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
      sql: `INSERT INTO engineers (id, name) VALUES (?, ?)`,
      args: [body.id, body.name],
    });

    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (error) {
    console.error("POST /engineers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// GET - Fetch all engineers or one by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const engineerId = searchParams.get("id");

    if (engineerId) {
      const result = await client.execute({
        sql: `SELECT * FROM engineers WHERE id = ?`,
        args: [engineerId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Engineer not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    const result = await client.execute({
      sql: `SELECT * FROM engineers`,
      args: [],
    });

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("GET /engineers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an engineer by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const engineerId = searchParams.get("id");

    if (!engineerId) {
      return NextResponse.json({ error: "Engineer ID not provided" }, { status: 400 });
    }

    const checkResult = await client.execute({
      sql: `SELECT * FROM engineers WHERE id = ?`,
      args: [engineerId],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Engineer not found" }, { status: 404 });
    }

    await client.execute({
      sql: `DELETE FROM engineers WHERE id = ?`,
      args: [engineerId],
    });

    return NextResponse.json({ message: "Engineer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /engineers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
