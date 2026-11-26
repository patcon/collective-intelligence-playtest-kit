import { WebHaptics } from 'web-haptics';

/**
 * Whether this phone vibrates for a haptics cue: it has the Vibration API (Android, mostly), and the
 * page wasn't opened with `?haptics=sound`, which tries out the iPhone's buzzing sound on any phone.
 */
export const CAN_VIBRATE = WebHaptics.isSupported && new URLSearchParams(window.location.search).get('haptics') !== 'sound';
