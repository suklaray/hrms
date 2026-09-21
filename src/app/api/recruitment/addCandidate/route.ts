import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const getValue = (field: string) => (formData.get(field) as string) || '';

    const name = getValue("name");
    const email = getValue("email");
    const interviewDate = getValue("interviewDate");
    const interviewTimeFrom = getValue("interviewTimeFrom");
    const interviewTimeTo = getValue("interviewTimeTo");
    const contact_number = getValue("contact_number");

    if (
      !name ||
      !email ||
      !interviewDate ||
      !interviewTimeFrom ||
      !interviewTimeTo ||
      !contact_number
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate contact number (10 digits)
    if (!/^\d{10}$/.test(contact_number)) {
      return NextResponse.json({ error: "Contact number must be exactly 10 digits" }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await prisma.candidates.findFirst({
      where: { email: email },
    });

    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Generate candidate ID
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    const lastCandidate = await prisma.candidates.findFirst({
      orderBy: {
        candidate_id: "desc",
      },
    });

    let nextSerial = 1;
    if (lastCandidate) {
      const lastSerial = parseInt(lastCandidate.candidate_id.slice(-6));
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }

    const serialStr = String(nextSerial).padStart(6, "0");
    const candidateId = `${datePrefix}${serialStr}`;

    const existingId = await prisma.candidates.findFirst({
      where: { candidate_id: candidateId },
    });

    if (existingId) {
      return NextResponse.json({ error: "ID generation conflict. Please try again." }, { status: 500 });
    }

    // Process CV file
    let resumePath = null;
    const file = formData.get("cv") as File | null;

    if (file && typeof file !== "string" && file.name) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Only PDF, DOC, and DOCX files are allowed" }, { status: 400 });
      }

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${file.name}`;
      const finalPath = path.join(uploadsDir, fileName);
      const bytes = await file.arrayBuffer();
      await fs.promises.writeFile(finalPath, Buffer.from(bytes));
      resumePath = `/uploads/${fileName}`;
    }

    const formToken = crypto.randomBytes(32).toString("hex");
    const formLink = `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/Recruitment/form/${formToken}`;

    await prisma.candidates.create({
      data: {
        candidate_id: candidateId,
        name: name,
        email: email,
        contact_number: contact_number,
        interview_date: new Date(interviewDate),
        interview_time_from: interviewTimeFrom,
        interview_time_to: interviewTimeTo,
        resume: resumePath,
        form_link: formLink,
        form_token: formToken,
        form_submitted: false,
        status: "Waiting",
      },
    });

    return NextResponse.json({
      message: "Candidate added successfully",
      candidateId: candidateId,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Handler error:", error);
    return NextResponse.json({ error: "Server error: " + error?.message }, { status: 500 });
  }
}
