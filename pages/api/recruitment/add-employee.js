import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  const TEST_PASSWORD = "Test@123";

  function generateEmpid(name) {
    return `${name?.split(" ")[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
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
  } = req.body;

  try {
    const empid = generateEmpid(name); 
    const password = TEST_PASSWORD;
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
