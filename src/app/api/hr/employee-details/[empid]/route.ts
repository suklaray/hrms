import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
// /pages/api/hr/employee-details/[empid].js
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  const { empid } = query;

  if (!empid) {
    return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
  }

  try {
    // Fetch from users table
    const user = await prisma.users.findUnique({
      where: { empid: empid },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        position: true,
        date_of_joining: true,
        status: true,
        experience: true,
        profile_photo: true,
        employee_type: true,
      },
    });

    // Fetch from employees table using email
    let employee = null;
    if (user?.email) {
      employee = await prisma.employees.findFirst({
        where: { email: user.email },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_no: true,
        gender: true,
        dob: true,
        highest_qualification: true,
        aadhar_number: true,
        pan_number: true,
        resume: true,
        aadhar_card: true,
        pan_card: true,
        education_certificates: true,
        experience_certificate: true,
        profile_photo: true,
        experience_years: true,
        experience_months: true,
      },
      });
    }

    if (!user && !employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Check if user is inactive
    if (user?.status === "Inactive") {
      return NextResponse.json({ message: "Access denied. Employee is inactive." }, { status: 403 });
    }

    // Combine data from both tables
    const combinedData = {
      // Basic info (prioritize users table)
      empid: user?.empid || employee?.empid?.toString(),
      name: user?.name || employee?.name,
      email: user?.email || employee?.email,
      contact_number: user?.contact_number || employee?.contact_no,
      role: user?.role,
      position: user?.position,
      date_of_joining: user?.date_of_joining,
      status: user?.status || "Active",
      employee_type: user?.employee_type,
      
      // Additional info from employees table
      gender: employee?.gender,
      dob: employee?.dob,
      highest_qualification: employee?.highest_qualification,
      aadhar_number: employee?.aadhar_number,
      pan_number: employee?.pan_number,
      experience_years: employee?.experience_years || user?.experience,
      experience_months: employee?.experience_months,
      
      // Profile photo (prioritize users table)
      profile_photo: user?.profile_photo || employee?.profile_photo,
      
      // Documents from employees table
      documents: {
        resume: employee?.resume,
        aadhar_card: employee?.aadhar_card,
        pan_card: employee?.pan_card,
        education_certificates: employee?.education_certificates,
        experience_certificate: employee?.experience_certificate,
      },
    };

    return NextResponse.json({ employee: combinedData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching employee details:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

