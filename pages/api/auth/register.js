import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

function generateCandidateId() {
  return `CAND${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export default async function handler(req, res) {
  
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }
  
  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!currentUser || !['hr', 'admin', 'superadmin'].includes(currentUser.role)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      name,
      email,
      contact_number,
      position,
      date_of_joining,
      status,
      experience,
      employee_type,
      role = "employee",
    } = req.body;

    // Role-based validation for role assignment
    const allowedRoles = [];
    if (currentUser.role === 'hr') {
      allowedRoles.push('employee');
    } else if (currentUser.role === 'admin') {
      allowedRoles.push('hr', 'employee');
    } else if (currentUser.role === 'superadmin') {
      allowedRoles.push('admin', 'hr', 'employee');
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `You are not authorized to create ${role} role. Allowed roles: ${allowedRoles.join(', ')}`
      });
    }

    if (!name || !email || !employee_type) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and employee type are required.",
      });
    }

    // const existingUser = await prisma.users.findUnique({ where: { email } });
    // if (existingUser) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Email already registered.",
    //   });
    // }
    // Generate candidate ID using same logic as addCandidate.js
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;
    const empid = `${name.substring(0, 2).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    const rawPassword = uuidv4().slice(0, 8); // Secure 8-char password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

     // Find the highest candidate ID across candidates and employees tables
    const [lastCandidate, lastEmployee] = await Promise.all([
      prisma.candidates.findFirst({
        orderBy: { candidate_id: "desc" },
      }),
      prisma.employees.findFirst({
        where: { candidate_id: { not: null } },
        orderBy: { candidate_id: "desc" },
      })
    ]);

    let nextSerial = 1;
    const candidateSerial = lastCandidate ? parseInt(lastCandidate.candidate_id.slice(-6)) : 0;
    const employeeSerial = lastEmployee?.candidate_id ? parseInt(lastEmployee.candidate_id.slice(-6)) : 0;
    const maxSerial = Math.max(candidateSerial, employeeSerial);
    if (maxSerial > 0) {
      nextSerial = maxSerial + 1;
    }

    const serialStr = String(nextSerial).padStart(6, "0");
    const candidateId = `${datePrefix}${serialStr}`;
    // Double-check for uniqueness
    const [existingCandidate, existingEmployee] = await Promise.all([
      prisma.candidates.findFirst({ where: { candidate_id: candidateId } }),
      prisma.employees.findFirst({ where: { candidate_id: candidateId } })
    ]);

    if (existingCandidate || existingEmployee) {
      return res.status(500).json({ error: "ID generation conflict. Please try again." });
    }

    // const empid = `${name.substring(0, 2).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    // const rawPassword = uuidv4().slice(0, 8);
    // const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.users.create({
      data: {
        empid,
        name,
        email,
        contact_number: contact_number || null,
        password: hashedPassword,
        position: position || null,
        date_of_joining: date_of_joining ? new Date(date_of_joining) : null,
        status: status || "Active",
        experience: experience ? parseInt(experience) : null,
        role,
        employee_type,
        candidate_id: candidateId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Employee registered successfully with ID ${empid}`,
      empid,
      password: rawPassword, // Only sent once
    });

  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
}
