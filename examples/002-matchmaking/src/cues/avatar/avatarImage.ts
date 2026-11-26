import { shapes, thumbs } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import type { AvatarCue } from './avatarCue.ts';

/** The avatar as an SVG data URI, drawn here on the device: no request leaves the phone. */
export function avatarImage({ style, seed }: AvatarCue): string {
  const avatar = style === 'shapes' ? createAvatar(shapes, { seed }) : createAvatar(thumbs, { seed });
  return avatar.toDataUri();
}
