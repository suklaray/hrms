import prisma from "@/lib/prisma";

export interface CalendarEventVisibilityViewer {
  empid: string;
  email: string;
}

export async function getCalendarEventVisibilityViewer(
  user: { empid?: string; email?: string; id?: number | string }
): Promise<CalendarEventVisibilityViewer | null> {
  const userRecord = user.empid
    ? await prisma.users.findUnique({
        where: { empid: user.empid },
        select: { empid: true, email: true },
      })
    : user.email
      ? await prisma.users.findUnique({
          where: { email: user.email },
          select: { empid: true, email: true },
        })
      : typeof user.id === "number" ||
          (typeof user.id === "string" && /^\d+$/.test(user.id))
        ? await prisma.users.findUnique({
            where: { id: Number(user.id) },
            select: { empid: true, email: true },
          })
        : null;

  return userRecord;
}

export function formatCalendarEventVisibility(
  relations: Array<{ user: { email: string } }>,
  legacyVisibility: string
) {
  if (legacyVisibility.trim().toLowerCase() === "all") return "all";
  return relations.length > 0
    ? relations.map(({ user }) => user.email).join(",")
    : legacyVisibility;
}

export function isCalendarEventVisible(
  event: {
    visibility: Array<{ empid: string }>;
    visible_to: string;
    created_by: string;
  },
  viewer: CalendarEventVisibilityViewer | null
) {
  if (!viewer) return false;
  if (event.created_by.toLowerCase() === viewer.email.toLowerCase()) return true;
  if (event.visible_to.trim().toLowerCase() === "all") return true;
  if (event.visibility.length > 0) {
    return event.visibility.some(({ empid }) => empid === viewer.empid);
  }

  const legacyVisibility = event.visible_to
    .split(",")
    .map((value) => value.trim().toLowerCase());
  return (
    legacyVisibility.includes("all") ||
    legacyVisibility.includes(viewer.email.toLowerCase())
  );
}
