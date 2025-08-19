import prisma from "@/lib/prisma";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({
    uploadDir: "./public/uploads",
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  // Ensure upload directory exists
  if (!fs.existsSync("./public/uploads")) {
    fs.mkdirSync("./public/uploads", { recursive: true });
  }

  try {
    const [fields, files] = await form.parse(req);

    const getFieldValue = (field) => Array.isArray(field) ? field[0] : field;
    const getFileValue = (file) => Array.isArray(file) ? file[0] : file;

    // Extract form data
    const empid = getFieldValue(fields.empid);
    const name = getFieldValue(fields.name);
    const email = getFieldValue(fields.email);
    const contact_no = getFieldValue(fields.contact_no);
    const dob = getFieldValue(fields.dob);
    const gender = getFieldValue(fields.gender);
    const address_line_1 = getFieldValue(fields.address_line_1);
    const address_line_2 = getFieldValue(fields.address_line_2);
    const city = getFieldValue(fields.city);
    const state = getFieldValue(fields.state);
    const pincode = getFieldValue(fields.pincode);
    const country = getFieldValue(fields.country);
    const highest_qualification = getFieldValue(fields.highest_qualification);
    const aadhar_number = getFieldValue(fields.aadhar_number);
    const pan_number = getFieldValue(fields.pan_number);
    const account_holder_name = getFieldValue(fields.account_holder_name);
    const bank_name = getFieldValue(fields.bank_name);
    const branch_name = getFieldValue(fields.branch_name);
    const account_number = getFieldValue(fields.account_number);
    const ifsc_code = getFieldValue(fields.ifsc_code);

    // Handle file uploads
    const fileFields = [
      'aadhar_card', 'pan_card', 'education_certificates', 'resume', 
      'experience_certificate', 'profile_photo', 'bank_details'
    ];

    const filePaths = {};
    for (const fieldName of fileFields) {
      const file = getFileValue(files[fieldName]);
      if (file) {
        const fileName = `${Date.now()}_${file.originalFilename}`;
        const newPath = path.join("./public/uploads", fileName);
        fs.renameSync(file.filepath, newPath);
        filePaths[fieldName] = `/uploads/${fileName}`;
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update or create employee record
      const employee = await tx.employees.upsert({
        where: { empid: empid },
        update: {
          contact_no,
          dob: new Date(dob),
          gender,
          highest_qualification,
          aadhar_number,
          pan_number,
          aadhar_card: filePaths.aadhar_card,
          pan_card: filePaths.pan_card,
          education_certificates: filePaths.education_certificates,
          resume: filePaths.resume,
          experience_certificate: filePaths.experience_certificate,
          profile_photo: filePaths.profile_photo,
        },
        create: {
          empid,
          contact_no,
          dob: new Date(dob),
          gender,
          highest_qualification,
          aadhar_number,
          pan_number,
          aadhar_card: filePaths.aadhar_card,
          pan_card: filePaths.pan_card,
          education_certificates: filePaths.education_certificates,
          resume: filePaths.resume,
          experience_certificate: filePaths.experience_certificate,
          profile_photo: filePaths.profile_photo,
        }
      });

      // Update or create address
      await tx.addresses.upsert({
        where: { empid: empid },
        update: {
          address_line1: address_line_1,
          address_line2: address_line_2,
          city,
          state,
          pincode,
          country,
        },
        create: {
          empid,
          address_line1: address_line_1,
          address_line2: address_line_2,
          city,
          state,
          pincode,
          country,
        }
      });

      // Update or create bank details
      await tx.bank_details.upsert({
        where: { empid: empid },
        update: {
          account_holder_name,
          bank_name,
          branch_name,
          account_number,
          ifsc_code,
          checkbook_document: filePaths.bank_details,
        },
        create: {
          empid,
          account_holder_name,
          bank_name,
          branch_name,
          account_number,
          ifsc_code,
          checkbook_document: filePaths.bank_details,
        }
      });

      return employee;
    });

    res.status(200).json({ 
      success: true, 
      message: "Employee documents submitted successfully",
      employee: result 
    });

  } catch (error) {
    console.error("Error submitting employee documents:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit documents" 
    });
  }
}