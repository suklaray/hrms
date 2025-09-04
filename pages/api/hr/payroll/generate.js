import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      empid,
      month,
      year,
      basic_salary,
      hra,
      da,
      allowances,
      bonus,
      deductions,
      pf,
      ptax,
      esic,
      payslip_pdf,
      allowance_details,
      deduction_details,
      hra_include,
      da_include,
      pf_include,
      ptax_include,
      esic_include
    } = req.body;

    const bs = Number(basic_salary) || 0;
    const h = Number(hra) || 0;
    const d_a = Number(da) || 0;
    const all = Number(allowances) || 0;
    const bon = Number(bonus) || 0;
    const ded = Number(deductions) || 0;
    const pf_ded = Number(pf) || 0;
    const pt_ded = Number(ptax) || 0;
    const es_ded = Number(esic) || 0;

    const calculated_net_pay = bs + h + d_a + all + bon - (ded + pf_ded + pt_ded + es_ded);

    const paymentDate = new Date();

    await prisma.payroll.create({
      data: {
        empid,
        month,
        year,
        basic_salary: bs,
        hra: h,
        da: d_a,
        allowances: all,
        bonus: bon,
        pf: pf_ded,
        ptax: pt_ded,
        esic: es_ded,
        deductions: ded,
        net_pay: calculated_net_pay,
        generated_on: paymentDate,
        payslip_pdf: payslip_pdf || null,
        allowance_details: JSON.stringify(allowance_details || []),
        deduction_details: JSON.stringify(deduction_details || [])
      },
    });

    // Update user status to 'Payroll Generated'
    try {
      await prisma.users.update({
        where: { empid },
        data: {
          status: 'Payroll Generated',
        },
      });
      console.log(`Updated status for employee ${empid} to 'Payroll Generated'`);
    } catch (updateError) {
      console.error('Error updating user status:', updateError);
    }

    return res.status(200).json({ 
      message: "Payroll generated successfully",
      empid,
      month,
      year,
      net_pay: calculated_net_pay
    });
  } catch (err) {
    console.error("Error generating payroll:", err);
    return res.status(500).json({ error: "Failed to generate payroll" });
  }
}
