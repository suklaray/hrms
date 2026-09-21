/**
 * Shared JWT decoded token type used across all API routes.
 * Replaces the `string | JwtPayload` union from jsonwebtoken with a concrete shape.
 */
export interface DecodedToken {
  role?: string;
  empid?: string;
  id?: string | number;
  email?: string;
  [key: string]: unknown;
}
