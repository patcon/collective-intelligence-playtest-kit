/** What the pointer or focus is on in the matrix: a statement (column index) and a participant (row id). */
export interface Hover {
  column: number | null;
  row: string | null;
  /** Whether the pointer or focus is still in the matrix; the info area keeps showing the last ones after it leaves. */
  active: boolean;
}

/**
 * The matrix's hover, as a store only the info area reads, so moving the pointer never re-renders the
 * matrix's cells. A change to one part keeps the other, so hovering a row keeps the last statement shown.
 */
export class HoverStore {
  #listeners = new Set<() => void>();
  #state: Hover = { active: false, column: null, row: null };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getState = (): Hover => this.#state;

  set(change: Partial<Hover>): void {
    const next = { ...this.#state, ...change };
    if (next.column === this.#state.column && next.row === this.#state.row && next.active === this.#state.active) {
      return;
    }
    this.#state = next;
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

function isElement(target: EventTarget | null): target is Element {
  return target !== null && 'closest' in target;
}

/** The statement and participant under `target`, from the `data-column` and `data-row` the matrix puts on them. */
export function hoverOf(target: EventTarget | null): Partial<Hover> {
  const hover: Partial<Hover> = {};
  if (!isElement(target)) {
    return hover;
  }
  const column = target.closest('[data-column]')?.getAttribute('data-column');
  const row = target.closest('[data-row]')?.getAttribute('data-row');
  if (column) {
    hover.column = Number(column);
  }
  if (row) {
    hover.row = row;
  }
  return hover;
}
