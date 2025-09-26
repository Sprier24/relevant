// app/api/contactPersons/route.ts
import { db } from '@/db';
import { contactPersons, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await db
      .select({
        id: contactPersons.id,
        firstName: contactPersons.firstName,
        contactNo: contactPersons.contactNo,
        companyName: companies.companyName,
      })
      .from(contactPersons)
      .leftJoin(companies, eq(contactPersons.companyId, companies.id));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching contact persons:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact persons" },
      { status: 500 }
    );
  }
}
