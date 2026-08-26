// Test-only helper: returns the actual page count of a generated PDF buffer via
// pdfjs-dist, which is already a backend dependency (used in callup-list-pdf-parser.ts).
// Needs the same DOMMatrix/Path2D no-op polyfills that file installs, since pdfjs-dist's
// module-level init unconditionally references them (browser-only globals, no Node equivalent).
declare global {
  // eslint-disable-next-line no-var
  var pdfjsWorker: { WorkerMessageHandler: unknown } | undefined;
}

function installPdfjsNodePolyfills(): void {
  if (!globalThis.DOMMatrix) {
    class DOMMatrixPolyfill {
      constructor(_init?: unknown) {}
      translate(): this { return this; }
      scale(): this { return this; }
      multiply(): this { return this; }
      multiplySelf(): this { return this; }
      preMultiplySelf(): this { return this; }
      invertSelf(): this { return this; }
    }
    globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix;
  }
  if (!globalThis.Path2D) {
    class Path2DPolyfill {
      addPath(): void {}
    }
    globalThis.Path2D = Path2DPolyfill as unknown as typeof Path2D;
  }
}

async function loadPdf(buffer: Buffer) {
  installPdfjsNodePolyfills();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (!globalThis.pdfjsWorker) {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    globalThis.pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
  }

  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
}

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const doc = await loadPdf(buffer);
  return doc.numPages;
}

// Returns every distinct fill color (as "#rrggbb" hex, in first-use order) that pdfkit's
// setFillRGBColor operator sets while drawing a page. pdfjs's operator list already stores
// this operator's argument as the literal CSS hex string it hands to canvas's fillStyle
// (op code 59 — pdfjs-dist has no stable public export for OPS.setFillRGBColor, so this is a
// pinned magic number), which is exactly what's needed to assert two rects were filled with
// visually distinct colors without doing actual pixel rendering.
const OP_SET_FILL_RGB_COLOR = 59;
export async function getFillColorSequence(buffer: Buffer, pageNum = 1): Promise<string[]> {
  const doc = await loadPdf(buffer);
  const page = await doc.getPage(pageNum);
  const opList = await page.getOperatorList();
  const colors: string[] = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === OP_SET_FILL_RGB_COLOR) {
      const hex = (opList.argsArray[i] as unknown[])[0];
      if (typeof hex === 'string' && colors[colors.length - 1] !== hex) colors.push(hex);
    }
  }
  return colors;
}

// PDFKit compresses content streams by default, so drawn text is not searchable via a
// naive latin1 dump of the raw bytes (only uncompressed object dictionaries are). This
// properly decodes and extracts the actual rendered text of every page, for real
// content assertions in tests.
export async function getPdfText(buffer: Buffer): Promise<string> {
  const doc = await loadPdf(buffer);
  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pageTexts.join('\n');
}

// Same as getPdfText but scoped to a single page — needed when a assertion cares about
// content on one specific page (e.g. the summary page) without also matching the same
// text if it happens to repeat on another page (e.g. the detail page).
export async function getPdfPageText(buffer: Buffer, pageNum: number): Promise<string> {
  const doc = await loadPdf(buffer);
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  return content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
}
