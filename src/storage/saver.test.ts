import { createSaver, flushOnLeave } from './saver';

describe('createSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes only the latest value once things are still', () => {
    const write = vi.fn(async () => undefined);
    const saver = createSaver(write, 1000);
    saver.schedule(2);
    vi.advanceTimersByTime(600);
    saver.schedule(3);
    vi.advanceTimersByTime(600);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(write).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('writes right away on flush, and only once', () => {
    const write = vi.fn(async () => undefined);
    const saver = createSaver(write, 1000);
    saver.schedule(5);
    saver.flush();
    saver.flush();
    vi.advanceTimersByTime(2000);
    expect(write).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('flushes when the page is hidden or left', () => {
    const write = vi.fn(async () => undefined);
    const saver = createSaver(write, 1000);
    const stop = flushOnLeave(saver);
    saver.schedule(7);
    window.dispatchEvent(new Event('pagehide'));
    expect(write).toHaveBeenCalledWith(7);
    stop();
    saver.schedule(8);
    window.dispatchEvent(new Event('pagehide'));
    expect(write).toHaveBeenCalledTimes(1);
  });
});
