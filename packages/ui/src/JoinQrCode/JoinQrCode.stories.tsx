import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { JoinQrCode } from './JoinQrCode.tsx';

const URL = 'https://example.test/participate';

const meta = {
  title: 'Host/JoinQrCode',
  component: JoinQrCode,
  args: { url: URL },
} satisfies Meta<typeof JoinQrCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { name: `QR code for ${URL}` })).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/svg\+xml/),
    );
    await expect(canvas.getByRole('link', { name: URL })).toHaveAttribute('href', URL);
  },
};
