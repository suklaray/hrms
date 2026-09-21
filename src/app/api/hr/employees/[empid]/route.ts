import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getQueryParams } from "@/lib/routeHelper";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { empid } = await getQueryParams(req, context?.params);

  try {
    const user = await prisma.users.findUnique({
      where: { empid },
    });

    if (!user) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Check if user is inactive
    if (user.status === "Inactive") {
      return NextResponse.json({ message: "Access denied. Employee is inactive." }, { status: 403 });
    }

    console.log("User contact_number:", user.contact_number);

    // Get bank details and contact info from employees table
    let bankDetails = null;
    let employeeContact = null;
    
    if (user.candidate_id) {
      // Find employee record using candidate_id
      const employeeRecord = await prisma.employees.findFirst({
        where: { candidate_id: user.candidate_id },
        include: {
          bank_details: true
        }
      });
      
      if (employeeRecord) {
        console.log("Employee contact_no:", employeeRecord.contact_no);
        
        if (employeeRecord.bank_details.length > 0) {
          bankDetails = employeeRecord.bank_details[0];
        }
        // Get contact number from employees table
        employeeContact = employeeRecord.contact_no;
      }
    }

    const finalContact = user.contact_number || employeeContact || 'Not provided';
    console.log("Final contact:", finalContact);

    const employee = {
      ...user,
      contact_no: finalContact,
      bankDetails: bankDetails,
    };

    return NextResponse.json({ employee }, { status: 200 });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
