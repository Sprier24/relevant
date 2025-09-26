import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from 'uuid';

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received body:", body);

    const requiredFields = [
      "certificateNo", "customerName", "siteLocation", "makeModel",
      "range", "serialNo", "calibrationGas", "gasCanisterDetails",
      "dateOfCalibration", "calibrationDueDate", "observations", "engineerName", "status",
    ];

    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Generate a unique ID if not provided
    const id = body.id || uuidv4();

    // Insert the new certificate into the database
    const result = await client.execute({
      sql: `INSERT INTO certificates (
        id, certificate_no, customer_name, site_location, make_model,
        range, serial_no, calibration_gas, gas_canister_details, date_of_calibration, 
        calibration_due_date, observations, engineer_name, status, company_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.certificateNo,
        body.customerName,
        body.siteLocation,
        body.makeModel,
        body.range,
        body.serialNo,
        body.calibrationGas,
        body.gasCanisterDetails,
        body.dateOfCalibration,
        body.calibrationDueDate,
        JSON.stringify(body.observations || []),
        body.engineerName,
        body.status,
        body.companyId || null,
      ],
    });

    console.log("Insert result:", result);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error in creating certificate:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET API - Get all certificates or a specific certificate by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get("id");

    if (certificateId) {
      // Fetch a specific certificate by ID
      const result = await client.execute({
        sql: `SELECT * FROM certificates WHERE id = ?`,
        args: [certificateId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
      }

      // Parse observations if they're stored as JSON string
      const certificate = result.rows[0];
      if (certificate.observations && typeof certificate.observations === 'string') {
        certificate.observations = JSON.parse(certificate.observations);
      }

      return NextResponse.json(certificate, { status: 200 });
    }

    // Fetch all certificates
    const result = await client.execute({
      sql: `SELECT * FROM certificates`,
      args: [],
    });

    // Parse observations for all certificates
    const certificates = result.rows.map(cert => {
      if (cert.observations && typeof cert.observations === 'string') {
        cert.observations = JSON.parse(cert.observations);
      }
      return cert;
    });

    return NextResponse.json(certificates, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// PUT API - Update an existing certificate by ID
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    // Validate ID
    if (!id || !isValidUUID(id)) {
      return NextResponse.json(
        { error: "Valid certificate ID is required" }, 
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Check certificate existence
    const { rows } = await client.execute({
      sql: `SELECT 1 FROM certificates WHERE id = ? LIMIT 1`,
      args: [id],
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Certificate not found" }, 
        { status: 404 }
      );
    }

    // Prepare update fields dynamically
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    const validFields = [
      'certificateNo', 'customerName', 'siteLocation', 'makeModel',
      'range', 'serialNo', 'calibrationGas', 'gasCanisterDetails',
      'dateOfCalibration', 'calibrationDueDate', 'observations',
      'engineerName', 'status', 'companyId'
    ];

    // Build dynamic update query
    for (const field of validFields) {
      if (field in body) {
        let value = body[field];
        
        // Special handling for observations
        if (field === 'observations' && value) {
          value = JSON.stringify(value);
        }
        
        // Only update if value is different from undefined
        if (value !== undefined) {
          fieldsToUpdate.push(`${snakeCase(field)} = ?`);
          values.push(value);
        }
      }
    }

    // No valid fields to update
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    // Add ID for WHERE clause
    values.push(id);

    // Execute update
    const result = await client.execute({
      sql: `UPDATE certificates SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Verify update was successful
    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { error: "Certificate update failed - no changes made" },
        { status: 400 }
      );
    }

    // Return updated certificate
    const { rows: [updatedCert] } = await client.execute({
      sql: `SELECT * FROM certificates WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({
      message: "Certificate updated successfully",
      data: formatCertificate(updatedCert)
    }, { status: 200 });

  } catch (error) {
    console.error("PUT error:", error);
    
    // Handle specific SQL errors
    if (error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json(
        { error: "Database constraint violation - check your data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper functions
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function formatCertificate(cert: any) {
  if (cert.observations && typeof cert.observations === 'string') {
    cert.observations = JSON.parse(cert.observations);
  }
  return cert;
}

// DELETE API - Delete a certificate by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get("id");

    if (!certificateId) {
      return NextResponse.json({ error: "Certificate ID not provided" }, { status: 400 });
    }

    // Check if certificate exists
    const checkResult = await client.execute({
      sql: `SELECT * FROM certificates WHERE id = ?`,
      args: [certificateId],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // Perform deletion
    await client.execute({
      sql: `DELETE FROM certificates WHERE id = ?`,
      args: [certificateId],
    });

    return NextResponse.json({ message: "Certificate deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error occurred" },
      { status: 500 }
    );
  }
}