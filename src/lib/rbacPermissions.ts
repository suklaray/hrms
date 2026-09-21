// src/lib/rbacPermissions.ts

export interface PermissionDefinition {
  category: string;
  key: string;
  name: string;
  description: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  // Dashboard
  {
    category: "Dashboard",
    key: "dashboard.view",
    name: "View Dashboard",
    description: "Access the main dashboard and its statistics",
  },
  // Employee Management
  {
    category: "Employee Management",
    key: "employee.view",
    name: "View Employees",
    description: "View employee list and individual employee profiles",
  },
  {
    category: "Employee Management",
    key: "employee.create",
    name: "Register Employee",
    description: "Register new employees into the system",
  },
  {
    category: "Employee Management",
    key: "employee.edit",
    name: "Edit Employee",
    description: "Edit employee details, role, position, and type",
  },
  {
    category: "Employee Management",
    key: "employee.delete",
    name: "Delete Employee",
    description: "Remove employees from the system",
  },
  {
    category: "Employee Management",
    key: "employee.verify",
    name: "Verify Employee",
    description: "Mark employees as verified after document review",
  },
  {
    category: "Employee Management",
    key: "employee.send_credentials",
    name: "Send Credentials",
    description: "Send login credentials to employees via email",
  },
  {
    category: "Employee Management",
    key: "employee.reset_password",
    name: "Reset Employee Password",
    description: "Reset an employee's password",
  },
  // Attendance
  {
    category: "Attendance",
    key: "attendance.view",
    name: "View Attendance",
    description: "View attendance records of employees",
  },
  {
    category: "Attendance",
    key: "attendance.edit",
    name: "Edit Attendance",
    description: "Manually edit or correct attendance records",
  },
  {
    category: "Attendance",
    key: "attendance.analytics",
    name: "Attendance Analytics",
    description: "View attendance analytics, charts, and reports",
  },
  {
    category: "Attendance",
    key: "attendance.my",
    name: "My Attendance",
    description: "View own attendance record",
  },
  {
    category: "Attendance",
    key: "attendance.regularize",
    name: "Submit Regularization",
    description: "Submit an attendance regularization request",
  },
  {
    category: "Attendance",
    key: "attendance.regularize_approve",
    name: "Approve/Reject Regularization",
    description: "Review and approve or reject attendance regularization requests",
  },
  // Leave
  {
    category: "Leave",
    key: "leave.view",
    name: "View Leave Requests",
    description: "View all employee leave requests",
  },
  {
    category: "Leave",
    key: "leave.approve",
    name: "Approve/Reject Leave",
    description: "Approve or reject employee leave requests",
  },
  {
    category: "Leave",
    key: "leave.cancel",
    name: "Cancel Leave",
    description: "Cancel an approved or pending leave request",
  },
  {
    category: "Leave",
    key: "leave.request",
    name: "Submit Leave Request",
    description: "Submit own leave request",
  },
  {
    category: "Leave",
    key: "leave.view_own",
    name: "View Own Leave",
    description: "View own leave requests and balances",
  },
  {
    category: "Leave",
    key: "leave.manage_types",
    name: "Manage Leave Types",
    description: "Create, edit, and delete leave types",
  },
  // Payroll
  {
    category: "Payroll",
    key: "payroll.view",
    name: "View Payroll",
    description: "View payroll records for all employees",
  },
  {
    category: "Payroll",
    key: "payroll.generate",
    name: "Generate Payroll",
    description: "Generate payroll and payslips for employees",
  },
  {
    category: "Payroll",
    key: "payroll.edit",
    name: "Edit Payroll",
    description: "Edit existing payroll entries",
  },
  {
    category: "Payroll",
    key: "payslip.view",
    name: "View Own Payslip",
    description: "View and download own payslips",
  },
  // Recruitment
  {
    category: "Recruitment",
    key: "recruitment.view",
    name: "View Candidates",
    description: "View the recruitment pipeline and candidate list",
  },
  {
    category: "Recruitment",
    key: "recruitment.create",
    name: "Add Candidate",
    description: "Add new candidates to the recruitment pipeline",
  },
  {
    category: "Recruitment",
    key: "recruitment.edit",
    name: "Edit Candidate",
    description: "Edit candidate details and interview schedule",
  },
  {
    category: "Recruitment",
    key: "recruitment.delete",
    name: "Delete Candidate",
    description: "Remove candidates from the system",
  },
  {
    category: "Recruitment",
    key: "recruitment.update_status",
    name: "Update Candidate Status",
    description: "Update HR status of candidates (Selected, Rejected, etc.)",
  },
  {
    category: "Recruitment",
    key: "recruitment.send_mail",
    name: "Send Interview/Form Mail",
    description: "Send interview invitation and form link emails to candidates",
  },
  {
    category: "Recruitment",
    key: "recruitment.convert_employee",
    name: "Convert to Employee",
    description: "Convert a selected candidate into an employee account",
  },
  // Compliance
  {
    category: "Compliance",
    key: "compliance.view",
    name: "View Compliance",
    description: "View employee compliance status and document checklist",
  },
  {
    category: "Compliance",
    key: "compliance.view_documents",
    name: "View Employee Documents",
    description: "View and download employee-submitted documents",
  },
  {
    category: "Compliance",
    key: "compliance.request_resubmission",
    name: "Request Document Resubmission",
    description: "Request an employee to resubmit a specific document",
  },
  // Task Management
  {
    category: "Task Management",
    key: "task.view",
    name: "View All Tasks",
    description: "View all tasks assigned across the organisation",
  },
  {
    category: "Task Management",
    key: "task.create",
    name: "Create Task",
    description: "Create and assign tasks to employees",
  },
  {
    category: "Task Management",
    key: "task.edit",
    name: "Edit Task",
    description: "Edit existing task details",
  },
  {
    category: "Task Management",
    key: "task.delete",
    name: "Delete Task",
    description: "Delete tasks from the system",
  },
  {
    category: "Task Management",
    key: "task.my",
    name: "My Tasks",
    description: "View and update status of own assigned tasks",
  },
  {
    category: "Task Management",
    key: "task.update_status",
    name: "Update Task Status",
    description: "Update the status of an assigned task",
  },
  // Daily Reports
  {
    category: "Daily Reports",
    key: "report.view",
    name: "View Daily Reports",
    description: "View daily work reports submitted by employees",
  },
  {
    category: "Daily Reports",
    key: "report.submit",
    name: "Submit Daily Report",
    description: "Submit own daily work report",
  },
  // Calendar
  {
    category: "Calendar",
    key: "calendar.view",
    name: "View Calendar",
    description: "View calendar events, holidays, and leave schedule",
  },
  {
    category: "Calendar",
    key: "calendar.manage",
    name: "Manage Calendar Events",
    description: "Add, edit, and delete calendar events and holidays",
  },
  // Customer Connect
  {
    category: "Customer Connect",
    key: "customer.view",
    name: "View Customer Connect",
    description: "View customer contact submissions",
  },
  {
    category: "Customer Connect",
    key: "customer.delete",
    name: "Delete Customer Contacts",
    description: "Delete customer contact entries",
  },
  // Notifications
  {
    category: "Notifications",
    key: "notification.view",
    name: "View Notifications",
    description: "Receive and view system notifications",
  },
  // Settings
  {
    category: "Settings",
    key: "settings.profile",
    name: "Manage Own Profile",
    description: "View and update own profile information and photo",
  },
  {
    category: "Settings",
    key: "settings.change_password",
    name: "Change Password",
    description: "Change own account password",
  },
  {
    category: "Settings",
    key: "settings.position_view",
    name: "View Positions",
    description: "View all job positions",
  },
  {
    category: "Settings",
    key: "settings.position_manage",
    name: "Manage Positions",
    description: "Create, edit, and delete job positions",
  },
  {
    category: "Settings",
    key: "settings.employee_types_manage",
    name: "Manage Employee Types",
    description: "Create, edit, and assign permissions to employee types (roles)",
  },
  {
    category: "Settings",
    key: "settings.bot",
    name: "Bot Settings",
    description: "Manage HR assistant bot knowledge base and settings",
  },
  // Documents
  {
    category: "Documents",
    key: "document.submit",
    name: "Submit Documents",
    description: "Submit own onboarding documents",
  },
  {
    category: "Documents",
    key: "document.view_own",
    name: "View Own Documents",
    description: "View own submitted documents",
  },
];

export const PERMISSION_KEYS: Record<string, string> = Object.fromEntries(
  PERMISSIONS.map((p) => [
    p.key.toUpperCase().replace(/\./g, "_"),
    p.key,
  ])
);
