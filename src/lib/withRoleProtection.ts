// src/lib/withRoleProtection.ts
import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromToken } from "./getUserFromToken";
import prisma from "./prisma";

export async function protectPage(allowedRoles: string[] = []) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || cookieStore.get("employeeToken")?.value || "";
  const user = getUserFromToken(token);

  if (!user || !allowedRoles.includes(user.role)) {
    redirect(allowedRoles.includes('employee') ? "/login" : "/403");
  }

  let userData: any = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: (user.empid || user.id) as string },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        role: true,
      },
    });
  } catch (error) {
    console.error('Error fetching user data in protectPage:', error);
  }

  return {
    id: user.id,
    empid: userData?.empid || user.empid,
    name: userData?.name || user.name,
    role: (userData?.role || user.role).toLowerCase(),
    email: userData?.email || user.email,
    profile_photo: userData?.profile_photo || null,
    position: userData?.position || null,
  };
}

export function withRoleProtection(Component: any, allowedRoles: string[] = []) {
  const WrappedComponent = (props: any) => React.createElement(Component, props);
  return WrappedComponent;
}

export default withRoleProtection;
