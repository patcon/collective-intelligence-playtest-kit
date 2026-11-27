import { useSyncExternalStore } from 'react';
import type { HoverStore } from './HoverStore.ts';

/**
 * While the pointer or focus is in the matrix, highlights the hovered participant's whole row and the hovered
 * statement's whole column, with their name and number, like a spreadsheet, as a `<style>` naming them: only this
 * re-renders as the pointer moves, never the matrix's cells. Each label is highlighted itself (not just its
 * button, which in pixel-fit is only a pixel or two), and one too crowded to show (see `isLabelled`) shows while
 * highlighted, over its neighbours'.
 */
export function MatrixHighlight({ hover }: { hover: HoverStore }) {
  const { active, column, row } = useSyncExternalStore(hover.subscribe, hover.getState);
  if (!active) {
    return null;
  }
  const rowSelector = row === null ? null : `.vote-matrix [data-row="${CSS.escape(row)}"]`;
  const headers = [rowSelector && `${rowSelector} > .vote-name`, column !== null && `.vote-matrix .vote-header[data-column="${column}"]`].filter(Boolean);
  if (headers.length === 0) {
    return null;
  }
  const cells = [rowSelector && `${rowSelector} > .vote-cell`, column !== null && `.vote-matrix .vote-cell[data-column="${column}"]`].filter(Boolean);
  const rules = [
    `${cells.join(', ')} { box-shadow: inset 0 0 0 100vmax var(--vote-highlight); }`,
    `${headers.join(', ')} { background: var(--vote-highlight); }`,
    `${headers.map((header) => `${header} .vote-label`).join(', ')} { display: block; z-index: 1; font-weight: 600; background: linear-gradient(var(--vote-highlight), var(--vote-highlight)), var(--vote-label-bg); }`,
  ];
  return <style>{rules.join('\n')}</style>;
}
