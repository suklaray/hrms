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
  Banknote, Calendar,
  FileSpreadsheet
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/dashboard',
    permission: 'dashboard.view',
  },
  {
    name: 'Recruitment Management',
    icon: UserPlus,
    permission: 'recruitment.view',
    children: [
      { title: 'Recruitment', route: '/Recruitment/recruitment', permission: 'recruitment.view' },
    ],
  },
  {
    name: 'Employee Management',
    icon: Users,
    permission: 'employee.view',
    children: [
      { title: 'Employee List', route: '/employeeList', permission: 'employee.view' },
      { title: 'Register Employee', route: '/registerEmployee', permission: 'employee.create' },
    ],
  },
  {
    name: 'Attendance & Leave',
    icon: Clock,
    permission: 'attendance.view',
    children: [
      { title: 'Attendance', route: '/attendance', permission: 'attendance.view' },
      { title: 'Leave Management', route: '/view-leave-requests', permission: 'leave.view' },
      { title: 'Attendance Analytics', route: '/attendance/analytics', permission: 'attendance.analytics' },
    ],
  },
  {
    name: 'Payroll Management',
    icon: Banknote,
    permission: 'payroll.view',
    children: [
      {
        name: 'Payroll Setup',
        icon: Banknote,
        permission: 'payroll.generate',
        children: [
          {
            name: 'Payroll Configuration',
            icon: Banknote,
            permission: 'payroll.generate',
            children: [
              { title: 'Create Configuration', route: '/payroll/payroll-setup/payroll-create-config', permission: 'payroll.generate' },
              { title: 'Manage Configurations', route: '/payroll/payroll-setup/payroll-get-configs', permission: 'payroll.view' },
            ],
          },
          {
            name: 'Financial Year',
            icon: Calendar,
            permission: 'payroll.generate',
            children: [
              { title: 'Create Financial Year', route: '/payroll/financial-year-setup/payroll-create-financial-year', permission: 'payroll.generate' },
              { title: 'Manage Financial Years', route: '/payroll/financial-year-setup/payroll-get-financial-years', permission: 'payroll.view' },
            ],
          },
          {
            name: "Salary Calendar",
            icon: Calendar,
            permission: 'payroll.generate',
            children: [
              { title: 'Create Calendar', route: '/payroll/payroll-setup/payroll-create-periods', permission: 'payroll.generate' },
              { title: 'Manage Calendars', route: '/payroll/payroll-setup/payroll-get-periods', permission: 'payroll.view' },
            ]
          },
          {
            name: "Salary Structures",
            icon: FileSpreadsheet,
            permission: 'payroll.view',
            children: [
              { title: 'Create Salary Structure', route: '/payroll/payroll-setup/salary-structures/create', permission: 'payroll.generate' },
              { title: 'Manage Salary Structures', route: '/payroll/payroll-setup/salary-structures', permission: 'payroll.view' },
            ]
          }
        ]
      },
      {
        name: "Salary",
        icon: Banknote,
        permission: 'payroll.view',
        children: [
          {
            name: "Salary Component",
            icon: Banknote,
            permission: 'payroll.view',
            children: [
              { title: 'Create Component', route: '/payroll/salary/salary-components/salary-create-component', permission: 'payroll.generate' },
              { title: 'Manage Components', route: '/payroll/salary/salary-components/salary-get-components', permission: 'payroll.view' },
            ]
          },
          {
            name: "Employee Salary",
            icon: Banknote,
            permission: 'payroll.view',
            children: [
              { title: 'Manage Employee Salary', route: '/payroll/employee-salary', permission: 'payroll.view' },
            ]
          }
        ]
      }
    ],
  },
  {
    name: 'Compliance',
    icon: Shield,
    permission: 'compliance.view',
    children: [
      { title: 'Employee Compliance', route: '/compliance/empCompliance', permission: 'compliance.view' },
      { title: 'Document Center', route: '/compliance/documentCenter', permission: 'compliance.view_documents' },
    ],
  },
  {
    name: 'Task Management',
    icon: ListChecks,
    permission: 'task.view',
    children: [
      { title: 'Task Management', route: '/task-management/manage-tasks', permission: 'task.create' },
      { title: 'Daily Reports', route: '/task-management/daily-reports', permission: 'report.view' },
    ],
  },
  {
    name: 'Roles & Titles',
    icon: UserCog,
    permission: 'settings.position_view',
    children: [
      { title: 'Designation Management', route: '/settings/position-management', permission: 'settings.position_manage' },
      { title: 'Role Management', route: '/settings/employee-types', permission: 'settings.employee_types_manage' },
    ],
  },
  {
    name: 'Customer Connect',
    icon: Phone,
    route: '/customer-connect',
    permission: 'customer.view',
  },
  {
    name: 'Settings',
    icon: Settings,
    permission: 'settings.profile',
    children: [
      { title: 'My profile', route: '/settings/profile', permission: 'settings.profile' },
      { title: 'My Attendance', route: '/attendance/my-attendance', permission: 'attendance.my' },
      { title: 'Leave Request', route: '/leave-request/leave-request', permission: 'leave.request' },
      { title: 'Payslip & Documents', route: '/payslip/payslip-lists', permission: 'payslip.view' },
      { title: 'My Tasks', route: '/task-management/user-task', permission: ['task.my', 'report.submit'] },
      { title: 'Bot Settings', route: '/settings/bot-settings', permission: 'settings.bot' },
    ],
  },
];
