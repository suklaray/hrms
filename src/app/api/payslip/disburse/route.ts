import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generatePayslipPdf } from "@/lib/payslipPdfGenerator";

// ─── PUT (Disburse or Reject Payroll) ─────────────────────────────────
export async function PUT(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYSLIP_DISBURSED]);
    if ("error" in auth) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");
        const status = searchParams.get("status");

        if (!uid) {
            return NextResponse.json(
                { success: false, message: "Payroll UID is required" },
                { status: 400 }
            );
        }

        if (status !== "DISBURSED" && status !== "REJECTED") {
            return NextResponse.json(
                { success: false, message: "Status must be DISBURSED or REJECTED" },
                { status: 400 }
            );
        }

        // Handle REJECTED status
        if (status === "REJECTED") {
            const updatedPayroll = await prisma.payroll.update({
                where: { uid },
                data: {
                    status: "REJECTED",
                    generated_at: new Date(),
                },
            });

            return NextResponse.json(
                {
                    success: true,
                    message: `Payroll for ${updatedPayroll.empid} (${updatedPayroll.uid}) - REJECTED successfully`,
                    data: updatedPayroll,
                },
                { status: 200 }
            );
        }

        // Handle DISBURSED status
        // 1. Query full payroll record with company, components, employee profile and bank details
        const payrollRecord = await prisma.payroll.findUnique({
            where: { uid },
            include: {
                components: true,
                company: true,
                users: {
                    include: {
                        employeeProfile: {
                            include: {
                                bank_details: true,
                            },
                        },
                        rbacRole: true,
                    },
                },
            },
        });

        if (!payrollRecord) {
            return NextResponse.json(
                { success: false, message: `Payroll record not found for UID: ${uid}` },
                { status: 404 }
            );
        }

        // 2. Generate Payslip PDF matching official HRMS design and store at public/uploads/payslips/[empid]_[period_id].pdf
        const { relativeUrl, buffer } = await generatePayslipPdf({
            empid: payrollRecord.empid,
            period_id: payrollRecord.period_id,
            period_name: payrollRecord.period_name,
            gross_salary: payrollRecord.gross_salary?.toString() || 0,
            total_deduction: payrollRecord.total_deduction?.toString() || 0,
            net_salary: payrollRecord.net_salary?.toString(),
            total_payable_amount: payrollRecord.total_payable_amount?.toString(),
            salary_payment_date: payrollRecord.salary_payment_date,
            generated_at: new Date(),
            company: payrollRecord.company,
            users: payrollRecord.users,
            components: payrollRecord.components.map((c) => ({
                component_name: c.component_name,
                component_ammount: c.component_ammount?.toString() || 0,
                component_type: c.component_type,
            })),
        });

        // 3. Update database record with status DISBURSED and payslip_url
        const updatedPayroll = await prisma.payroll.update({
            where: { uid },
            data: {
                status: "DISBURSED",
                generated_at: new Date(),
                payslip_url: relativeUrl,
            },
            include: {
                components: true,
                company: true,
                users: true,
            },
        });

        // 4. Send email to employee with the generated Payslip PDF attached
        let emailSent = false;
        let emailError: string | null = null;

        const recipientEmail =
            payrollRecord.users?.email ||
            payrollRecord.users?.employeeProfile?.email;

        const recipientName =
            payrollRecord.users?.name ||
            payrollRecord.users?.employeeProfile?.name ||
            "Employee";

        const netPayFormatted = Number(
            payrollRecord.total_payable_amount ?? payrollRecord.net_salary ?? 0
        ).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (recipientEmail) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT) || 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                const safePeriodName = (payrollRecord.period_name || "Period").replace(/[^a-zA-Z0-9_-]/g, "_");

                const mailOptions = {
                    from: `"HR Team" <${process.env.EMAIL_USER}>`,
                    to: recipientEmail,
                    subject: `Salary Disbursed - Payslip for ${payrollRecord.period_name || "Disbursed Period"}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #374151; line-height: 1.5;">
                            <h2 style="color: #4F46E5; margin-bottom: 16px;">Salary Disbursed Successfully</h2>
                            <p>Dear <strong>${recipientName}</strong>,</p>
                            <p>Your salary for the period <strong>${payrollRecord.period_name || "the current period"}</strong> has been disbursed.</p>
                            <p>Please find attached your official salary payslip for your records.</p>
                            
                            <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                <p style="margin: 4px 0;"><strong>Employee ID:</strong> ${payrollRecord.empid}</p>
                                <p style="margin: 4px 0;"><strong>Payroll Period:</strong> ${payrollRecord.period_name}</p>
                                <p style="margin: 4px 0;"><strong>Net Pay:</strong> ₹${netPayFormatted}</p>
                            </div>
                            
                            <p>If you have any questions or notice any discrepancies, please reach out to the HR or Finance team.</p>
                            <br/>
                            <p>Best regards,<br/><strong>${payrollRecord.company?.name || "HR Team"}</strong></p>
                        </div>
                    `,
                    attachments: [
                        {
                            filename: `Payslip-${payrollRecord.empid}-${safePeriodName}.pdf`,
                            content: buffer,
                            contentType: "application/pdf",
                        },
                    ],
                };

                await transporter.sendMail(mailOptions);
                emailSent = true;
            } catch (mailErr: any) {
                console.warn("Payslip email sending failed (SMTP may be down or unconfigured):", mailErr);
                emailError = mailErr instanceof Error ? mailErr.message : String(mailErr);
            }
        } else {
            emailError = "No employee email address found on record";
        }

        return NextResponse.json(
            {
                success: true,
                message: `Payroll for ${updatedPayroll.empid} (${updatedPayroll.uid}) - DISBURSED successfully`,
                data: updatedPayroll,
                payslip_url: relativeUrl,
                emailSent,
                emailError: emailError || undefined,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error changing payroll status:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to change payroll status",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}