import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StartScreen } from './StartScreen.tsx';

const meta = {
  title: 'Phone/StartScreen',
  component: StartScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Matchmaking',
    instruction: 'Tap start, then wait for the emcee.',
    warning: null,
    onStart: fn(),
  },
} satisfies Meta<typeof StartScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Tap to start' }));
    await expect(args.onStart).toHaveBeenCalledOnce();
  },
};

export const WithWarning: Story = {
  args: { warning: 'Tilt needs a secure (https) page, and this one isn’t.', startLabel: 'Start anyway' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/secure \(https\) page/)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Start anyway' })).toBeVisible();
  },
};
