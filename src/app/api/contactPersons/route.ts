import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// POST - Create a contact person
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requiredFields = [
      "firstName",
      "contactNo",
      "email",
      "designation",
      "company",
    ];

    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const id = crypto.randomUUID(); // Auto-generate ID

    await client.execute({
      sql: `
        INSERT INTO contact_persons (
          id, first_name, 
          contact_no, email, designation, company_id
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.firstName,
        body.contactNo,
        body.email,
        body.designation,
        body.company,
      ],
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// GET - Fetch all or single contact person
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const companyId = searchParams.get("companyId");

    if (id) {
      const result = await client.execute({
        sql: "SELECT * FROM contact_persons WHERE id = ?",
        args: [id],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    let query = "SELECT * FROM contact_persons";
    let args: string[] = [];

    if (companyId) {
      query += " WHERE company_id = ?";
      args.push(companyId);
    }

    const result = await client.execute({ sql: query, args });
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// PUT - Update contact person by id
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
    }

    const body = await request.json();

    const checkResult = await client.execute({
      sql: "SELECT * FROM contact_persons WHERE id = ?",
      args: [id],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const existing = checkResult.rows[0];

    await client.execute({
      sql: `
        UPDATE contact_persons SET
          first_name = ?, 
          contact_no = ?, email = ?, designation = ?, company_id = ?
        WHERE id = ?
      `,
      args: [
        body.firstName ?? existing.first_name,
        body.contactNo ?? existing.contact_no,
        body.email ?? existing.email,
        body.designation ?? existing.designation,
        body.company ?? existing.company_id,
        id,
      ],
    });

    return NextResponse.json({ message: "Contact updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete contact person by id
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
    }

    const check = await client.execute({
      sql: "SELECT * FROM contact_persons WHERE id = ?",
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await client.execute({
      sql: "DELETE FROM contact_persons WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ message: "Contact deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
