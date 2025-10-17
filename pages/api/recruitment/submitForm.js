// import { formidable } from "formidable";
// import fs from "fs";
// import path from "path";
// import { v4 as uuidv4 } from "uuid";
// import prisma from "@/lib/prisma";

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   const form = formidable({
//     maxFileSize: 10 * 1024 * 1024, // 10MB per file
//     maxTotalFileSize: 50 * 1024 * 1024, // 50MB total
//     keepExtensions: true,
//   });

//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       console.error("Form parsing error:", err);
//       if (err.code === 1009) {
//         return res
//           .status(413)
//           .json({ error: "File size too large. Maximum total size is 50MB." });
//       }
//       return res.status(500).json({ error: "File upload failed" });
//     }

//     try {
//       // Extract field values
//       const getValue = (field) => (Array.isArray(field) ? field[0] : field);

//       const body = {
//         candidate_id: getValue(fields.candidate_id),
//         name: getValue(fields.name),
//         email: getValue(fields.email),
//         contact_no: getValue(fields.contact_no),
//         gender: getValue(fields.gender),
//         dob: getValue(fields.dob),
//         address_line_1: getValue(fields.address_line_1),
//         address_line_2: getValue(fields.address_line_2),
//         city: getValue(fields.city),
//         state: getValue(fields.state),
//         country: getValue(fields.country),
//         pincode: getValue(fields.pincode),
//         highest_qualification: getValue(fields.highest_qualification),
//         aadhar_number: getValue(fields.aadhar_number),
//         pan_number: getValue(fields.pan_number),
//         account_holder_name: getValue(fields.account_holder_name),
//         bank_name: getValue(fields.bank_name),
//         branch_name: getValue(fields.branch_name),
//         account_number: getValue(fields.account_number),
//         ifsc_code: getValue(fields.ifsc_code),
//       };

//       // Validate email format
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(body.email)) {
//         return res.status(400).json({ error: "Invalid email format" });
//       }

//       // Check if candidate has already submitted form
//       // const existingCandidate = await prisma.candidates.findUnique({
//       //   where: { candidate_id: body.candidate_id }
//       // });
//       // check using token instead of candidate_id for better security
//       const existingCandidate = await prisma.candidates.findUnique({
//         where: { form_token: body.token },
//       });

//       if (!existingCandidate) {
//         return res.status(403).json({ error: "Invalid or expired form link" });
//       }

//       if (existingCandidate?.form_submitted) {
//         return res.status(400).json({
//           error: "Form has already been submitted for this candidate",
//           alreadySubmitted: true,
//           redirectTo: "/form-already-submitted",
//         });
//       }

//       // Check if email already exists in employees table
//       const existingEmployee = await prisma.employees.findUnique({
//         where: { email: body.email },
//       });

//       if (existingEmployee) {
//         // If employee exists with same candidate_id, it means form was already submitted
//         if (existingEmployee.candidate_id === body.candidate_id) {
//           return res.status(400).json({
//             error: "Form has already been submitted for this candidate",
//             alreadySubmitted: true,
//             redirectTo: "/form-already-submitted",
//           });
//         }
//         // If employee exists with different candidate_id, email is taken
//         return res
//           .status(400)
//           .json({ error: "Email already exists in the system" });
//       }

//       // Create uploads directory if it doesn't exist
//       const uploadsDir = path.join(process.cwd(), "public", "uploads");
//       if (!fs.existsSync(uploadsDir)) {
//         fs.mkdirSync(uploadsDir, { recursive: true });
//       }

//       // Helper function to process file
//       const processFile = (file) => {
//         if (!file) return null;
//         try {
//           const fileName = `${Date.now()}-${file.originalFilename}`;
//           const finalPath = path.join(uploadsDir, fileName);
//           fs.copyFileSync(file.filepath, finalPath);
//           fs.unlinkSync(file.filepath);
//           return `/uploads/${fileName}`;
//         } catch (error) {
//           console.error("File processing error:", error);
//           return null;
//         }
//       };

//       // Process all files
//       const aadharPath = processFile(
//         files.aadhar_card?.[0] || files.aadhar_card
//       );
//       const panPath = processFile(files.pan_card?.[0] || files.pan_card);
//       const educationPath = processFile(
//         files.education_certificates?.[0] || files.education_certificates
//       );
//       const resumePath = processFile(files.resume?.[0] || files.resume);
//       const experiencePath = processFile(
//         files.experience_certificate?.[0] || files.experience_certificate
//       );
//       const profilePath = processFile(
//         files.profile_photo?.[0] || files.profile_photo
//       );
//       const bankPath = processFile(
//         files.bank_details?.[0] || files.bank_details
//       );

//       const password = uuidv4().split("-")[0];

//       // Create employee with file paths
//       const employee = await prisma.employees.create({
//         data: {
//           candidate_id: body.candidate_id,
//           name: body.name,
//           email: body.email,
//           contact_no: body.contact_no,
//           password,
//           gender: body.gender,
//           dob: body.dob ? new Date(body.dob) : null,
//           highest_qualification: body.highest_qualification,
//           aadhar_number: body.aadhar_number,
//           pan_number: body.pan_number,
//           aadhar_card: aadharPath,
//           pan_card: panPath,
//           education_certificates: educationPath,
//           resume: resumePath,
//           experience_certificate: experiencePath,
//           profile_photo: profilePath,
//         },
//       });

//       // Update candidate form submission status
//       await prisma.candidates.update({
//         where: {
//           candidate_id: body.candidate_id,
//         },
//         data: {
//           form_submitted: true,
//         },
//       });

//       // Create bank details with file path
//       await prisma.bank_details.create({
//         data: {
//           employee_id: employee.empid,
//           account_holder_name: body.account_holder_name,
//           bank_name: body.bank_name,
//           branch_name: body.branch_name,
//           account_number: body.account_number,
//           ifsc_code: body.ifsc_code,
//           checkbook_document: bankPath,
//         },
//       });

//       // Create address
//       await prisma.addresses.create({
//         data: {
//           employee_id: employee.empid,
//           address_line1: body.address_line_1,
//           address_line2: body.address_line_2,
//           city: body.city,
//           state: body.state,
//           country: body.country,
//           pincode: body.pincode,
//         },
//       });

//       return res.status(200).json({
//         message: "Form submitted successfully",
//         password,
//       });
//     } catch (err) {
//       console.error("Error in form submission:", err);

//       // Handle specific Prisma errors
//       if (err.code === "P2002") {
//         if (err.meta?.target?.includes("email")) {
//           return res
//             .status(400)
//             .json({ error: "Email already exists in the system" });
//         }
//         return res.status(400).json({ error: "Duplicate entry found" });
//       }

//       return res.status(500).json({ error: err.message || "Server error" });
//     }
//   });
// }
import { formidable } from "formidable";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    maxTotalFileSize: 50 * 1024 * 1024, // 50MB total
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      if (err.code === 1009) {
        return res
          .status(413)
          .json({ error: "File size too large. Maximum total size is 50MB." });
      }
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      // Helper to safely extract field values
      const getValue = (field) => (Array.isArray(field) ? field[0] : field);

      // Get token from form fields (🔐 added)
      const token = getValue(fields.token);

      if (!token) {
        return res.status(400).json({ error: "Missing form token" });
      }

      // 🔐 Verify candidate using token
      const existingCandidate = await prisma.candidates.findUnique({
        where: { form_token: token },
      });

      if (!existingCandidate) {
        return res.status(403).json({ error: "Invalid or expired form link" });
      }

      if (existingCandidate.form_submitted) {
        return res.status(400).json({
          error: "Form has already been submitted for this candidate",
          alreadySubmitted: true,
          redirectTo: "/form-already-submitted",
        });
      }

      // Use the candidate_id from verified candidate
      const candidateId = existingCandidate.candidate_id;

      // Extract all other field values
      const body = {
        name: getValue(fields.name),
        email: getValue(fields.email),
        contact_no: getValue(fields.contact_no),
        gender: getValue(fields.gender),
        dob: getValue(fields.dob),
        address_line_1: getValue(fields.address_line_1),
        address_line_2: getValue(fields.address_line_2),
        city: getValue(fields.city),
        state: getValue(fields.state),
        country: getValue(fields.country),
        pincode: getValue(fields.pincode),
        highest_qualification: getValue(fields.highest_qualification),
        aadhar_number: getValue(fields.aadhar_number),
        pan_number: getValue(fields.pan_number),
        account_holder_name: getValue(fields.account_holder_name),
        bank_name: getValue(fields.bank_name),
        branch_name: getValue(fields.branch_name),
        account_number: getValue(fields.account_number),
        ifsc_code: getValue(fields.ifsc_code),
      };

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // 🧭 Check if email already exists in employees
      const existingEmployee = await prisma.employees.findUnique({
        where: { email: body.email },
      });

      if (existingEmployee) {
        if (existingEmployee.candidate_id === candidateId) {
          return res.status(400).json({
            error: "Form has already been submitted for this candidate",
            alreadySubmitted: true,
            redirectTo: "/form-already-submitted",
          });
        }
        return res
          .status(400)
          .json({ error: "Email already exists in the system" });
      }

      // Create uploads directory if not exists
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Helper for file uploads
      const processFile = (file) => {
        if (!file) return null;
        try {
          const fileName = `${Date.now()}-${file.originalFilename}`;
          const finalPath = path.join(uploadsDir, fileName);
          fs.copyFileSync(file.filepath, finalPath);
          fs.unlinkSync(file.filepath);
          return `/uploads/${fileName}`;
        } catch (error) {
          console.error("File processing error:", error);
          return null;
        }
      };

      // Process uploaded files
      const aadharPath = processFile(
        files.aadhar_card?.[0] || files.aadhar_card
      );
      const panPath = processFile(files.pan_card?.[0] || files.pan_card);
      const educationPath = processFile(
        files.education_certificates?.[0] || files.education_certificates
      );
      const resumePath = processFile(files.resume?.[0] || files.resume);
      const experiencePath = processFile(
        files.experience_certificate?.[0] || files.experience_certificate
      );
      const profilePath = processFile(
        files.profile_photo?.[0] || files.profile_photo
      );
      const bankPath = processFile(
        files.bank_details?.[0] || files.bank_details
      );

      const password = uuidv4().split("-")[0];

      // Create employee record
      const employee = await prisma.employees.create({
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

      // Update candidate submission status and clear token (optional)
      await prisma.candidates.update({
        where: { candidate_id: candidateId },
        data: {
          form_submitted: true,
          form_token: null, // 🔐 disable token reuse
        },
      });

      // Create bank details
      await prisma.bank_details.create({
        data: {
          employee_id: employee.empid,
          account_holder_name: body.account_holder_name,
          bank_name: body.bank_name,
          branch_name: body.branch_name,
          account_number: body.account_number,
          ifsc_code: body.ifsc_code,
          checkbook_document: bankPath,
        },
      });

      // Create address record
      await prisma.addresses.create({
        data: {
          employee_id: employee.empid,
          address_line1: body.address_line_1,
          address_line2: body.address_line_2,
          city: body.city,
          state: body.state,
          country: body.country,
          pincode: body.pincode,
        },
      });

      return res.status(200).json({
        message: "Form submitted successfully",
        password,
      });
    } catch (err) {
      console.error("Error in form submission:", err);

      if (err.code === "P2002") {
        if (err.meta?.target?.includes("email")) {
          return res
            .status(400)
            .json({ error: "Email already exists in the system" });
        }
        return res.status(400).json({ error: "Duplicate entry found" });
      }

      return res.status(500).json({ error: err.message || "Server error" });
    }
  });
}
