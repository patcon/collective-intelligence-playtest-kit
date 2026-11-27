import { Tooltip } from '@cloudflare/kumo';

/** "N seen", which on hover or focus lists the seen card ids in the order they were drawn. */
export function SeenCount({ seen }: { seen: ReadonlyArray<string> }) {
  const label = `${seen.length} seen`;
  if (seen.length === 0) {
    return <span>{label}</span>;
  }
  return (
    <Tooltip
      content={`Seen: ${seen.map((id) => `#${id}`).join(', ')}`}
      delay={150}
      render={<button className="cursor-help underline decoration-dotted underline-offset-2" type="button" />}
    >
      {label}
    </Tooltip>
  );
}
