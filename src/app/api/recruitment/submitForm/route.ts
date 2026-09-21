import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const getValue = (field: string) => (formData.get(field) as string) || '';
    const token = getValue('token');

    if (!token) {
      return NextResponse.json({ error: "Missing form token" }, { status: 400 });
    }

    // Verify candidate using token
    const existingCandidate = await prisma.candidates.findUnique({
      where: { form_token: token },
    });

    if (!existingCandidate) {
      return NextResponse.json({ error: "Invalid or expired form link" }, { status: 403 });
    }

    if (existingCandidate.form_submitted) {
      return NextResponse.json({
        error: "Form has already been submitted for this candidate",
        alreadySubmitted: true,
        redirectTo: "/form-already-submitted",
      }, { status: 400 });
    }

    const candidateId = existingCandidate.candidate_id;

    const body = {
      name: getValue('name'),
      email: getValue('email'),
      contact_no: getValue('contact_no'),
      gender: getValue('gender'),
      dob: getValue('dob'),
      address_line_1: getValue('address_line_1'),
      address_line_2: getValue('address_line_2'),
      city: getValue('city'),
      state: getValue('state'),
      country: getValue('country'),
      pincode: getValue('pincode'),
      highest_qualification: getValue('highest_qualification'),
      aadhar_number: getValue('aadhar_number'),
      pan_number: getValue('pan_number'),
      account_holder_name: getValue('account_holder_name'),
      bank_name: getValue('bank_name'),
      branch_name: getValue('branch_name'),
      account_number: getValue('account_number'),
      ifsc_code: getValue('ifsc_code'),
    };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if email already exists in employees table
    const existingEmployee = await prisma.employees.findUnique({
      where: { email: body.email },
    });

    if (existingEmployee) {
      if (existingEmployee.candidate_id === candidateId) {
        return NextResponse.json({
          error: "Form has already been submitted for this candidate",
          alreadySubmitted: true,
          redirectTo: "/form-already-submitted",
        }, { status: 400 });
      }
      return NextResponse.json({ error: "Email already exists in the system" }, { status: 400 });
    }

    // Check if email already exists in candidate_details table
    const existingCandidateDetails = await prisma.candidate_details.findUnique({
      where: { email: body.email },
    });

    if (existingCandidateDetails) {
      return NextResponse.json({ 
        error: "Email already exists in candidate details" 
      }, { status: 400 });
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Process files
    const processFile = async (field: string) => {
      const file = formData.get(field) as File | null;
      if (!file || typeof file === "string" || !file.name) return null;
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const finalPath = path.join(uploadsDir, fileName);
        const bytes = await file.arrayBuffer();
        await fs.promises.writeFile(finalPath, Buffer.from(bytes));
        return `/uploads/${fileName}`;
      } catch (error) {
        console.error("File processing error:", error);
        return null;
      }
    };

    const aadharPath = await processFile('aadhar_card');
    const panPath = await processFile('pan_card');
    const educationPath = await processFile('education_certificates');
    const resumePath = await processFile('resume');
    const experiencePath = await processFile('experience_certificate');
    const profilePath = await processFile('profile_photo');
    const bankPath = await processFile('bank_details');

    const password = uuidv4().split("-")[0];

    // Save to candidate_details table
    const candidateDetails = await prisma.candidate_details.create({
      data: {
        candidate_id: candidateId,
        name: body.name,
        email: body.email,
        contact_no: body.contact_no,
        password,
        gender: body.gender,
        dob: body.dob ? new Date(body.dob) : null,
        highest_qualification: body.highest_qualification,
        aadhar_number: body.aadhar_number,
        pan_number: body.pan_number,
        aadhar_card: aadharPath,
        pan_card: panPath,
        education_certificates: educationPath,
        resume: resumePath,
        experience_certificate: experiencePath,
        profile_photo: profilePath,
      },
    });

    // Update candidate submission status and clear token
    await prisma.candidates.update({
      where: { candidate_id: candidateId },
      data: {
        form_submitted: true,
        form_token: null,
      },
    });

    // Create candidate bank details
    await prisma.candidates_bank_details.create({
      data: {
        candidate_id: candidateDetails.id,
        account_holder_name: body.account_holder_name,
        bank_name: body.bank_name,
        branch_name: body.branch_name,
        account_number: body.account_number,
        ifsc_code: body.ifsc_code,
        checkbook_document: bankPath,
      },
    });

    // Create candidate address
    await prisma.candidates_addresses.create({
      data: {
        candidate_id: candidateDetails.id,
        address_line1: body.address_line_1,
        address_line2: body.address_line_2,
        city: body.city,
        state: body.state,
        country: body.country,
        pincode: body.pincode,
      },
    });

    return NextResponse.json({
      message: "Form submitted successfully",
      password,
    }, { status: 200 });
  } catch (err: any) {
    console.error("Error in form submission:", err);

    if (err.code === "P2002") {
      if (err.meta?.target?.includes("email")) {
        return NextResponse.json({ error: "Email already exists in the system" }, { status: 400 });
      }
      return NextResponse.json({ error: "Duplicate entry found" }, { status: 400 });
    }

    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
