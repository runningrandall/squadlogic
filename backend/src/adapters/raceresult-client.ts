import type { RaceResultPort } from '../ports/raceresult-port.js';

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchHttpError extends Error {
  public readonly statusCode: number;

  constructor(url: string, statusCode: number) {
    super(`Request to ${url} failed with HTTP ${statusCode}`);
    this.name = 'FetchHttpError';
    this.statusCode = statusCode;
  }
}

export class RaceResultClient implements RaceResultPort {
  private readonly timeoutMs: number;

  constructor(timeoutMs = 8000) {
    this.timeoutMs = timeoutMs;
  }

  async fetchEventPage(url: string): Promise<string> {
    return this.fetchWithTimeout(url);
  }

  async fetchParticipants(
    eventId: string,
    apiKey: string,
    listName: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      key: apiKey,
      listname: listName,
      page: 'participants',
      contest: '0',
      r: 'all',
      l: '0',
    });

    const url = `https://my-us-1.raceresult.com/${eventId}/participants/list?${params.toString()}`;
    return this.fetchWithTimeout(url);
  }

  private async fetchWithTimeout(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new FetchHttpError(url, response.status);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof FetchHttpError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new FetchTimeoutError(url, this.timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
