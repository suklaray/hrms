import {
  LayoutDashboard,
  UserPlus,
  Users,
  Clock,
  Shield,
  Phone,
  Settings,
  ListChecks,
  UserCog,
  Banknote,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PERMISSIONS } from "@/rbac/permissions";

export type SidebarPermission = string | string[];

export type SidebarItem = {
  name?: string;
  title?: string;
  icon?: LucideIcon;
  route?: string;
  permission?: SidebarPermission;
  children?: SidebarItem[];
};

export const SIDEBAR_STRUCTURE: SidebarItem[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    route: "/dashboard",
    permission: PERMISSIONS.DASHBOARD.VIEW,
  },
  {
    name: "Recruitment Management",
    icon: UserPlus,
    permission: [
      PERMISSIONS.RECRUITMENT.VIEW,
      PERMISSIONS.RECRUITMENT.APPLICATIONS_VIEW,
      PERMISSIONS.RECRUITMENT.ANALYTICS,
      PERMISSIONS.RECRUITMENT.CREATE,
      PERMISSIONS.JD.VIEW,
      PERMISSIONS.JD.CREATE,
      PERMISSIONS.JOB_APPLICATION.VIEW,
    ],
    children: [
      { title: "Candidate Management", route: "/Recruitment/recruitment", permission: [PERMISSIONS.RECRUITMENT.VIEW] },
      { title: "Add Candidates", route: "/Recruitment/addCandidates", permission: PERMISSIONS.RECRUITMENT.CREATE },
      { title: "Job Descriptions", route: "/Recruitment/job-description", permission: PERMISSIONS.JD.VIEW },
      { title: "Add Job Description", route: "/Recruitment/job-description/add", permission: PERMISSIONS.JD.CREATE },
      { title: "Job Applications", route: "/Recruitment/job-applications", permission: PERMISSIONS.JOB_APPLICATION.VIEW },
      { title: "Analytics", route: "/Recruitment/analytics", permission: PERMISSIONS.RECRUITMENT.ANALYTICS },
    ],
  },
  {
    name: "Employee Management",
    icon: Users,
    permission: PERMISSIONS.EMPLOYEE.VIEW,
    children: [
      { title: "Employee List", route: "/employeeList", permission: PERMISSIONS.EMPLOYEE.VIEW },
      { title: "Register Employee", route: "/registerEmployee", permission: PERMISSIONS.EMPLOYEE.CREATE },
    ],
  },
  {
    name: "Attendance & Leave",
    icon: Clock,
    permission: PERMISSIONS.ATTENDANCE.VIEW,
    children: [
      { title: "Attendance", route: "/attendance", permission: PERMISSIONS.ATTENDANCE.VIEW },
      { title: "Leave Management", route: "/view-leave-requests", permission: PERMISSIONS.LEAVE.VIEW },
      { title: "Attendance Analytics", route: "/attendance/analytics", permission: PERMISSIONS.ATTENDANCE.ANALYTICS },
    ],
  },
  {
    name: "Payroll Management",
    icon: Banknote,
    permission: PERMISSIONS.PAYROLL.VIEW,
    children: [
      {
        name: "Payroll Setup",
        icon: Banknote,
        permission: PERMISSIONS.PAYROLL.GENERATE,
        children: [
          {
            name: "Payroll Configuration",
            icon: Banknote,
            permission: PERMISSIONS.PAYROLL.GENERATE,
            children: [
              { title: "Create Configuration", route: "/payroll/payroll-setup/payroll-create-config", permission: PERMISSIONS.PAYROLL.GENERATE },
              { title: "Manage Configurations", route: "/payroll/payroll-setup/payroll-get-configs", permission: PERMISSIONS.PAYROLL.VIEW },
            ],
          },
          {
            name: "Financial Year",
            icon: Calendar,
            permission: PERMISSIONS.PAYROLL.GENERATE,
            children: [
              { title: "Create Financial Year", route: "/payroll/financial-year-setup/payroll-create-financial-year", permission: PERMISSIONS.PAYROLL.GENERATE },
              { title: "Manage Financial Years", route: "/payroll/financial-year-setup/payroll-get-financial-years", permission: PERMISSIONS.PAYROLL.VIEW },
            ],
          },
          {
            name: "Salary Calendar",
            icon: Calendar,
            permission: PERMISSIONS.PAYROLL.GENERATE,
            children: [
              { title: "Create Calendar", route: "/payroll/payroll-setup/payroll-create-periods", permission: PERMISSIONS.PAYROLL.GENERATE },
              { title: "Manage Calendars", route: "/payroll/payroll-setup/payroll-get-periods", permission: PERMISSIONS.PAYROLL.VIEW },
            ],
          },
          {
            name: "Salary Structures",
            icon: FileSpreadsheet,
            permission: PERMISSIONS.PAYROLL.VIEW,
            children: [
              { title: "Create Salary Structure", route: "/payroll/payroll-setup/salary-structures/create", permission: PERMISSIONS.PAYROLL.GENERATE },
              { title: "Manage Salary Structures", route: "/payroll/payroll-setup/salary-structures", permission: PERMISSIONS.PAYROLL.VIEW },
            ],
          },
        ],
      },
      {
        name: "Salary",
        icon: Banknote,
        permission: PERMISSIONS.PAYROLL.VIEW,
        children: [
          {
            name: "Salary Component",
            icon: Banknote,
            permission: PERMISSIONS.PAYROLL.VIEW,
            children: [
              { title: "Create Component", route: "/payroll/salary/salary-components/salary-create-component", permission: PERMISSIONS.PAYROLL.GENERATE },
              { title: "Manage Components", route: "/payroll/salary/salary-components/salary-get-components", permission: PERMISSIONS.PAYROLL.VIEW },
            ],
          },
          {
            name: "Employee Salary",
            icon: Banknote,
            permission: PERMISSIONS.PAYROLL.VIEW,
            children: [
              { title: "Manage Employee Salary", route: "/payroll/employee-salary", permission: PERMISSIONS.PAYROLL.VIEW },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Compliance",
    icon: Shield,
    permission: PERMISSIONS.COMPLIANCE.VIEW,
    children: [
      { title: "Employee Compliance", route: "/compliance/empCompliance", permission: PERMISSIONS.COMPLIANCE.VIEW },
      { title: "Document Center", route: "/compliance/documentCenter", permission: PERMISSIONS.COMPLIANCE.VIEW_DOCUMENTS },
    ],
  },
  {
    name: "Task Management",
    icon: ListChecks,
    permission: PERMISSIONS.TASK.VIEW,
    children: [
      { title: "Task Management", route: "/task-management/manage-tasks", permission: PERMISSIONS.TASK.CREATE },
      { title: "Daily Reports", route: "/task-management/daily-reports", permission: PERMISSIONS.REPORT.VIEW },
    ],
  },
  {
    name: "Roles & Titles",
    icon: UserCog,
    permission: PERMISSIONS.SETTINGS.POSITION_VIEW,
    children: [
      { title: "Designation Management", route: "/settings/position-management", permission: PERMISSIONS.SETTINGS.POSITION_MANAGE },
      { title: "Role Management", route: "/settings/employee-types", permission: PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE },
      { title: "Department Management", route: "/settings/departments", permission: PERMISSIONS.SETTINGS.MANAGE },
    ],
  },
  {
    name: "Customer Connect",
    icon: Phone,
    route: "/customer-connect",
    permission: PERMISSIONS.CUSTOMER.VIEW,
  },
  {
    name: "Settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS.PROFILE,
    children: [
      { title: "My profile", route: "/settings/profile", permission: PERMISSIONS.SETTINGS.PROFILE },
      { title: "My Attendance", route: "/attendance/my-attendance", permission: PERMISSIONS.ATTENDANCE.MY },
      { title: "Leave Request", route: "/leave-request/leave-request", permission: PERMISSIONS.LEAVE.REQUEST },
      { title: "Payslip & Documents", route: "/payslip/payslip-lists", permission: PERMISSIONS.PAYSLIP.VIEW },
      { title: "My Tasks", route: "/task-management/user-task", permission: [PERMISSIONS.TASK.MY, PERMISSIONS.REPORT.SUBMIT] },
      { title: "Bot Settings", route: "/settings/bot-settings", permission: PERMISSIONS.SETTINGS.BOT },
    ],
  },
];
