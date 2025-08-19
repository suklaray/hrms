import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const leaveTypes = [
      { type_name: 'Sick_Leave', max_days: 12, paid: true },
      { type_name: 'Casual_Leave', max_days: 15, paid: true },
      { type_name: 'Earned_Leave', max_days: 21, paid: true },
      { type_name: 'Maternity_Leave', max_days: 180, paid: true },
      { type_name: 'Unpaid_Leave', max_days: 30, paid: false },
    ];

    for (const leaveType of leaveTypes) {
      await prisma.leave_types.upsert({
        where: { type_name: leaveType.type_name },
        update: {},
        create: leaveType,
      });
    }

    res.status(200).json({ message: 'Leave types seeded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
}