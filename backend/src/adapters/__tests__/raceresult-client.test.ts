import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RaceResultClient, FetchHttpError, FetchTimeoutError } from '../raceresult-client.js';

describe('RaceResultClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchEventPage', () => {
    it('returns HTML body on success', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html>content</html>'),
      } as Response);

      const client = new RaceResultClient();
      const result = await client.fetchEventPage('https://my.raceresult.com/411620/');
      expect(result).toBe('<html>content</html>');
    });

    it('TC-010: throws FetchHttpError on HTTP 404', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const client = new RaceResultClient();
      await expect(
        client.fetchEventPage('https://my.raceresult.com/999999/'),
      ).rejects.toThrow(FetchHttpError);
    });

    it('TC-011: throws FetchTimeoutError when fetch exceeds timeout', async () => {
      vi.mocked(globalThis.fetch).mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const client = new RaceResultClient(50); // 50ms timeout
      await expect(
        client.fetchEventPage('https://my.raceresult.com/411620/'),
      ).rejects.toThrow(FetchTimeoutError);
    });
  });

  describe('fetchParticipants', () => {
    it('TC-021: constructs correct API URL and returns response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('[{"name":"test"}]'),
      } as Response);

      const client = new RaceResultClient();
      const result = await client.fetchParticipants('411620', 'abc123', 'mylist');

      expect(result).toBe('[{"name":"test"}]');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('my-us-1.raceresult.com/411620/participants/list'),
        expect.any(Object),
      );
    });
  });
});
