import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
// /pages/api/recruitment/addEmployeeFromCandidate.js
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateRandomPassword } from "@/utils/helpers";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};



  const { candidateId, joiningDate, role, email, name } = body;

  if (!candidateId || !joiningDate || !role || !email || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    //Generate a random password
    const password = generateRandomPassword();

    //Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        empid: candidateId,
        name,
        email,
        password: hashedPassword,
        role,
        date_of_joining: new Date(joiningDate),
      },
    });

    return NextResponse.json({ message: "Employee added successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error adding employee:", error);
    return NextResponse.json({ error: "Failed to add employee" }, { status: 500 });
  }
}


