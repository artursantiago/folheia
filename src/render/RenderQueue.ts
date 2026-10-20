export interface QueueJob {
  key: string;
  /** Lower runs first. */
  priority: number;
  run: (signal: AbortSignal) => Promise<void>;
}

interface Entry extends QueueJob {
  controller: AbortController;
  seq: number;
}

/**
 * Prioritized, cancelable, pausable work queue. Rendering is expensive and
 * the user can jump around, so stale work must be easy to drop.
 */
export class RenderQueue {
  private pending = new Map<string, Entry>();
  private running = new Map<string, Entry>();
  private paused = false;
  private seq = 0;

  constructor(private readonly concurrency = 1) {}

  /** Adds a job, or updates the priority of one already waiting. Running jobs are left alone. */
  schedule(job: QueueJob) {
    if (this.running.has(job.key)) return;
    const existing = this.pending.get(job.key);
    if (existing) {
      existing.priority = job.priority;
    } else {
      this.pending.set(job.key, { ...job, controller: new AbortController(), seq: this.seq++ });
    }
    this.pump();
  }

  has(key: string) {
    return this.pending.has(key) || this.running.has(key);
  }

  cancel(key: string) {
    this.pending.delete(key);
    this.running.get(key)?.controller.abort();
  }

  /** Cancels every pending or running job whose key fails the test. */
  retain(keep: (key: string) => boolean) {
    for (const key of [...this.pending.keys(), ...this.running.keys()]) {
      if (!keep(key)) this.cancel(key);
    }
  }

  /** While paused (e.g. during a page flip) nothing new starts. */
  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.pump();
  }

  clear() {
    this.retain(() => false);
  }

  get size() {
    return this.pending.size + this.running.size;
  }

  private next(): Entry | undefined {
    let best: Entry | undefined;
    for (const entry of this.pending.values()) {
      if (
        !best ||
        entry.priority < best.priority ||
        (entry.priority === best.priority && entry.seq < best.seq)
      ) {
        best = entry;
      }
    }
    return best;
  }

  private pump() {
    while (!this.paused && this.running.size < this.concurrency) {
      const entry = this.next();
      if (!entry) return;
      this.pending.delete(entry.key);
      this.running.set(entry.key, entry);
      entry
        .run(entry.controller.signal)
        .catch(() => undefined)
        .finally(() => {
          if (this.running.get(entry.key) === entry) this.running.delete(entry.key);
          this.pump();
        });
    }
  }
}
