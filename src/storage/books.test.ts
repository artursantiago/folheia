import { memoryStorage } from '../platform/storage';
import { BookMemory } from './books';

describe('BookMemory', () => {
  it('remembers the last page and stamps one entry per day', () => {
    const memory = new BookMemory(memoryStorage());
    memory.recordProgress('a', 1, 10, new Date('2026-10-02T10:00:00Z'));
    memory.recordProgress('a', 1, 34, new Date('2026-10-02T11:00:00Z'));
    memory.recordProgress('a', 34, 61, new Date('2026-10-11T10:00:00Z'));
    expect(memory.get('a')).toEqual({
      lastPage: 61,
      direction: undefined,
      history: [
        { date: '2026-10-02', fromPage: 1, toPage: 34 },
        { date: '2026-10-11', fromPage: 34, toPage: 61 },
      ],
    });
  });

  it('survives corrupt storage', () => {
    const storage = memoryStorage();
    storage.set('books', '{oops');
    expect(new BookMemory(storage).get('x')).toBeUndefined();
  });

  it('keeps a reading direction override', () => {
    const memory = new BookMemory(memoryStorage());
    memory.update('m', { direction: 'rtl' });
    expect(memory.get('m')?.direction).toBe('rtl');
  });
});
