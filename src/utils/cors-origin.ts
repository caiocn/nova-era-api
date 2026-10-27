/**
 * Browser CORS applies only when an Origin header is present. Server-to-server
 * requests (including container health checks) omit it and remain allowed.
 */
export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  return !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}
