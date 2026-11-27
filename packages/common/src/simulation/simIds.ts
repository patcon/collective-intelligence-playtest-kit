const SIM_ID_PREFIX = 'sim-';

/** A fresh id for a simulated participant, marked so any page can tell it from a phone. */
export function newSimId(): string {
  return `${SIM_ID_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
}

/** Whether a participant id is a simulated one, from this page or any other. */
export function isSimId(id: string): boolean {
  return id.startsWith(SIM_ID_PREFIX);
}
