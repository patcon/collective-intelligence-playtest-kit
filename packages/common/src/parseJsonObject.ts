/**
 * Socket text as a JSON object, or null when it isn't valid JSON or isn't an object (arrays included).
 * Assign it to an interface of the fields you'll check, each typed `unknown`, then validate them.
 */
export function parseJsonObject(raw: string): object | null {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
