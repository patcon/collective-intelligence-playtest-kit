import { Button } from '@cloudflare/kumo';
import type { ButtonProps } from '@cloudflare/kumo';
import { CircleIcon, RecordIcon, TargetIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { FollowMode } from '../types.ts';

/** Per follow mode: the mode the button steps to next, and how the button shows it (neutral / blue / red, as in v9). */
const FOLLOW_MODES: Readonly<
  Record<
    FollowMode,
    { next: FollowMode; label: string; icon: ReactNode; variant: ButtonProps['variant'] }
  >
> = {
  static: { next: 'tracking', label: 'Static', icon: <TargetIcon />, variant: 'secondary' },
  tracking: { next: 'following', label: 'Tracking', icon: <RecordIcon />, variant: 'primary' },
  following: {
    next: 'static',
    label: 'Following',
    icon: <CircleIcon weight="fill" />,
    variant: 'destructive',
  },
};

/** Shows the follow mode; a click steps to the next one (static, tracking, following). */
export default function FollowButton({
  mode,
  onChange,
}: {
  mode: FollowMode;
  onChange: (next: FollowMode) => void;
}) {
  const follow = FOLLOW_MODES[mode];
  return (
    <Button
      size="sm"
      variant={follow.variant}
      icon={follow.icon}
      className="absolute bottom-2 left-2 z-10 select-none"
      onClick={(e) => {
        // Not a click on the scene behind it
        e.stopPropagation();
        onChange(follow.next);
      }}
    >
      {follow.label}
    </Button>
  );
}
