// /pages/api/hr/document-center-users.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const users = await prisma.users.findMany({
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        position: true,
        date_of_joining: true,
        status: true,
      },
    });

    const transformedUsers = users.map((user) => ({
      empid: user.empid,
      name: user.name,
      email: user.email,
      phone: user.contact_number,
      role: user.role,
      position: user.position || null,
      date_of_joining: user.date_of_joining || null,
      status: user.status || "Active",
    }));

    res.status(200).json({ users: transformedUsers });
  } catch (error) {
    console.error("Error fetching users for document center:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}