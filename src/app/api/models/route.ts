import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// POST - Create a model
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received body:", body);

    const requiredFields = ["id", "model_name", "range"];
    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    await client.execute({
      sql: `INSERT INTO models (id, model_name, range) VALUES (?, ?, ?)`,
      args: [body.id, body.model_name, body.range],
    });

    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (error) {
    console.error("POST /models error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// GET - Fetch all models or one by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("id");

    if (modelId) {
      const result = await client.execute({
        sql: `SELECT * FROM models WHERE id = ?`,
        args: [modelId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    const result = await client.execute({
      sql: `SELECT * FROM models`,
      args: [],
    });

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("GET /models error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a model by ID2
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("id");

    if (!modelId) {
      return NextResponse.json({ error: "Model ID not provided" }, { status: 400 });
    }

    const checkResult = await client.execute({
      sql: `SELECT * FROM models WHERE id = ?`,
      args: [modelId],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    await client.execute({
      sql: `DELETE FROM models WHERE id = ?`,
      args: [modelId],
    });

    return NextResponse.json({ message: "Model deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /models error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
