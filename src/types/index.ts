// src/types/index.ts

export interface AuthUser {
  id: number | string;
  empid: string;
  name: string;
  role: string;
  roleId?: number | null;
  email: string;
  verified?: string;
  form_submitted?: boolean;
  profile_photo?: string | null;
  position?: string | null;
  rbacRole?: {
    id: number;
    name: string;
  } | null;
}

export interface DecodedToken {
  id: number | string;
  empid?: string;
  name?: string;
  role: string;
  roleId?: number | null;
  email?: string;
  verified?: string;
  form_submitted?: boolean;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  type?: string;
  [key: string]: any;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
