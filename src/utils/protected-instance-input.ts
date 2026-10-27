const PROTECTED_INSTANCE_FIELDS = ['instanceName', 'instanceId'] as const;

/**
 * Keeps URL-derived instance identity authoritative after authentication.
 * Query strings and request bodies are untrusted and cannot select another tenant.
 */
export function sanitizeInstanceInput(source: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!source || typeof source !== 'object') return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if ((PROTECTED_INSTANCE_FIELDS as readonly string[]).includes(key)) continue;
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Instance creation has no route-derived identity, so its name must be accepted.
 * The generated instance ID remains server-controlled.
 */
export function sanitizeInstanceCreateInput(source: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!source || typeof source !== 'object') return {};

  const sanitized = { ...source };
  delete sanitized.instanceId;

  return sanitized;
}
