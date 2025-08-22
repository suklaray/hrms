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
    intern_duration,
  } = req.body;

  try {
    // Check if employee already exists
    const existingEmployee = await prisma.users.findUnique({
      where: { email }
    });

    if (existingEmployee) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const empid = generateEmpid(name); 
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        empid,
        name,
        email,
        password: hashedPassword,
        position,
        date_of_joining: new Date(date_of_joining),
        status: "Active",
        experience: experience || null,
        profile_photo: profile_photo || null,
        role,
        verified: "verified",
        employee_type: employee_type || "Full_time",
      },
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
