import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// POST API - Create a company
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received body:", body);

    // Required fields for the companies table
    const requiredFields = [
      "id",
      "companyName",
      "address",
      "industries",
      "industriesType",
      "gstNumber",
      "flag",
    ];

    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const result = await client.execute({
      sql: `INSERT INTO companies (
        id, company_name, address, industries, industries_type,
        gst_number, website, flag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.id,
        body.companyName,
        body.address,
        body.industries,
        body.industriesType,
        body.gstNumber,
        body.website ?? null, // website is optional
        body.flag,
      ],
    });

    console.log("Insert result:", result);

    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (error) {
    console.error("Error in company API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET API - Get company details by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("id");

    if (companyId) {
      // Fetch single company by ID
      const result = await client.execute({
        sql: `SELECT * FROM companies WHERE id = ?`,
        args: [companyId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    
    const result = await client.execute({
      sql: `SELECT * FROM companies`,
      args: [], 
    });
    



    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    );
  }
}
export async function PUT(request: Request) {
  try {
    
    const url = new URL(request.url);
    const id = url.searchParams.get("id"); 

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Parse the request body
    const body = await request.json();
    const { companyName, address, industries, industriesType, gstNumber, website, flag } = body;

    // Validate if company exists
    const companyCheckResult = await client.execute({
      sql: `SELECT * FROM companies WHERE id = ?`,
      args: [id],
    });

    if (companyCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Update the company
    const result = await client.execute({
      sql: `
        UPDATE companies
        SET company_name = ?, address = ?, industries = ?, industries_type = ?, gst_number = ?, website = ?, flag = ?
        WHERE id = ?
      `,
      args: [
        companyName ?? companyCheckResult.rows[0].company_name,
        address ?? companyCheckResult.rows[0].address,
        industries ?? companyCheckResult.rows[0].industries,
        industriesType ?? companyCheckResult.rows[0].industries_type,
        gstNumber ?? companyCheckResult.rows[0].gst_number,
        website ?? companyCheckResult.rows[0].website,
        flag ?? companyCheckResult.rows[0].flag,
        id,
      ],
    });

    return NextResponse.json({ message: "Company updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}



export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("id");

    if (!companyId) {
      return NextResponse.json({ error: "Company ID not provided" }, { status: 400 });
    }

    // Check if company exists
    const checkResult = await client.execute({
      sql: `SELECT * FROM companies WHERE id = ?`,
      args: [companyId],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Perform deletion
    await client.execute({
      sql: `DELETE FROM companies WHERE id = ?`,
      args: [companyId],
    });

    return NextResponse.json({ message: "Company deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error occurred" },
      { status: 500 }
    );
  }
}






