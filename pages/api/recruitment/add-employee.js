import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  function generateEmpid(name) {
    return `${name?.split(" ")[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
    let password = '';
    
    // Ensure at least one uppercase, lowercase, number, and special char
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '@#$%&*'[Math.floor(Math.random() * 6)];
    
    // Fill remaining 4 characters randomly
    for (let i = 4; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  if (req.method === "GET") {
    // Check if employee already exists
    const { email } = req.query;
    try {
      const existingEmployee = await prisma.users.findUnique({
        where: { email },
        select: {
          empid: true,
          name: true,
          email: true,
          position: true,
          date_of_joining: true,
          experience: true,
          role: true,
          employee_type: true,
          status: true
        }
      });
      
      return res.status(200).json({ 
        exists: !!existingEmployee,
        employee: existingEmployee 
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "PUT") {
    // Update existing employee
    const {
      email,
      position,
      date_of_joining,
      experience,
      role,
      employee_type,
    } = req.body;

    try {
      await prisma.users.update({
        where: { email },
        data: {
          position,
          date_of_joining: new Date(date_of_joining),
          experience: experience || null,
          role,
          employee_type: employee_type || "Full_time",
        },
      });

      return res.status(200).json({
        message: "Employee updated successfully",
      });
    } catch (error) {
      console.error("Unable to update employee:", error);
      return res.status(500).json({ message: "Server Error" });
    }
  }

  if (req.method !== "POST") return res.status(405).end();

  const {
    name,
    email,
    position,
    date_of_joining,
    experience,
    profile_photo,
    role,
    employee_type,
    duration_months,
  } = req.body;

  try {
    // Check if employee already exists
    const existingEmployee = await prisma.users.findUnique({
      where: { email }
    });

    if (existingEmployee) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    // Get candidate_id and form_submitted from candidates table
    const candidate = await prisma.candidates.findFirst({
      where: { email },
      select: { candidate_id: true }
    });

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Get candidate data from candidate_details table
    const candidateDetails = await prisma.candidate_details.findFirst({
      where: { candidate_id: candidate.candidate_id },
      include: {
        addresses: true,
        bank_details: true,
      }
    });

    if (!candidateDetails) {
      return res.status(404).json({ message: "Candidate details not found" });
    }

    const empid = generateEmpid(name); 
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    /// Create user record
    const newUser = await prisma.users.create({
      data: {
        empid,
        name,
        email,
        contact_number: candidateDetails.contact_no, // ✓ Already added
        password: hashedPassword,
        position,
        date_of_joining: new Date(date_of_joining),
        status: "Active",
        experience: experience || null,
        profile_photo: candidateDetails.profile_photo || profile_photo || null,
        role,
        verified: "not_verified",
        form_submitted: candidate.form_submitted, 
        employee_type: employee_type || "Full_time",
        candidate_id: candidate.candidate_id,
        duration_months: (employee_type === "Intern" || employee_type === "Contractor") ? duration_months : null,
      },
    });

    // Create employee record from candidate_details
    const newEmployee = await prisma.employees.create({
      data: {
        candidate_id: candidate.candidate_id,        // ✓ Candidate ID
        main_employee_id: empid,                     // ✓ Same as users.empid
        name: candidateDetails.name,
        email: candidateDetails.email,
        contact_no: candidateDetails.contact_no,     // ✓ Contact number in employees table
        password: candidateDetails.password,
        gender: candidateDetails.gender,
        dob: candidateDetails.dob,
        highest_qualification: candidateDetails.highest_qualification,
        aadhar_number: candidateDetails.aadhar_number,
        pan_number: candidateDetails.pan_number,
        aadhar_card: candidateDetails.aadhar_card,
        pan_card: candidateDetails.pan_card,
        education_certificates: candidateDetails.education_certificates,
        resume: candidateDetails.resume,
        experience_certificate: candidateDetails.experience_certificate,
        profile_photo: candidateDetails.profile_photo,
      },
    });


    // Create employee address from candidate address
    if (candidateDetails.addresses[0]) {
      const addr = candidateDetails.addresses[0];
      await prisma.addresses.create({
        data: {
          employee_id: newEmployee.empid,
          address_line1: addr.address_line1,
          address_line2: addr.address_line2,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          pincode: addr.pincode,
        },
      });
    }

    // Create employee bank details from candidate bank details
    if (candidateDetails.bank_details[0]) {
      const bank = candidateDetails.bank_details[0];
      await prisma.bank_details.create({
        data: {
          employee_id: newEmployee.empid,
          account_holder_name: bank.account_holder_name,
          bank_name: bank.bank_name,
          branch_name: bank.branch_name,
          account_number: bank.account_number,
          ifsc_code: bank.ifsc_code,
          checkbook_document: bank.checkbook_document,
        },
      });
    }

    // Create compliance documents
    const documents = [
      { doc_type: 'aadhar_card', file_path: candidateDetails.aadhar_card },
      { doc_type: 'pan_card', file_path: candidateDetails.pan_card },
      { doc_type: 'education_certificates', file_path: candidateDetails.education_certificates },
      { doc_type: 'resume', file_path: candidateDetails.resume },
      { doc_type: 'experience_certificate', file_path: candidateDetails.experience_certificate },
      { doc_type: 'profile_photo', file_path: candidateDetails.profile_photo }
    ];

    for (const doc of documents) {
      if (doc.file_path) {
        await prisma.compliance_documents.create({
          data: {
            empid: newEmployee.empid,
            doc_type: doc.doc_type,
            file_path: doc.file_path,
            uploaded_at: new Date()
          }
        });
      }
    }

    // Update candidate status to Selected
    await prisma.candidates.update({
      where: { candidate_id: candidate.candidate_id },
      data: { status: "Selected" }
    });

    res.status(200).json({
      message: "Employee added successfully",
      empid,
      password, 
    });
  } catch (error) {
    console.error("Unable to add employee:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
