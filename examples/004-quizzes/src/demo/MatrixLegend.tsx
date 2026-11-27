import { ANSWER_SCALE } from '../items/items.ts';
import { cellClassOf } from './answerColours.ts';

const KEYS = [...ANSWER_SCALE.map(({ value, label }) => ({ className: cellClassOf(value), label })), { className: cellClassOf(null), label: 'Skipped' }, { className: cellClassOf(undefined), label: 'Not answered yet' }];

/** What each cell means: the five answers, a skip, and not answered yet. */
export function MatrixLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-kumo-subtle">
      {KEYS.map(({ className, label }) => (
        <li className="flex items-center gap-1.5" key={label}>
          <span className={className} />
          {label}
        </li>
      ))}
    </ul>
  );
}
