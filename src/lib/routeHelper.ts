import { NextRequest, NextResponse } from "next/server";

/**
 * Extracts and unifies dynamic route params and URL searchParams into a single query object.
 * Awaits context.params if it is a Promise (Next.js 15+ convention).
 */
export async function getQueryParams(
  req: NextRequest,
  paramsPromise?: Promise<Record<string, string | string[]>> | Record<string, string | string[]>
): Promise<Record<string, any>> {
  let resolvedParams: Record<string, any> = {};
  if (paramsPromise) {
    try {
      resolvedParams = await Promise.resolve(paramsPromise);
    } catch {
      resolvedParams = {};
    }
  }

  const query: Record<string, any> = { ...resolvedParams };
  req.nextUrl.searchParams.forEach((val, key) => {
    if (query[key] !== undefined) {
      if (Array.isArray(query[key])) {
        query[key].push(val);
      } else {
        query[key] = [query[key], val];
      }
    } else {
      query[key] = val;
    }
  });

  return query;
}

/**
 * Safely parses JSON body from a NextRequest, returning an empty object on error.
 */
export async function getRequestBody(req: NextRequest): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/**
 * Extracts the JWT token from NextRequest cookies or Authorization header.
 */
export function getTokenFromRequest(req: NextRequest): string | undefined {
  const cookieToken = req.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return undefined;
}
