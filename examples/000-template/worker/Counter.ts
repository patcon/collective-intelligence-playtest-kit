import { DurableObject } from 'cloudflare:workers';

/** One count, kept in Durable Object storage so it outlasts restarts and is shared by every visitor. */
export class Counter extends DurableObject {
  async read(): Promise<number> {
    return (await this.ctx.storage.get<number>('count')) ?? 0;
  }

  async increment(): Promise<number> {
    const count = (await this.read()) + 1;
    await this.ctx.storage.put('count', count);
    return count;
  }
}
