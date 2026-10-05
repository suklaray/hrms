// src/rbac/types.ts
import type { PermissionDefinition } from "./permissions";

export enum RoleType {
  SUPER_ADMIN = "SUPER_ADMIN",
  CUSTOM = "CUSTOM",
}

export enum RoleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export interface UserAuthContext {
  id: number | string;
  empid?: string;
  email?: string;
  name?: string;
  role?: string; // legacy users_role enum string: "superadmin" | "admin" | "hr" | "employee" | "ceo"
  roleId?: number | null;
  companyId?: string | null;
  rbacRole?: {
    id: number;
    name: string;
    type?: RoleType | string;
    status?: RoleStatus | string;
    parentId?: number | null;
  } | null;
}

export interface RbacRoleWithPermissions {
  id: number;
  name: string;
  description: string | null;
  type: RoleType;
  status: RoleStatus;
  companyId: string | null;
  parentId: number | null;
  permissions: {
    permissionId: number;
    permission: {
      id: number;
      key: string;
      name: string | null;
      category: string;
      module: string | null;
      action: string | null;
      isSystem: boolean;
      isActive: boolean;
    };
  }[];
  _count?: {
    users: number;
  };
}

export interface RbacSyncSummary {
  created: string[];
  updated: string[];
  unchanged: string[];
  orphanedInDb: string[];
  totalCodePermissions: number;
  totalDbPermissions: number;
}
