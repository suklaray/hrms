import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { action, uid, reason, rejection_note } = body;

        if (!uid) {
            return NextResponse.json({ success: false, message: "Payroll UID is required" }, { status: 400 });
        }

        const payroll = await prisma.payroll.findUnique({
            where: { uid: String(uid) },
            include: {
                users: {
                    select: { name: true, empid: true }
                }
            }
        });

        if (!payroll) {
            return NextResponse.json({ success: false, message: "Payroll record not found" }, { status: 404 });
        }

        if (payroll.status !== "GENERATED") {
            return NextResponse.json(
                {
                    success: false,
                    message: `Call back can only be requested for GENERATED payrolls. Current status is ${payroll.status}.`
                },
                { status: 400 }
            );
        }

        if (action === "REQUEST" || action === "RE_REQUEST") {
            // Must have PAYSLIP_GENERATE permission (Person 1 - Maker)
            const auth = await checkAuth(req, [PERMISSION_KEYS.PAYSLIP_GENERATE]);
            if ("error" in auth && auth.error) return auth.error;

            if (payroll.callback_status === "REQUESTED") {
                return NextResponse.json(
                    { success: false, message: "A call back request is already pending approval." },
                    { status: 400 }
                );
            }

            const updated = await prisma.payroll.update({
                where: { uid: String(uid) },
                data: {
                    callback_status: "REQUESTED",
                    callback_reason: reason ? String(reason).trim() : null,
                    callback_requested_by: auth.user?.empid || null,
                    callback_requested_at: new Date(),
                    callback_rejection_note: null, // Clear previous rejection note on fresh or re-request
                }
            });

            return NextResponse.json({
                success: true,
                message: `Call back requested successfully for ${payroll.users?.name || payroll.empid}. Pending initiator approval.`,
                data: updated,
            });
        }

        if (action === "APPROVE") {
            // Must have PAYSLIP_INITIATE permission (Person 2 - Checker)
            const auth = await checkAuth(req, [PERMISSION_KEYS.PAYSLIP_INITIATE]);
            if ("error" in auth && auth.error) return auth.error;

            if (payroll.callback_status !== "REQUESTED") {
                return NextResponse.json(
                    { success: false, message: "No pending call back request to approve." },
                    { status: 400 }
                );
            }

            const updated = await prisma.payroll.update({
                where: { uid: String(uid) },
                data: {
                    callback_status: "APPROVED",
                    callback_reviewed_by: auth.user?.empid || null,
                    callback_reviewed_at: new Date(),
                }
            });

            return NextResponse.json({
                success: true,
                message: `Call back approved for ${payroll.users?.name || payroll.empid}. The generator can now update and re-submit the payroll.`,
                data: updated,
            });
        }

        if (action === "REJECT") {
            // Must have PAYSLIP_INITIATE permission (Person 2 - Checker)
            const auth = await checkAuth(req, [PERMISSION_KEYS.PAYSLIP_INITIATE]);
            if ("error" in auth && auth.error) return auth.error;

            if (payroll.callback_status !== "REQUESTED") {
                return NextResponse.json(
                    { success: false, message: "No pending call back request to reject." },
                    { status: 400 }
                );
            }

            if (!rejection_note || !String(rejection_note).trim()) {
                return NextResponse.json(
                    { success: false, message: "A rejection reason/note is required when rejecting a call back request." },
                    { status: 400 }
                );
            }

            const updated = await prisma.payroll.update({
                where: { uid: String(uid) },
                data: {
                    callback_status: "REJECTED",
                    callback_rejection_note: String(rejection_note).trim(),
                    callback_reviewed_by: auth.user?.empid || null,
                    callback_reviewed_at: new Date(),
                }
            });

            return NextResponse.json({
                success: true,
                message: `Call back rejected for ${payroll.users?.name || payroll.empid}.`,
                data: updated,
            });
        }

        return NextResponse.json({ success: false, message: `Invalid action: ${action}` }, { status: 400 });
    } catch (error: unknown) {
        console.error("Error in callback endpoint:", error);
        const errMsg = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
    }
}
