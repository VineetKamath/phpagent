import { timingSafeEqual } from "node:crypto";

/** Bearer INTERNAL_API_TOKEN, constant-time. False when the token is unset or shorter than 16 chars. */
export function internalAuthorized(header: string | null): boolean {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token || token.length < 16 || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
