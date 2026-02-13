/**
 * Helpers for safely extracting values from Supabase join results.
 * Supabase may return joins as arrays or single objects depending on the relationship type.
 */

export function getJoinField<T = string>(joinData: unknown, field: string): T | null {
  if (Array.isArray(joinData)) {
    return joinData[0]?.[field] ?? null;
  }
  if (joinData && typeof joinData === 'object' && field in joinData) {
    return (joinData as Record<string, T>)[field] ?? null;
  }
  return null;
}

export function getJoinObject<T>(joinData: unknown): T | null {
  if (Array.isArray(joinData)) return (joinData[0] as T) ?? null;
  return (joinData as T) ?? null;
}
