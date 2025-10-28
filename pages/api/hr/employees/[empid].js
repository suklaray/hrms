// pages/api/hr/employee/[empid].js

import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const {
    query: { empid },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { empid },
    });

    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if user is inactive
    if (user.status === "Inactive") {
      return res.status(403).json({ message: "Access denied. Employee is inactive." });
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

    return res.status(200).json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
