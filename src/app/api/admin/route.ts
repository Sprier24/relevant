import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";

// Create client for database interaction
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const JWT_SECRET = process.env.JWT_SECRET!; // Secret key for JWT


export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Fetch admin by email
    const result = await client.execute({
      sql: "SELECT * FROM admin WHERE email = ?",
      args: [email],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const admin = result.rows[0];

    // Compare the password directly (no hashing)
    if (admin.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate a JWT token for the admin
    const token = jwt.sign(
      { id: admin.id, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    return NextResponse.json({
      accessToken: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        contactNumber: admin.contact_number,
      },
    });
  } catch (error) {
    console.error("POST /admin/login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

