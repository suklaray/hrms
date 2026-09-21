import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const { name, email, subject, message } = body;
  const errors: Record<string, string> = {};

  // Field validations
  if (!name || name.trim() === "") errors.name = "Name is required.";
  if (!email || email.trim() === "") errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Invalid email address.";

  if (!subject || subject.trim() === "") errors.subject = "Subject is required.";
  if (!message || message.trim() === "") errors.message = "Message is required.";

  if (Object.keys(errors).length > 0) {
    console.warn("Validation failed:", errors);
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  try {
    const result = await prisma.contact_submissions.create({
      data: { name, email, subject, message },
    });

    console.log("Contact saved:", result);

    return NextResponse.json({
      success: true,
      message: "Message submitted successfully.",
    }, { status: 200 });
  } catch (err) {
    console.error("Server error while saving contact:", err);
    return NextResponse.json({
      success: false,
      error: "Something went wrong on the server.",
    }, { status: 500 });
  }
}



