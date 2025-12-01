import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const {
    empid,
    month,
    year,
    basic_salary,
    hra,
    da,
    allowances,
    deductions,
    pf,
    ptax,
    esic
  } = req.body;

  if (!empid || !month || !year || !basic_salary) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const bs   = Math.round((parseFloat(basic_salary) || 0) * 100) / 100;
  const h    = Math.round((parseFloat(hra) || 0) * 100) / 100;
  const d_a  = Math.round((parseFloat(da) || 0) * 100) / 100;
  const all  = Math.round((parseFloat(allowances) || 0) * 100) / 100;
  const gen_ded = Math.round((parseFloat(deductions) || 0) * 100) / 100;
  const pf_ded  = Math.round((parseFloat(pf) || 0) * 100) / 100;
  const pt_ded  = Math.round((parseFloat(ptax) || 0) * 100) / 100;
  const es_ded  = Math.round((parseFloat(esic) || 0) * 100) / 100;

  const net_pay = Math.round((bs + h + d_a + all - (gen_ded + pf_ded + pt_ded + es_ded)) * 100) / 100;

  try {
    await prisma.payroll.create({
      data: {
        empid,
        month,
        year,
        basic_salary: bs,
        hra: h,
        da: d_a,
        allowances: all,
        pf: pf_ded,
        ptax: pt_ded,
        esic: es_ded,
        deductions: gen_ded,
        net_pay
      }
    });

    res.status(200).json({ message: 'Payroll added successfully' });
  } catch (error) {
    console.error('Error adding payroll:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
