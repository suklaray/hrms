import db from "@/lib/db";

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
      deductions, // general deductions
      pf,
      ptax,
      esic,
      payslip_pdf,
    } = req.body;

    // Parse all inputs to numbers
    const bs  = Number(basic_salary) || 0;
    const h   = Number(hra)          || 0;
    const d_a = Number(da)           || 0;
    const all = Number(allowances)   || 0;
    const bon = Number(bonus)        || 0;
    const ded = Number(deductions)   || 0;
    const pf_ded = Number(pf)        || 0;
    const pt_ded = Number(ptax)      || 0;
    const es_ded = Number(esic)      || 0;

    const net_pay = bs + h + d_a + all + bon - (ded + pf_ded + pt_ded + es_ded);

    await db.query(
      `INSERT INTO payroll 
      (empid, month, year, basic_salary, hra, da, allowances, bonus, pf, ptax, esic, deductions, net_pay, generated_on, payslip_pdf)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [empid, month, year, bs, h, d_a, all, bon, pf_ded, pt_ded, es_ded, ded, net_pay, payslip_pdf || null]
    );

    return res.status(200).json({ message: "Payroll generated successfully" });
  } catch (err) {
    console.error("Error generating payroll:", err);
    return res.status(500).json({ error: "Failed to generate payroll" });
  }
}
