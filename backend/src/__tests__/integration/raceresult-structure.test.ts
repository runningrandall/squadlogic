/**
 * IT-006 — RaceResult Page Structure Validation
 *
 * Contract test / canary that validates the RaceResult page structure
 * hasn't changed in ways that would break our parser.
 *
 * Run with: pnpm --filter backend run test -- --run raceresult-structure
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Skip in regular test runs — this hits a live external service.
// Run explicitly: pnpm --filter backend run test -- --run raceresult-structure
const SKIP = !process.env.RUN_INTEGRATION_TESTS;
const describeIntegration = SKIP ? describe.skip : describe;
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Baseline {
  capturedAt: string;
  eventId: string;
  structure: {
    jsonLd: {
      expectedFields: string[];
      locationType: string;
    };
    rrPublish: {
      initPattern: string;
      expectedArgCount: number;
    };
    participantApi: {
      baseUrl: string;
      pathPattern: string;
      requiredParams: string[];
    };
  };
}

const baseline: Baseline = JSON.parse(
  readFileSync(resolve(__dirname, '../fixtures/raceresult-baseline.json'), 'utf-8'),
);

const EVENT_URL = `https://my.raceresult.com/${baseline.eventId}/`;
const RRPUBLISH_LOAD_URL = 'https://my.raceresult.com/RRPublish/load.js';

describeIntegration.sequential('RaceResult Page Structure Contract', () => {
  let html: string;
  let response: Response;

  beforeAll(async () => {
    response = await fetch(EVENT_URL, {
      headers: {
        'User-Agent': 'Switchback-StructureValidator/1.0',
        Accept: 'text/html',
      },
    });
    html = await response.text();
  }, 15000);

  // ---------------------------------------------------------------------------
  // Phase 1 — HTML Structure
  // ---------------------------------------------------------------------------
  describe('Phase 1 — HTML Structure', () => {
    it('should return HTTP 200 with text/html content-type', () => {
      expect(response.status).toBe(200);
      const contentType = response.headers.get('content-type') ?? '';
      expect(contentType.toLowerCase()).toContain('text/html');
    });

    it('should contain a JSON-LD script block with required fields', () => {
      // Extract JSON-LD block
      const jsonLdMatch = html.match(
        /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
      );
      expect(jsonLdMatch).not.toBeNull();

      const jsonLd = JSON.parse(jsonLdMatch![1]);

      // Assert all expected fields are present
      for (const field of baseline.structure.jsonLd.expectedFields) {
        expect(jsonLd).toHaveProperty(field);
      }

      // Assert location is the expected type
      if (baseline.structure.jsonLd.locationType === 'object') {
        expect(typeof jsonLd.location).toBe('object');
        expect(jsonLd.location).not.toBeNull();
      }
    });

    it('should contain RRPublish initialization script', () => {
      const initPattern = baseline.structure.rrPublish.initPattern;
      expect(html).toContain(initPattern);

      // Extract the full RRPublish constructor call and count arguments
      const rrpMatch = html.match(/new\s+RRPublish\(([^)]+)\)/);
      expect(rrpMatch).not.toBeNull();

      // Count arguments by splitting on commas (respecting nested parens/strings)
      const argsStr = rrpMatch![1];
      const args = splitArgs(argsStr);
      expect(args.length).toBe(baseline.structure.rrPublish.expectedArgCount);
    });

    it('should serve /RRPublish/load.js with HTTP 200', async () => {
      const loadJsResponse = await fetch(RRPUBLISH_LOAD_URL, {
        headers: {
          'User-Agent': 'Switchback-StructureValidator/1.0',
        },
      });
      expect(loadJsResponse.status).toBe(200);
    }, 15000);
  });

  // ---------------------------------------------------------------------------
  // Phase 2 — API Contract
  // ---------------------------------------------------------------------------
  describe('Phase 2 — API Contract', () => {
    it('should contain the event ID in RRPublish initialization', () => {
      const eventIdPattern = new RegExp(
        `new\\s+RRPublish\\([^,]+,\\s*${baseline.eventId}\\s*,`,
      );
      expect(html).toMatch(eventIdPattern);
    });

    it('should reference participant API endpoint pattern in page or scripts', async () => {
      // The participant API pattern may be embedded in the page source or in
      // the loaded RRPublish JS bundle. Check the page first, then fall back
      // to checking the JS bundle.
      const participantPattern = /participants/i;
      const hasInPage = participantPattern.test(html);

      if (!hasInPage) {
        // Fetch the RRPublish load.js to check for API patterns
        const loadJsResponse = await fetch(RRPUBLISH_LOAD_URL, {
          headers: { 'User-Agent': 'Switchback-StructureValidator/1.0' },
        });
        const loadJs = await loadJsResponse.text();
        expect(loadJs).toMatch(participantPattern);
      } else {
        expect(hasInPage).toBe(true);
      }
    }, 15000);

    it('should contain a recognizable API key or hash pattern', () => {
      // RRPublish init typically passes the event ID and view identifier.
      // The view identifier (e.g. 'participants') serves as the key for
      // loading result lists.
      const rrpMatch = html.match(/new\s+RRPublish\(([^)]+)\)/);
      expect(rrpMatch).not.toBeNull();

      const args = splitArgs(rrpMatch![1]);
      // The third argument is the view/key identifier (e.g., 'participants')
      const viewKey = args[2]?.trim().replace(/['"]/g, '');
      expect(viewKey).toBeTruthy();
      expect(viewKey!.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 3 — Drift Detection
  // ---------------------------------------------------------------------------
  describe('Phase 3 — Drift Detection', () => {
    it('should have JSON-LD field names matching baseline', () => {
      const jsonLdMatch = html.match(
        /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
      );
      expect(jsonLdMatch).not.toBeNull();

      const jsonLd = JSON.parse(jsonLdMatch![1]);
      const actualFields = Object.keys(jsonLd);

      for (const expectedField of baseline.structure.jsonLd.expectedFields) {
        expect(
          actualFields,
          `JSON-LD drift: missing field "${expectedField}"`,
        ).toContain(expectedField);
      }
    });

    it('should have RRPublish init pattern matching baseline', () => {
      const { initPattern, expectedArgCount } = baseline.structure.rrPublish;

      // Verify the init pattern is still used
      expect(html, `RRPublish drift: "${initPattern}" not found in page`).toContain(
        initPattern,
      );

      // Verify argument count hasn't changed
      const rrpMatch = html.match(/new\s+RRPublish\(([^)]+)\)/);
      expect(rrpMatch, 'RRPublish drift: constructor call not found').not.toBeNull();

      const args = splitArgs(rrpMatch![1]);
      expect(
        args.length,
        `RRPublish drift: expected ${expectedArgCount} args, got ${args.length}`,
      ).toBe(expectedArgCount);
    });

    it('should have JSON-LD location type matching baseline', () => {
      const jsonLdMatch = html.match(
        /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
      );
      expect(jsonLdMatch).not.toBeNull();

      const jsonLd = JSON.parse(jsonLdMatch![1]);

      if (baseline.structure.jsonLd.locationType === 'object') {
        expect(
          typeof jsonLd.location,
          'JSON-LD drift: location is no longer an object',
        ).toBe('object');
      }
    });
  });
});

/**
 * Split a function argument string on top-level commas,
 * respecting nested parentheses and quoted strings.
 */
function splitArgs(argsStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';
  let inString: string | null = null;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];

    if (inString) {
      current += ch;
      if (ch === inString && argsStr[i - 1] !== '\\') {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      depth++;
      current += ch;
      continue;
    }

    if (ch === ')') {
      depth--;
      current += ch;
      continue;
    }

    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}
