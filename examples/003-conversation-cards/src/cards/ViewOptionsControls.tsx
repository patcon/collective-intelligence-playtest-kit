import { Checkbox } from '@cloudflare/kumo';
import type { ViewOptions } from './viewOptions.ts';

/** The "Printed look" and "Show API calls" checkboxes. */
export function ViewOptionsControls({ value, onChange }: { value: ViewOptions; onChange: (value: ViewOptions) => void }) {
  return (
    <>
      <Checkbox checked={value.printed} label="Printed look" onCheckedChange={(printed) => onChange({ ...value, printed: printed === true })} />
      <Checkbox checked={value.showApi} label="Show API calls" onCheckedChange={(showApi) => onChange({ ...value, showApi: showApi === true })} />
    </>
  );
}
