import prisma from "@/lib/prisma"; // 👉 make sure this file exports a PrismaClient instance

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const employees = await prisma.users.findMany({
            where: { role: "employee" }
        });

        res.status(200).json(employees);
    } catch (error) {
        console.error("Prisma DB Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
