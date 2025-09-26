import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

// POST - Register a new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, contact } = body;

    if (!name || !email || !password || !contact) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await client.execute({
      sql: `SELECT * FROM users WHERE email = ?`,
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await client.execute({
      sql: `INSERT INTO users (name, email, password, contact) VALUES (?, ?, ?, ?)`,
      args: [name, email, hashedPassword, contact],
    });

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    console.error("POST /users error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

// GET - Fetch all users or one by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (userId) {
      const result = await client.execute({
        sql: `SELECT id, name, email, contact FROM users WHERE id = ?`,
        args: [userId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    const result = await client.execute({
      sql: `SELECT id, name, email, contact FROM users`,
      args: [],
    });

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("GET /users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// DELETE - Remove a user by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const result = await client.execute({
      sql: `SELECT * FROM users WHERE id = ?`,
      args: [userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await client.execute({
      sql: `DELETE FROM users WHERE id = ?`,
      args: [userId],
    });

    return NextResponse.json({ message: "User deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /users error:", error);
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}

// PUT - Update a user by ID
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email,  contact } = body;

    if (!id || !name || !email || !contact) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user exists
    const userResult = await client.execute({
      sql: `SELECT * FROM users WHERE id = ?`,
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If email is being updated, check if it is already in use by another user
    if (email) {
      const existingEmail = await client.execute({
        sql: `SELECT * FROM users WHERE email = ? AND id != ?`,
        args: [email, id],
      });

      if (existingEmail.rows.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    // Prepare the SQL update
    let updateSQL = `UPDATE users SET name = ?, email = ?, contact = ?`;
    let updateArgs = [name, email, contact];

    

    await client.execute({
      sql: updateSQL + ` WHERE id = ?`,
      args: [...updateArgs, id],
    });

    return NextResponse.json({ message: "User updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT /users error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
