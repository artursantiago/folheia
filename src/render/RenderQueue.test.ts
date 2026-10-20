import { RenderQueue } from './RenderQueue';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function job(key: string, priority: number, log: string[]) {
  return {
    key,
    priority,
    run: async (signal: AbortSignal) => {
      await tick();
      log.push(signal.aborted ? `${key}:aborted` : key);
    },
  };
}

describe('RenderQueue', () => {
  it('runs jobs by priority, then insertion order', async () => {
    const log: string[] = [];
    const queue = new RenderQueue(1);
    queue.pause();
    queue.schedule(job('far', 5, log));
    queue.schedule(job('next', 1, log));
    queue.schedule(job('current', 0, log));
    queue.schedule(job('prev', 1, log));
    queue.resume();
    await vi.waitFor(() => expect(log).toHaveLength(4));
    expect(log).toEqual(['current', 'next', 'prev', 'far']);
  });

  it('updates the priority of a waiting job instead of duplicating it', async () => {
    const log: string[] = [];
    const queue = new RenderQueue(1);
    queue.pause();
    queue.schedule(job('a', 5, log));
    queue.schedule(job('b', 3, log));
    queue.schedule(job('a', 0, log));
    expect(queue.size).toBe(2);
    queue.resume();
    await vi.waitFor(() => expect(log).toHaveLength(2));
    expect(log).toEqual(['a', 'b']);
  });

  it('aborts running jobs and drops pending ones that are no longer wanted', async () => {
    const log: string[] = [];
    const queue = new RenderQueue(1);
    queue.schedule(job('running', 0, log));
    queue.schedule(job('stale', 1, log));
    queue.retain((key) => key === 'keep');
    queue.schedule(job('keep', 2, log));
    await vi.waitFor(() => expect(log).toHaveLength(2));
    expect(log).toEqual(['running:aborted', 'keep']);
  });

  it('starts nothing while paused', async () => {
    const log: string[] = [];
    const queue = new RenderQueue(1);
    queue.pause();
    queue.schedule(job('a', 0, log));
    await tick();
    await tick();
    expect(log).toEqual([]);
    queue.resume();
    await vi.waitFor(() => expect(log).toEqual(['a']));
  });
});
