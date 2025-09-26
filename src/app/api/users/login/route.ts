import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Create the Turso DB client
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// JWT secret fallback
const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

// Define the expected shape of a user row
type UserRow = {
  id: number;
  name: string;
  email: string;
  password: string | null;
  contact: string;
};

// POST /api/users/login
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Query the database for the user
    const result = await client.execute({
      sql: `SELECT * FROM users WHERE email = ?`,
      args: [email],
    });

    // If user not found
    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Extract row and type it manually
    const row = result.rows[0];
    const user: UserRow = {
      id: row.id as number,
      name: row.name as string,
      email: row.email as string,
      password: row.password as string | null,
      contact: row.contact as string,
    };

    // Validate stored password
    if (!user.password || typeof user.password !== "string") {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user info and token
    return NextResponse.json(
      {
        message: "Login successful",
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          contact: user.contact,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
