// PROTOTYPE (kept, not rendered; see GroupSegmentWizardVariants): the maths behind `GroupSegmentWizard`. See docs/intent/group-segment-wizard.md.
import { MIN_GROUP_SIZE } from '../../matching/split.ts';

export type Locked = 'groups' | 'size';
/** Fewest groups there ever are: one group isn't a split. */
export const MIN_GROUPS = 2;

/**
 * How many groups people per group `k` makes, and which groups are flagged:
 * - `aimFor`: groups of k or fewer, with any short ones flagged (B, C, D by default).
 * - `atLeast`: groups of k or more; extras join groups ("min"). With people for only one full group,
 *   the rest make a short group instead, so it shows how many are short.
 * - `atMost`: groups of k or fewer; extras make another group, and that's expected ("max").
 * - `nearest`: whichever group count gets the average closest to k without leaving anyone on their
 *   own, for casual rooms ("smart").
 */
export type Leftovers = 'aimFor' | 'atLeast' | 'atMost' | 'nearest';

/** Group sizes for `n` people dealt round-robin into `groups`, largest first. */
export function sizesOf(n: number, groups: number): Array<number> {
  return Array.from({ length: groups }, (_, g) => Math.floor(n / groups) + (g < n % groups ? 1 : 0));
}

/** How many groups `n` people make at `size` per group, before the floor of `MIN_GROUPS`. */
function groupsForSize(n: number, size: number, leftovers: Leftovers): number {
  const fewer = Math.floor(n / size);
  const more = Math.ceil(n / size);
  if (leftovers === 'atLeast') {
    return fewer;
  }
  if (leftovers === 'nearest') {
    // Never anyone on their own: an odd one out joins a group instead (7 in pairs is 3·2·2, not 2·2·2·1).
    if (more > 0 && Math.floor(n / more) < MIN_GROUP_SIZE) {
      return fewer;
    }
    // A tie goes to more, smaller groups.
    return fewer > 0 && Math.abs(n / fewer - size) < Math.abs(n / more - size) ? fewer : more;
  }
  return more;
}

/**
 * The group sizes `n` people make at `size` per group, never fewer than `MIN_GROUPS` groups. "Min"
 * with people for only one full group fills it and leaves the rest short (20 at 15 is 15·5): the
 * real matcher deals round-robin, so building this for real needs one that fills groups first.
 */
export function sizesForSize(n: number, size: number, leftovers: Leftovers): Array<number> {
  const groups = groupsForSize(n, size, leftovers);
  if (leftovers === 'atLeast' && groups === 1 && n > size) {
    return [size, n - size];
  }
  return sizesOf(n, Math.max(MIN_GROUPS, groups));
}

/** People per group as a label: "3", or "3–4" when sizes differ. */
export function sizeLabel(sizes: ReadonlyArray<number>): string {
  if (sizes.length === 0) {
    return '–';
  }
  const low = Math.min(...sizes);
  const high = Math.max(...sizes);
  return low === high ? String(low) : `${low}–${high}`;
}
