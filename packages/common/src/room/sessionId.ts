const inMemory = new Map<string, string>();

function storedId(key: string): string {
  const existing = sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

/**
 * An id for this tab, kept in `sessionStorage` under `key`: the same after a reload, different in
 * another tab. Where storage is missing or blocked, an id that lasts as long as the page.
 */
export function sessionId(key: string): string {
  try {
    return storedId(key);
  } catch {
    const id = inMemory.get(key) ?? crypto.randomUUID();
    inMemory.set(key, id);
    return id;
  }
}
