// lib/rbacPermissions.js
//
// MASTER PERMISSION LIST — single source of truth for all permissions in this application.
//
// Rules:
//  - Every permission key used in any API route or UI guard must be listed here.
//  - Keys follow the pattern:  <module>.<action>
//  - Never delete a key that is already assigned to a role in the DB.
//    Use the sync utility (scripts/syncPermissions.mjs) to push new keys to the DB.
//  - The `category` field maps to the Permission.category column used by the
//    employee-types permissions UI (pages/api/settings/employee-types/permissions.js).

export const PERMISSIONS = [

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  // Route: /dashboard, /employee/dashboard
  // API:   /api/dashboard/stats, /api/employee/stats
  {
    category: "Dashboard",
    key: "dashboard.view",
    name: "View Dashboard",
    description: "Access the main dashboard and its statistics",
  },

  // ─── Employee Management ───────────────────────────────────────────────────
  // Routes: /registerEmployee, /employeeList, /ViewDetails
  // APIs:   /api/auth/register, /api/hr/employees, /api/auth/employees,
  //         /api/auth/employee/[id], /api/hr/employees/[empid],
  //         /api/auth/employee/update-role/[id], /api/auth/employee/update-type/[id],
  //         /api/auth/employee/update-position/[id], /api/auth/updateVerification,
  //         /api/auth/reset-employee-password, /api/employee/sendCredentials,
  //         /api/auth/sendCredentials, /api/addEmployees
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

  // ─── Attendance ────────────────────────────────────────────────────────────
  // Routes: /hr/attendance, /hr/attendance/[empid], /attendance/analytics
  // APIs:   /api/hr/attendance, /api/hr/attendance/[empid],
  //         /api/hr/attendance-analytics, /api/attendance/analytics,
  //         /api/employee/checkin, /api/employee/checkout,
  //         /api/auth/employee/checkin, /api/auth/employee/checkout,
  //         /api/attendance/auto-checkout, /api/attendance/auto-logout
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
  // Route: /hr/attendance/my-attendance (HR/Admin viewing their own attendance)
  // API:   /api/hr/attendance/my-attendance
  // {
  //   category: "Attendance",
  //   key: "attendance.my_hr",
  //   name: "My Attendance (HR/Admin)",
  //   description: "HR and Admin staff can view their own attendance record",
  // },

  // ─── Attendance Regularization ─────────────────────────────────────────────
  // APIs:   /api/attendance/regularization (POST — submit)
  //         /api/hr/regularization (GET list, PATCH approve/reject)
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

  // ─── Leave ─────────────────────────────────────────────────────────────────
  // Routes: /hr/view-leave-requests, /hr/leave-request, /leave-request/leave-request,
  //         /employee/leave-request, /hr/employee-leave-details,
  //         /hr/employee-leave-summary
  // APIs:   /api/hr/leave-requests, /api/hr/update-leave-status,
  //         /api/hr/cancel-leave, /api/leave/request, /api/leave/status,
  //         /api/leave/cancel, /api/leave/update-status,
  //         /api/hr/leave/request, /api/hr/leave/status,
  //         /api/leave-records/leave-request, /api/hr/leaves/monthly,
  //         /api/hr/employee-leave-details, /api/leave/balances
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

  // ─── Payroll ───────────────────────────────────────────────────────────────
  // Routes: /hr/payroll/payroll-view, /hr/payroll/generate
  // APIs:   /api/hr/payroll/all, /api/hr/payroll/get, /api/hr/payroll/generate,
  //         /api/hr/payroll/add, /api/hr/employees/payroll-details,
  //         /api/employee/payroll-data
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

  // ─── Payslip ───────────────────────────────────────────────────────────────
  // Routes: /payslip/payslip-lists, /payslip/payslip-preview,
  //         /employee/emp-payslip, /employee/payslip-preview
  // APIs:   /api/payslip/payslip-lists, /api/payslip/user-payroll,
  //         /api/payslip/user-details, /api/employee/payslip-details,
  //         /api/employee/download-payslip, /api/auth/employee/emp-payslip
  {
    category: "Payroll",
    key: "payslip.view",
    name: "View Own Payslip",
    description: "View and download own payslips",
  },

  // ─── Recruitment ───────────────────────────────────────────────────────────
  // Routes: /Recruitment/recruitment, /Recruitment/candidates,
  //         /Recruitment/addCandidates, /Recruitment/[candidate_id],
  //         /Recruitment/add, /Recruitment/edit
  // APIs:   /api/recruitment/getCandidates, /api/recruitment/addCandidate,
  //         /api/recruitment/updateCandidate, /api/recruitment/deleteCandidate,
  //         /api/recruitment/updateHRStatus, /api/recruitment/verifyCandidate,
  //         /api/recruitment/sendInterviewMail, /api/recruitment/sendFormMail,
  //         /api/recruitment/generateFormLink, /api/recruitment/add-employee,
  //         /api/candidate/[id], /api/recruitment/download-resume/[id]
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

  // ─── Compliance ────────────────────────────────────────────────────────────
  // Routes: /compliance/empCompliance, /compliance/documentCenter,
  //         /compliance/employee-details, /compliance/documents
  // APIs:   /api/compliance/compliance, /api/compliance/candidate-documents,
  //         /api/hr/view-document/[empid], /api/employee/documents,
  //         /api/employee/get-documents, /api/hr/document-center-users,
  //         /api/employee/request-resubmission, /api/employee/document-status
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

  // ─── Task Management ───────────────────────────────────────────────────────
  // Routes: /task-management/manage-tasks, /task-management/index,
  //         /task-management/employee-task, /task-management/employee-reports
  // APIs:   /api/task-management/tasks (GET employees, POST create),
  //         /api/task-management/all-tasks, /api/task-management/delete-tasks,
  //         /api/task-management/employee-tasks, /api/task-management/update-task-status
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
  // Route: /task-management/user-task
  // API:   /api/task-management/user-task
  {
    category: "Task Management",
    key: "task.update_status",
    name: "Update Task Status",
    description: "Update the status of an assigned task",
  },

  // ─── Daily Work Reports ────────────────────────────────────────────────────
  // Routes: /task-management/daily-reports, /task-management/employee-reports
  // APIs:   /api/hr/all-work-reports, /api/hr/employee-work-reports/[empid],
  //         /api/employee/work-report, /api/employee/work-status
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

  // ─── Calendar ──────────────────────────────────────────────────────────────
  // Routes: /calendar/yearly-calendar, /calendar/add-events,
  //         /employee/calendar
  // APIs:   /api/calendar/events, /api/calendar/yearly-events,
  //         /api/calendar/add-events, /api/calendar/update-event,
  //         /api/calendar/delete-event
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

  // ─── Customer Connect ──────────────────────────────────────────────────────
  // Route: /customer-connect
  // APIs:  /api/contact/contact-list, /api/contact/delete-multiple, /api/contact.js
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

  // ─── Notifications ─────────────────────────────────────────────────────────
  // APIs: /api/notifications/recent, /api/notifications/stream
  {
    category: "Notifications",
    key: "notification.view",
    name: "View Notifications",
    description: "Receive and view system notifications",
  },

  // ─── Settings — Profile & Password ────────────────────────────────────────
  // Routes: /settings/profile, /employee/profile, /settings/change-password
  // APIs:   /api/auth/settings/user-profile, /api/auth/settings/upload-profile-pic,
  //         /api/auth/settings/change-password, /api/auth/change-password,
  //         /api/employee/my-profile, /api/employee/profile
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

  // ─── Settings — Positions ──────────────────────────────────────────────────
  // Route: /settings/position-management
  // API:   /api/settings/positions, /api/settings/position-employees
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

  // ─── Settings — Employee Types (Roles/RBAC) ────────────────────────────────
  // Route: (admin panel)
  // APIs:  /api/settings/employee-types/index, /api/settings/employee-types/[id],
  //        /api/settings/employee-types/permissions
  {
    category: "Settings",
    key: "settings.employee_types_manage",
    name: "Manage Employee Types",
    description: "Create, edit, and assign permissions to employee types (roles)",
  },

  // ─── Settings — Bot ────────────────────────────────────────────────────────
  // Route: /settings/bot-settings
  // APIs:  /api/bot/upload, /api/bot/files, /api/bot/download, /api/bot/text
  {
    category: "Settings",
    key: "settings.bot",
    name: "Bot Settings",
    description: "Manage HR assistant bot knowledge base and settings",
  },

  // ─── Documents (Employee Self-Service) ────────────────────────────────────
  // Routes: /employee/upload-documents, /employee/view
  // APIs:   /api/employee/submit-documents, /api/employee/upload-document,
  //         /api/employee/get-documents/[id], /api/employee/documents/[empid]
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

// ─── Convenience lookup ────────────────────────────────────────────────────
// Keyed map for O(1) lookups inside API routes:
//   import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
//   checkPermission(user, PERMISSION_KEYS.EMPLOYEE_VIEW)
export const PERMISSION_KEYS = Object.fromEntries(
  PERMISSIONS.map((p) => [
    p.key.toUpperCase().replace(/\./g, "_"),
    p.key,
  ])
);
// e.g. PERMISSION_KEYS.EMPLOYEE_VIEW === "employee.view"
//      PERMISSION_KEYS.ATTENDANCE_REGULARIZE === "attendance.regularize"
