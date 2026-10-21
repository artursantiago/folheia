import { memoryNetwork } from '../platform/network';
import { HttpRangeReader, probe } from './http';

const file = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
const url = 'https://books.example/a.pdf';

describe('http reads', () => {
  it('probes the size and the first bytes when the server honors ranges', async () => {
    const network = memoryNetwork({ [url]: file });
    const result = await probe(url, 10, network);
    expect(result.length).toBe(100);
    expect([...result.head]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(network.requests[0]?.range).toEqual({ begin: 0, end: 10 });
  });

  it('keeps the whole file when the server ignores ranges', async () => {
    const result = await probe(url, 10, memoryNetwork({ [url]: file }, { ranges: false }));
    expect(result.length).toBeUndefined();
    expect(result.head.length).toBe(100);
  });

  it('reads any slice for unzipit, and fails on HTTP errors', async () => {
    const reader = new HttpRangeReader(url, 100, memoryNetwork({ [url]: file }));
    expect([...(await reader.read(95, 5))]).toEqual([95, 96, 97, 98, 99]);
    await expect(
      probe('https://books.example/missing', 10, memoryNetwork({})),
    ).rejects.toMatchObject({
      code: 'http',
    });
  });
});
