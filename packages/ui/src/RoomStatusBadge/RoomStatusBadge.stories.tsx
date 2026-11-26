import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { RoomStatusBadge } from './RoomStatusBadge.tsx';

const meta = {
  title: 'Room/RoomStatusBadge',
  component: RoomStatusBadge,
  args: { status: 'open' },
} satisfies Meta<typeof RoomStatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('connected')).toBeVisible();
  },
};

export const Connecting: Story = {
  args: { status: 'connecting' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('connecting')).toBeVisible();
  },
};

export const Reconnecting: Story = {
  args: { status: 'closed' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('reconnecting')).toBeVisible();
  },
};
