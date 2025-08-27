import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const userCount = await prisma.users.count();
    const testUser = await prisma.users.findFirst({
      where: { email: "superadmin_20250827a@example.com" }
    });
    
    res.status(200).json({ 
      status: 'DB Connected', 
      userCount,
      testUserExists: !!testUser,
      testUserRole: testUser?.role 
    });
  } catch (error) {
    console.error("DB Test Error:", error);
    res.status(500).json({ 
      status: 'DB Error', 
      error: error.message 
    });
  }
}