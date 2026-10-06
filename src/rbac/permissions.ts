/**
 * Central Canonical Permission Registry
 *
 * Source of truth for all application capabilities.
 * Developers define permissions here. The database stores role assignments.
 */

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  module: string;
  action: string;
  isSystem?: boolean;
  isActive?: boolean;
}

/**
 * Grouped Canonical Permission Constants
 * Use PERMISSIONS.<MODULE>.<ACTION> across the application.
 */
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: "dashboard.view",
  },

  EMPLOYEE: {
    VIEW: "employee.view",
    CREATE: "employee.create",
    EDIT: "employee.edit",
    DELETE: "employee.delete",
    VERIFY: "employee.verify",
    SEND_CREDENTIALS: "employee.send_credentials",
    RESET_PASSWORD: "employee.reset_password",
  },

  ATTENDANCE: {
    VIEW: "attendance.view",
    EDIT: "attendance.edit",
    ANALYTICS: "attendance.analytics",
    MY: "attendance.my",
    REGULARIZE: "attendance.regularize",
    REGULARIZE_APPROVE: "attendance.regularize_approve",
  },

  LEAVE: {
    VIEW: "leave.view",
    APPROVE: "leave.approve",
    CANCEL: "leave.cancel",
    REQUEST: "leave.request",
    VIEW_OWN: "leave.view_own",
    MANAGE_TYPES: "leave.manage_types",
  },

  PAYROLL: {
    VIEW: "payroll.view",
    GENERATE: "payroll.generate",
    EDIT: "payroll.edit",
  },

  PAYSLIP: {
    VIEW: "payslip.view",
  },

  RECRUITMENT: {
    VIEW: "recruitment.view",
    CREATE: "recruitment.create",
    EDIT: "recruitment.edit",
    DELETE: "recruitment.delete",
    UPDATE_STATUS: "recruitment.update_status",
    SEND_MAIL: "recruitment.send_mail",
    CONVERT_EMPLOYEE: "recruitment.convert_employee",
    APPLICATIONS_VIEW: "recruitment.applications_view",
    ANALYTICS: "recruitment.analytics",
  },

  JD: {
    VIEW: "jd.view",
    CREATE: "jd.create",
    EDIT: "jd.edit",
    CLOSE: "jd.close",
    ANALYZE: "jd.analyze",
  },

  JOB_APPLICATION: {
    VIEW: "job_application.view",
    PARSE: "job_application.parse",
    SHORTLIST: "job_application.shortlist",
    REJECT: "job_application.reject",
    SCHEDULE: "job_application.schedule",
  },

  RESUME: {
    PARSE: "resume.parse",
    DOWNLOAD: "resume.download",
  },

  CANDIDATE: {
    RANK_VIEW: "candidate.rank_view",
    COMPATIBILITY_VIEW: "candidate.compatibility_view",
  },

  COMPLIANCE: {
    VIEW: "compliance.view",
    VIEW_DOCUMENTS: "compliance.view_documents",
    REQUEST_RESUBMISSION: "compliance.request_resubmission",
  },

  TASK: {
    VIEW: "task.view",
    CREATE: "task.create",
    EDIT: "task.edit",
    DELETE: "task.delete",
    MY: "task.my",
    UPDATE_STATUS: "task.update_status",
  },

  REPORT: {
    VIEW: "report.view",
    SUBMIT: "report.submit",
  },

  CALENDAR: {
    VIEW: "calendar.view",
    MANAGE: "calendar.manage",
  },

  CUSTOMER: {
    VIEW: "customer.view",
    DELETE: "customer.delete",
  },

  NOTIFICATION: {
    VIEW: "notification.view",
  },

  DOCUMENT: {
    SUBMIT: "document.submit",
    VIEW_OWN: "document.view_own",
  },

  SETTINGS: {
    PROFILE: "settings.profile",
    CHANGE_PASSWORD: "settings.change_password",
    POSITION_VIEW: "settings.position_view",
    POSITION_MANAGE: "settings.position_manage",
    EMPLOYEE_TYPES_MANAGE: "settings.employee_types_manage",
    BOT: "settings.bot",
    MANAGE: "settings.manage",
  },

  RBAC: {
    PERMISSION_VIEW: "rbac.permission_view",
    ROLE_MANAGE: "rbac.role_manage",
    ROLE_ASSIGN: "rbac.role_assign",
  },
} as const;

export type PermissionKey =
  | (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]]
  | string;

/**
 * Detailed Metadata for Each Permission Definition
 */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Dashboard
  {
    key: PERMISSIONS.DASHBOARD.VIEW,
    name: "View Dashboard",
    description: "Access the main dashboard and organizational overview statistics",
    module: "dashboard",
    action: "view",
  },

  // Employee Management
  {
    key: PERMISSIONS.EMPLOYEE.VIEW,
    name: "View Employees",
    description: "View employee list and individual employee profiles",
    module: "employee",
    action: "view",
  },
  {
    key: PERMISSIONS.EMPLOYEE.CREATE,
    name: "Create Employee",
    description: "Register new employees into the system",
    module: "employee",
    action: "create",
  },
  {
    key: PERMISSIONS.EMPLOYEE.EDIT,
    name: "Edit Employee",
    description: "Edit employee details, role, position, and type",
    module: "employee",
    action: "edit",
  },
  {
    key: PERMISSIONS.EMPLOYEE.DELETE,
    name: "Delete Employee",
    description: "Remove employees from the system",
    module: "employee",
    action: "delete",
  },
  {
    key: PERMISSIONS.EMPLOYEE.VERIFY,
    name: "Verify Employee",
    description: "Mark employees as verified after document review",
    module: "employee",
    action: "verify",
  },
  {
    key: PERMISSIONS.EMPLOYEE.SEND_CREDENTIALS,
    name: "Send Employee Credentials",
    description: "Send login credentials to employees via email",
    module: "employee",
    action: "send_credentials",
  },
  {
    key: PERMISSIONS.EMPLOYEE.RESET_PASSWORD,
    name: "Reset Employee Password",
    description: "Reset an employee account password",
    module: "employee",
    action: "reset_password",
  },

  // Attendance
  {
    key: PERMISSIONS.ATTENDANCE.VIEW,
    name: "View Attendance",
    description: "View attendance records of all employees",
    module: "attendance",
    action: "view",
  },
  {
    key: PERMISSIONS.ATTENDANCE.EDIT,
    name: "Edit Attendance",
    description: "Manually edit or correct attendance records",
    module: "attendance",
    action: "edit",
  },
  {
    key: PERMISSIONS.ATTENDANCE.ANALYTICS,
    name: "Attendance Analytics",
    description: "View attendance analytics, trends, charts, and reports",
    module: "attendance",
    action: "analytics",
  },
  {
    key: PERMISSIONS.ATTENDANCE.MY,
    name: "View My Attendance",
    description: "View own attendance logs and status",
    module: "attendance",
    action: "my",
  },
  {
    key: PERMISSIONS.ATTENDANCE.REGULARIZE,
    name: "Regularize Attendance",
    description: "Submit attendance regularization requests for missed check-ins",
    module: "attendance",
    action: "regularize",
  },
  {
    key: PERMISSIONS.ATTENDANCE.REGULARIZE_APPROVE,
    name: "Approve Attendance Regularization",
    description: "Review, approve, or reject attendance regularization requests",
    module: "attendance",
    action: "regularize_approve",
  },

  // Leave
  {
    key: PERMISSIONS.LEAVE.VIEW,
    name: "View Leave Requests",
    description: "View all employee leave requests across the organisation",
    module: "leave",
    action: "view",
  },
  {
    key: PERMISSIONS.LEAVE.APPROVE,
    name: "Approve Leave",
    description: "Approve or reject employee leave requests",
    module: "leave",
    action: "approve",
  },
  {
    key: PERMISSIONS.LEAVE.CANCEL,
    name: "Cancel Leave",
    description: "Cancel approved or pending leave requests",
    module: "leave",
    action: "cancel",
  },
  {
    key: PERMISSIONS.LEAVE.REQUEST,
    name: "Request Leave",
    description: "Submit own leave request",
    module: "leave",
    action: "request",
  },
  {
    key: PERMISSIONS.LEAVE.VIEW_OWN,
    name: "View Own Leave",
    description: "View own leave requests and leave balances",
    module: "leave",
    action: "view_own",
  },
  {
    key: PERMISSIONS.LEAVE.MANAGE_TYPES,
    name: "Manage Leave Types",
    description: "Create, edit, and configure available leave types and quotas",
    module: "leave",
    action: "manage_types",
  },

  // Payroll
  {
    key: PERMISSIONS.PAYROLL.VIEW,
    name: "View Payroll",
    description: "View payroll records, configurations, and summaries for employees",
    module: "payroll",
    action: "view",
  },
  {
    key: PERMISSIONS.PAYROLL.GENERATE,
    name: "Generate Payroll",
    description: "Generate monthly payroll, execute calculations, and prepare payslips",
    module: "payroll",
    action: "generate",
  },
  {
    key: PERMISSIONS.PAYROLL.EDIT,
    name: "Edit Payroll",
    description: "Edit existing payroll entries and adjustments",
    module: "payroll",
    action: "edit",
  },
  {
    key: PERMISSIONS.PAYSLIP.VIEW,
    name: "View Payslips",
    description: "View and download own payslips and compensation summaries",
    module: "payroll",
    action: "payslip_view",
  },

  // Recruitment
  {
    key: PERMISSIONS.RECRUITMENT.VIEW,
    name: "View Recruitment",
    description: "View the recruitment pipeline, candidate applications, and job listings",
    module: "recruitment",
    action: "view",
  },
  {
    key: PERMISSIONS.RECRUITMENT.CREATE,
    name: "Create Candidate",
    description: "Add new candidates into the recruitment pipeline",
    module: "recruitment",
    action: "create",
  },
  {
    key: PERMISSIONS.RECRUITMENT.EDIT,
    name: "Edit Candidate",
    description: "Edit candidate details, interview stages, and notes",
    module: "recruitment",
    action: "edit",
  },
  {
    key: PERMISSIONS.RECRUITMENT.DELETE,
    name: "Delete Candidate",
    description: "Remove candidates from the recruitment database",
    module: "recruitment",
    action: "delete",
  },
  {
    key: PERMISSIONS.RECRUITMENT.UPDATE_STATUS,
    name: "Update Candidate Status",
    description: "Update recruitment status of candidates (e.g. Selected, Rejected)",
    module: "recruitment",
    action: "update_status",
  },
  {
    key: PERMISSIONS.RECRUITMENT.SEND_MAIL,
    name: "Send Recruitment Mail",
    description: "Send interview invitation, form links, and update emails to candidates",
    module: "recruitment",
    action: "send_mail",
  },
  {
    key: PERMISSIONS.RECRUITMENT.CONVERT_EMPLOYEE,
    name: "Convert Candidate to Employee",
    description: "Convert a selected candidate into an active employee record",
    module: "recruitment",
    action: "convert_employee",
  },
  {
    key: PERMISSIONS.RECRUITMENT.APPLICATIONS_VIEW,
    name: "View Job Applications",
    description: "View submitted job applications and incoming resumes",
    module: "recruitment",
    action: "applications_view",
  },
  {
    key: PERMISSIONS.RECRUITMENT.ANALYTICS,
    name: "Recruitment Analytics",
    description: "View recruitment metrics, hiring funnels, and pipeline analytics",
    module: "recruitment",
    action: "analytics",
  },
  // Job Descriptions (JD)
  {
    key: PERMISSIONS.JD.VIEW,
    name: "View Job Descriptions",
    description: "View job description listings and individual JD details",
    module: "jd",
    action: "view",
  },
  {
    key: PERMISSIONS.JD.CREATE,
    name: "Create Job Description",
    description: "Create new job descriptions with role details and requirements",
    module: "jd",
    action: "create",
  },
  {
    key: PERMISSIONS.JD.EDIT,
    name: "Edit Job Description",
    description: "Edit existing job descriptions, requirements, and details",
    module: "jd",
    action: "edit",
  },
  {
    key: PERMISSIONS.JD.CLOSE,
    name: "Close Job Description",
    description: "Close or archive a job description to stop accepting applications",
    module: "jd",
    action: "close",
  },
  {
    key: PERMISSIONS.JD.ANALYZE,
    name: "Analyze Job Description",
    description: "Run AI analysis on a JD to extract skills, keywords, and match criteria",
    module: "jd",
    action: "analyze",
  },

  // Job Applications
  {
    key: PERMISSIONS.JOB_APPLICATION.VIEW,
    name: "View Job Applications",
    description: "View submitted job applications and candidate submissions",
    module: "job_application",
    action: "view",
  },
  {
    key: PERMISSIONS.JOB_APPLICATION.PARSE,
    name: "Parse Job Application",
    description: "Parse resumes attached to job applications to extract structured data",
    module: "job_application",
    action: "parse",
  },
  {
    key: PERMISSIONS.JOB_APPLICATION.SHORTLIST,
    name: "Shortlist Job Application",
    description: "Move applications to the shortlisted stage for further review",
    module: "job_application",
    action: "shortlist",
  },
  {
    key: PERMISSIONS.JOB_APPLICATION.REJECT,
    name: "Reject Job Application",
    description: "Reject job applications and mark candidates as not moving forward",
    module: "job_application",
    action: "reject",
  },
  {
    key: PERMISSIONS.JOB_APPLICATION.SCHEDULE,
    name: "Schedule Interview",
    description: "Schedule interviews and send calendar invites to applicants",
    module: "job_application",
    action: "schedule",
  },

  // Resume
  {
    key: PERMISSIONS.RESUME.PARSE,
    name: "Parse Resume",
    description: "Parse resumes to extract skills, experience, and education data",
    module: "resume",
    action: "parse",
  },
  {
    key: PERMISSIONS.RESUME.DOWNLOAD,
    name: "Download Resume",
    description: "Download candidate resumes and attachments",
    module: "resume",
    action: "download",
  },

  // Candidate Intelligence
  {
    key: PERMISSIONS.CANDIDATE.RANK_VIEW,
    name: "View Candidate Ranking",
    description: "View ranked ordering of candidates based on parsed and analyzed data",
    module: "candidate",
    action: "rank_view",
  },
  {
    key: PERMISSIONS.CANDIDATE.COMPATIBILITY_VIEW,
    name: "View Candidate Compatibility",
    description: "View candidate-to-JD match score and compatibility insights",
    module: "candidate",
    action: "compatibility_view",
  },
  // Compliance
  {
    key: PERMISSIONS.COMPLIANCE.VIEW,
    name: "View Compliance",
    description: "View employee compliance status, checklists, and expiry dates",
    module: "compliance",
    action: "view",
  },
  {
    key: PERMISSIONS.COMPLIANCE.VIEW_DOCUMENTS,
    name: "View Compliance Documents",
    description: "View and download compliance and onboarding documents",
    module: "compliance",
    action: "view_documents",
  },
  {
    key: PERMISSIONS.COMPLIANCE.REQUEST_RESUBMISSION,
    name: "Request Document Resubmission",
    description: "Request an employee to resubmit rejected or expired documents",
    module: "compliance",
    action: "request_resubmission",
  },

  // Task Management
  {
    key: PERMISSIONS.TASK.VIEW,
    name: "View Tasks",
    description: "View all tasks assigned across the organisation",
    module: "task",
    action: "view",
  },
  {
    key: PERMISSIONS.TASK.CREATE,
    name: "Create Task",
    description: "Create and assign tasks to employees",
    module: "task",
    action: "create",
  },
  {
    key: PERMISSIONS.TASK.EDIT,
    name: "Edit Task",
    description: "Edit existing task descriptions, deadlines, and assignees",
    module: "task",
    action: "edit",
  },
  {
    key: PERMISSIONS.TASK.DELETE,
    name: "Delete Task",
    description: "Delete tasks from the system",
    module: "task",
    action: "delete",
  },
  {
    key: PERMISSIONS.TASK.MY,
    name: "View My Tasks",
    description: "View and update status of own assigned tasks",
    module: "task",
    action: "my",
  },
  {
    key: PERMISSIONS.TASK.UPDATE_STATUS,
    name: "Update Task Status",
    description: "Update progress or completion status of tasks",
    module: "task",
    action: "update_status",
  },

  // Reports
  {
    key: PERMISSIONS.REPORT.VIEW,
    name: "View Daily Reports",
    description: "View daily work reports submitted by employees",
    module: "report",
    action: "view",
  },
  {
    key: PERMISSIONS.REPORT.SUBMIT,
    name: "Submit Daily Report",
    description: "Submit own daily work report",
    module: "report",
    action: "submit",
  },

  // Calendar
  {
    key: PERMISSIONS.CALENDAR.VIEW,
    name: "View Calendar",
    description: "View calendar events, company holidays, and schedules",
    module: "calendar",
    action: "view",
  },
  {
    key: PERMISSIONS.CALENDAR.MANAGE,
    name: "Manage Calendar",
    description: "Add, edit, and delete company calendar events and holidays",
    module: "calendar",
    action: "manage",
  },

  // Customer Connect
  {
    key: PERMISSIONS.CUSTOMER.VIEW,
    name: "View Customer Inquiries",
    description: "View customer contact inquiries and submissions",
    module: "customer",
    action: "view",
  },
  {
    key: PERMISSIONS.CUSTOMER.DELETE,
    name: "Delete Customer Inquiry",
    description: "Delete customer contact submissions",
    module: "customer",
    action: "delete",
  },

  // Notifications
  {
    key: PERMISSIONS.NOTIFICATION.VIEW,
    name: "View Notifications",
    description: "Receive and view system notifications",
    module: "notification",
    action: "view",
  },

  // Documents
  {
    key: PERMISSIONS.DOCUMENT.SUBMIT,
    name: "Submit Documents",
    description: "Submit own onboarding and identity documents",
    module: "document",
    action: "submit",
  },
  {
    key: PERMISSIONS.DOCUMENT.VIEW_OWN,
    name: "View Own Documents",
    description: "View own submitted onboarding documents and status",
    module: "document",
    action: "view_own",
  },

  // Settings
  {
    key: PERMISSIONS.SETTINGS.PROFILE,
    name: "Manage Profile",
    description: "View and update own profile information and settings",
    module: "settings",
    action: "profile",
  },
  {
    key: PERMISSIONS.SETTINGS.CHANGE_PASSWORD,
    name: "Change Password",
    description: "Change own account password",
    module: "settings",
    action: "change_password",
  },
  {
    key: PERMISSIONS.SETTINGS.POSITION_VIEW,
    name: "View Positions",
    description: "View job positions and designations",
    module: "settings",
    action: "position_view",
  },
  {
    key: PERMISSIONS.SETTINGS.POSITION_MANAGE,
    name: "Manage Positions",
    description: "Create, edit, and delete job positions and designations",
    module: "settings",
    action: "position_manage",
  },
  {
    key: PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE,
    name: "Manage Employee Types / Roles",
    description: "Create, edit, and assign permissions to custom roles / employee types",
    module: "settings",
    action: "employee_types_manage",
  },
  {
    key: PERMISSIONS.SETTINGS.BOT,
    name: "Manage HR Bot",
    description: "Configure HR assistant bot knowledge base and settings",
    module: "settings",
    action: "bot",
  },
  {
    key: PERMISSIONS.SETTINGS.MANAGE,
    name: "Manage Department Settings",
    description: "Create, edit, and manage departments and organizational units",
    module: "settings",
    action: "manage",
  },

  // Protected RBAC System Permissions
  {
    key: PERMISSIONS.RBAC.PERMISSION_VIEW,
    name: "View RBAC Permissions",
    description: "View system permission definitions and capability catalog",
    module: "rbac",
    action: "permission_view",
    isSystem: true,
  },
  {
    key: PERMISSIONS.RBAC.ROLE_MANAGE,
    name: "Manage Roles",
    description: "Create, update, activate, and deactivate application roles",
    module: "rbac",
    action: "role_manage",
    isSystem: true,
  },
  {
    key: PERMISSIONS.RBAC.ROLE_ASSIGN,
    name: "Assign Role Permissions",
    description: "Assign or revoke permission sets for roles",
    module: "rbac",
    action: "role_assign",
    isSystem: true,
  },
];

/**
 * Module metadata for categorized UI display
 */
export const MODULE_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  employee: "Employee Management",
  attendance: "Attendance",
  leave: "Leave Management",
  payroll: "Payroll Management",
  recruitment: "Recruitment",
  compliance: "Compliance",
  task: "Task Management",
  report: "Daily Reports",
  calendar: "Calendar",
  customer: "Customer Connect",
  notification: "Notifications",
  document: "Documents",
  settings: "Settings",
  rbac: "Role-Based Access Control",
};
