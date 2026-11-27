import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_DIR = resolve(process.cwd(), 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');

// Initial entry budgets (gzipped bytes).
// Heavy Phase 4 subsystems (Three.js) must live in lazy async chunks rather than the entry chunk.
const MAX_ENTRY_JS_GZIP_BYTES = 55 * 1024;
const MAX_ENTRY_CSS_GZIP_BYTES = 15 * 1024;

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function measureGzipBytes(filePath) {
  const buf = readFileSync(filePath);
  return { raw: buf.byteLength, gzip: gzipSync(buf, { level: 9 }).byteLength };
}

function main() {
  const indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');

  const scriptMatch = /<script[^>]*type="module"[^>]*src="([^"]+)"/i.exec(indexHtml);
  const cssMatch = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/i.exec(indexHtml);

  if (!scriptMatch?.[1]) {
    console.error(
      'Bundle budget check failed: could not locate entry module script in dist/index.html.',
    );
    process.exit(1);
  }

  const entryJsName = scriptMatch[1].split('/').pop();
  const entryJsPath = join(ASSETS_DIR, entryJsName);
  const entryJs = measureGzipBytes(entryJsPath);

  let entryCss = null;
  let entryCssName = null;
  if (cssMatch?.[1]) {
    entryCssName = cssMatch[1].split('/').pop();
    entryCss = measureGzipBytes(join(ASSETS_DIR, entryCssName));
  }

  const assetFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'));
  const asyncJsChunks = assetFiles.filter((f) => f !== entryJsName);

  console.log('Bundle Size Budget Report:');
  console.log(
    `  Entry JS  (${entryJsName}): ${formatKB(entryJs.raw)} raw | ${formatKB(entryJs.gzip)} gzip (limit: ${formatKB(MAX_ENTRY_JS_GZIP_BYTES)})`,
  );
  if (entryCss && entryCssName) {
    console.log(
      `  Entry CSS (${entryCssName}): ${formatKB(entryCss.raw)} raw | ${formatKB(entryCss.gzip)} gzip (limit: ${formatKB(MAX_ENTRY_CSS_GZIP_BYTES)})`,
    );
  }
  if (asyncJsChunks.length > 0) {
    console.log(`  Lazy JS chunks: ${asyncJsChunks.length} (${asyncJsChunks.join(', ')})`);
  }

  const failures = [];
  if (entryJs.gzip > MAX_ENTRY_JS_GZIP_BYTES) {
    failures.push(
      `Entry JS gzip size (${formatKB(entryJs.gzip)}) exceeds budget (${formatKB(MAX_ENTRY_JS_GZIP_BYTES)}). Lazy-load heavy dependencies into async chunks.`,
    );
  }
  if (entryCss && entryCss.gzip > MAX_ENTRY_CSS_GZIP_BYTES) {
    failures.push(
      `Entry CSS gzip size (${formatKB(entryCss.gzip)}) exceeds budget (${formatKB(MAX_ENTRY_CSS_GZIP_BYTES)}).`,
    );
  }

  if (failures.length > 0) {
    for (const msg of failures) {
      console.error(`ERROR: ${msg}`);
    }
    process.exit(1);
  }

  console.log('Bundle size budget check passed.');
}

main();
