import { NextResponse } from "next/server"
import { createClient } from "@libsql/client"

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("Received body:", body)

    
    const requiredFields = [
      "customerName",
      "siteLocation",
      "makeModel",
      "range",
      "serialNo",
      "calibrationGas",
      "gasCanisterDetails",
      "dateOfCalibration",
      "calibrationDueDate",
    ]
    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Convert date fields to ISO string format
    const dateOfCalibration = new Date(body.dateOfCalibration).toISOString()
    const calibrationDueDate = new Date(body.calibrationDueDate).toISOString()

    const result = await client.execute({
      sql: `INSERT INTO certificates (
        customer_name, site_location, make_model, range, serial_no, 
        calibration_gas, gas_canister_details, date_of_calibration, calibration_due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.customerName,
        body.siteLocation,
        body.makeModel,
        body.range,
        body.serialNo,
        body.calibrationGas,
        body.gasCanisterDetails,
        dateOfCalibration,
        calibrationDueDate,
      ],
    })

    console.log("Insert result:", result)

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (error) {
    console.error("Error in API route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

