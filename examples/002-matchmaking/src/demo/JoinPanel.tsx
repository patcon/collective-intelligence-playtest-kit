import { Surface } from '@cloudflare/kumo';
import { JoinQrCode } from '@playtest-kit/ui';

/** Where phones join: a QR code for `/participate` on this same origin. */
export function JoinPanel() {
  return (
    <Surface className="flex flex-col items-center gap-3 rounded-lg p-5">
      <h2 className="self-start text-lg font-semibold">Join as participant</h2>
      <JoinQrCode url={`${window.location.origin}/participate`} />
    </Surface>
  );
}
