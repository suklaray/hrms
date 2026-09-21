// src/lib/rbacPermissions.ts
import prisma from "@/lib/prisma";

export interface PermissionDefinition {
  id?: number;
  category: string;
  key: string;
  description: string | null;
}

/**
 * Loads all permissions dynamically from the database.
 */
export async function getAllPermissionsFromDb(): Promise<PermissionDefinition[]> {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
    return permissions.map((p) => ({
      id: p.id,
      category: p.category || "General",
      key: p.key,
      description: p.description,
    }));
  } catch (error) {
    console.error("Error loading permissions dynamically from database:", error);
    return [];
  }
}

/**
 * Strongly typed dictionary of permission keys used across the application.
 * Corresponds to keys stored in the permissions database table.
 */
export const PERMISSION_KEYS = {
  DASHBOARD_VIEW: "dashboard.view",
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_EDIT: "employee.edit",
  EMPLOYEE_DELETE: "employee.delete",
  EMPLOYEE_VERIFY: "employee.verify",
  EMPLOYEE_SEND_CREDENTIALS: "employee.send_credentials",
  EMPLOYEE_RESET_PASSWORD: "employee.reset_password",
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_EDIT: "attendance.edit",
  ATTENDANCE_ANALYTICS: "attendance.analytics",
  ATTENDANCE_MY: "attendance.my",
  ATTENDANCE_REGULARIZE: "attendance.regularize",
  ATTENDANCE_REGULARIZE_APPROVE: "attendance.regularize_approve",
  LEAVE_VIEW: "leave.view",
  LEAVE_APPROVE: "leave.approve",
  LEAVE_CANCEL: "leave.cancel",
  LEAVE_REQUEST: "leave.request",
  LEAVE_VIEW_OWN: "leave.view_own",
  LEAVE_MANAGE_TYPES: "leave.manage_types",
  PAYROLL_VIEW: "payroll.view",
  PAYROLL_GENERATE: "payroll.generate",
  PAYROLL_EDIT: "payroll.edit",
  PAYSLIP_VIEW: "payslip.view",
  RECRUITMENT_VIEW: "recruitment.view",
  RECRUITMENT_CREATE: "recruitment.create",
  RECRUITMENT_EDIT: "recruitment.edit",
  RECRUITMENT_DELETE: "recruitment.delete",
  RECRUITMENT_UPDATE_STATUS: "recruitment.update_status",
  RECRUITMENT_SEND_MAIL: "recruitment.send_mail",
  RECRUITMENT_CONVERT_EMPLOYEE: "recruitment.convert_employee",
  COMPLIANCE_VIEW: "compliance.view",
  COMPLIANCE_VIEW_DOCUMENTS: "compliance.view_documents",
  COMPLIANCE_REQUEST_RESUBMISSION: "compliance.request_resubmission",
  TASK_VIEW: "task.view",
  TASK_CREATE: "task.create",
  TASK_EDIT: "task.edit",
  TASK_DELETE: "task.delete",
  TASK_MY: "task.my",
  TASK_UPDATE_STATUS: "task.update_status",
  REPORT_VIEW: "report.view",
  REPORT_SUBMIT: "report.submit",
  CALENDAR_VIEW: "calendar.view",
  CALENDAR_MANAGE: "calendar.manage",
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_DELETE: "customer.delete",
  NOTIFICATION_VIEW: "notification.view",
  SETTINGS_PROFILE: "settings.profile",
  SETTINGS_CHANGE_PASSWORD: "settings.change_password",
  SETTINGS_POSITION_VIEW: "settings.position_view",
  SETTINGS_POSITION_MANAGE: "settings.position_manage",
  SETTINGS_EMPLOYEE_TYPES_MANAGE: "settings.employee_types_manage",
  SETTINGS_BOT: "settings.bot",
  BOT_SETTINGS: "settings.bot",
  POSITION_VIEW: "settings.position_view",
  POSITION_MANAGE: "settings.position_manage",
  DOCUMENT_SUBMIT: "document.submit",
  DOCUMENT_VIEW_OWN: "document.view_own",
} as const;
