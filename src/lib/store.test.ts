import { createStore } from './store';

describe('createStore', () => {
  it('notifies subscribers on change only', () => {
    const store = createStore(1);
    const calls: number[] = [];
    const off = store.subscribe(() => calls.push(store.get()));
    store.set(2);
    store.set(2);
    store.set((n) => n + 1);
    off();
    store.set(10);
    expect(calls).toEqual([2, 3]);
    expect(store.get()).toBe(10);
  });
});
