import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from 'uuid';

// Initialize the client with your database connection
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// POST - Create a new service entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received payload:", body);

    // Required fields (updated to match frontend)
    const requiredFields = [
      "customerName", "customerLocation", "contactPerson", "contactNumber",
      "serviceEngineer", "date", "place", "natureOfJob",
      "makeModelNumberoftheInstrumentQuantity", "serialNumberoftheInstrumentCalibratedOK",
      "serialNumberoftheFaultyNonWorkingInstruments", "engineerReport", "engineerName"
    ];

    // Validation
    for (const field of requiredFields) {
      const value = body[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return NextResponse.json(
          { error: `Missing or empty required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Insert with null checks for optional fields
    await client.execute({
      sql: `INSERT INTO services (
        id,  customer_name, customer_location, contact_person, contact_number,
        service_engineer, date, place, place_options, nature_of_job, report_no,
        make_model_number_of_the_instrument_quantity, serial_number_of_the_instrument_calibrated_ok,
        serial_number_of_the_faulty_non_working_instruments, engineer_report, customer_report,
        engineer_remarks, engineer_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

      args: [
        body.id || uuidv4(), // Generate UUID if not provided
        body.customerName,
        body.customerLocation,
        body.contactPerson,
        body.contactNumber,
        body.serviceEngineer,
        body.date,
        body.place,
        JSON.stringify(body.placeOptions || []), // Ensure `placeOptions` is stringified as JSON
        body.natureOfJob,
        body.reportNo || null,
        body.makeModelNumberoftheInstrumentQuantity,
        body.serialNumberoftheInstrumentCalibratedOK,
        body.serialNumberoftheFaultyNonWorkingInstruments,
        body.engineerReport,
        body.customerReport || null,
        JSON.stringify(body.engineerRemarks || []), // Ensure `engineerRemarks` is stringified as JSON
        body.engineerName,
        body.status || "checked" // Default to "checked" if no status is provided
      ],
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

// GET - Get service(s)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("id");

    if (serviceId) {
      const serviceIdString = String(serviceId); // Ensure it's a string

      // Query the database for a specific service
      const result = await client.execute({
        sql: `SELECT * FROM services WHERE id = ?`,
        args: [serviceIdString], // Now passing a string
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }

      // Ensure `engineerRemarks` is parsed as JSON if it's present
      const serviceData = result.rows[0];
      if (serviceData.engineer_remarks) {
        if (typeof serviceData.engineer_remarks === 'string') {
            serviceData.engineer_remarks = JSON.parse(serviceData.engineer_remarks);
        }
      }

      return NextResponse.json(serviceData, { status: 200 });
    }

    // Fetch all services if no service ID is provided
    const all = await client.execute({ sql: `SELECT * FROM services`, args: [] });

    return NextResponse.json(all.rows, { status: 200 });
  } catch (error) {
    console.error("GET /services error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// PUT - Update a service
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const body = await request.json();

    // Check if the service exists
    const existing = await client.execute({
      sql: `SELECT * FROM services WHERE id = ?`,
      args: [id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const current = existing.rows[0];

    // Update service with new or current values
    await client.execute({
      sql: `UPDATE services SET
       customer_name = ?, customer_location = ?, contact_person = ?, contact_number = ?,
        service_engineer = ?, date = ?, place = ?, place_options = ?, nature_of_job = ?, report_no = ?,
        make_model_number_of_the_instrument_quantity = ?, serial_number_of_the_instrument_calibrated_ok = ?,
        serial_number_of_the_faulty_non_working_instruments = ?, engineer_report = ?, customer_report = ?,
        engineer_remarks = ?, engineer_name = ?, status = ?
        WHERE id = ?`,
      args: [
        body.customerName ?? current.customer_name,
        body.customerLocation ?? current.customer_location,
        body.contactPerson ?? current.contact_person,
        body.contactNumber ?? current.contact_number,
        body.serviceEngineer ?? current.service_engineer,
        body.date ?? current.date,
        body.place ?? current.place,
        body.placeOptions ?? current.place_options,
        body.natureOfJob ?? current.nature_of_job,
        body.reportNo ?? current.report_no,
        body.makeModelNumberoftheInstrumentQuantity ?? current.make_model_number_of_the_instrument_quantity,
        body.serialNumberoftheInstrumentCalibratedOK ?? current.serial_number_of_the_instrument_calibrated_ok,
        body.serialNumberoftheFaultyNonWorkingInstruments ?? current.serial_number_of_the_faulty_non_working_instruments,
        body.engineerReport ?? current.engineer_report,
        body.customerReport ?? current.customer_report,
        body.engineerRemarks ? JSON.stringify(body.engineerRemarks) : current.engineer_remarks,
        body.engineerName ?? current.engineer_name,
        body.status ?? current.status,
        id
      ],
    });

    return NextResponse.json({ message: "Service updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT /services error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a service
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Service ID not provided" }, { status: 400 });
    }

    // Check if the service exists
    const check = await client.execute({
      sql: `SELECT * FROM services WHERE id = ?`,
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Delete the service
    await client.execute({
      sql: `DELETE FROM services WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ message: "Service deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /services error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
