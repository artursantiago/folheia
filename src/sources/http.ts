import { rangeTotal, webNetwork, type Network, type NetworkResponse } from '../platform/network';
import { SourceError } from './types';

/**
 * Ranged HTTP reads shared by every format, through the platform Network.
 * Many CORS servers expose Content-Range but not Accept-Ranges, so we detect
 * support ourselves.
 */
export async function fetchRange(
  url: string,
  begin: number,
  end: number,
  network: Network = webNetwork,
): Promise<NetworkResponse> {
  try {
    return await network.request({ url, range: { begin, end } });
  } catch (error) {
    throw new SourceError('network', 'Could not download the file', error);
  }
}

export interface RangeProbe {
  /** Total size, when the server honors ranges. */
  length: number | undefined;
  /** The first bytes (or the whole file when ranges aren't supported). */
  head: Uint8Array;
}

export async function probe(
  url: string,
  chunk: number,
  network: Network = webNetwork,
): Promise<RangeProbe> {
  const response = await fetchRange(url, 0, chunk, network);
  if (!response.ok) throw new SourceError('http', `The server answered ${response.status}`);
  return { length: rangeTotal(response), head: new Uint8Array(response.body) };
}

/** Reader for unzipit and friends: random access over HTTP ranges. */
export class HttpRangeReader {
  constructor(
    private readonly url: string,
    private readonly length: number,
    private readonly network: Network = webNetwork,
  ) {}

  async getLength() {
    return this.length;
  }

  async read(offset: number, size: number): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetchRange(this.url, offset, offset + size, this.network);
    if (response.status !== 206)
      throw new SourceError('http', `Range request failed: ${response.status}`);
    return new Uint8Array(response.body);
  }
}
