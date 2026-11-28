/**
 * Automated architectural & repo-rule guardrail tests.
 * Runs deterministically in Vitest (0 LLM tokens) to catch boundary violations early.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());
const SRC_DIR = join(ROOT, 'src');

function normalizeRelPath(filePath: string): string {
  return relative(ROOT, filePath).replaceAll('\\', '/');
}

function collectFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function stripComments(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');
}

function extractImports(source: string): string[] {
  const matches = source.matchAll(
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  );
  return Array.from(matches, (m) => m[1]!).filter(Boolean);
}

describe('architecture & repo-rule guardrails', () => {
  it('keeps src/domain/ and src/engine/ free of UI, service, store, and DOM/storage dependencies', () => {
    const pureDirs = [join(SRC_DIR, 'domain'), join(SRC_DIR, 'engine')];
    const forbiddenImportPatterns = [
      /^preact(\/|$)/,
      /(?:^|\/)(components|services|state)(?:\/|$)/,
    ];
    const forbiddenGlobals = /\b(window|document|localStorage|sessionStorage|navigator)\b/;

    const violations: string[] = [];

    for (const dir of pureDirs) {
      const files = collectFiles(dir, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
      for (const file of files) {
        const rel = normalizeRelPath(file);
        const raw = readFileSync(file, 'utf8');
        const code = stripComments(raw);

        for (const spec of extractImports(code)) {
          if (forbiddenImportPatterns.some((pattern) => pattern.test(spec))) {
            violations.push(`${rel}: forbidden import "${spec}" in pure domain/engine layer`);
          }
        }

        const globalMatch = forbiddenGlobals.exec(code);
        if (globalMatch) {
          violations.push(
            `${rel}: references browser global "${globalMatch[1]}" inside pure domain/engine layer`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('restricts direct localStorage access strictly to src/services/storage.ts (StorageAdapter seam)', () => {
    const files = collectFiles(SRC_DIR, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
    const violations: string[] = [];

    for (const file of files) {
      const rel = normalizeRelPath(file);
      if (rel === 'src/services/storage.ts') continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      if (/\blocalStorage\b/.test(code)) {
        violations.push(`${rel}: direct localStorage access must go through StorageAdapter`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('requires every modal component under src/components/modals/ to use ModalDialog backed by shadcn + Base UI Dialog', () => {
    const modalsDir = join(SRC_DIR, 'components', 'modals');
    const files = collectFiles(modalsDir, (p) => p.endsWith('.tsx'));
    const violations: string[] = [];

    for (const file of files) {
      const rel = normalizeRelPath(file);
      const code = stripComments(readFileSync(file, 'utf8'));
      if (rel.endsWith('/ModalDialog.tsx')) {
        if (!code.includes('@/components/ui/dialog')) {
          violations.push(
            `${rel}: must compose shadcn + Base UI Dialog from @/components/ui/dialog`,
          );
        }
        continue;
      }
      if (!code.includes('<ModalDialog')) {
        violations.push(
          `${rel}: modal must wrap content with <ModalDialog> for ARIA & Escape handling`,
        );
      }
    }

    const uiDialogCode = stripComments(
      readFileSync(join(SRC_DIR, 'components', 'ui', 'dialog.tsx'), 'utf8'),
    );
    if (!uiDialogCode.includes('@base-ui/react/dialog')) {
      violations.push('src/components/ui/dialog.tsx: must wrap @base-ui/react/dialog (ADR-0005)');
    }

    expect(violations).toEqual([]);
  });

  it('forbids raw setInterval timers inside UI components and domain modules', () => {
    const restrictedDirs = [join(SRC_DIR, 'components'), join(SRC_DIR, 'domain')];
    const violations: string[] = [];

    for (const dir of restrictedDirs) {
      const files = collectFiles(dir, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
      for (const file of files) {
        const rel = normalizeRelPath(file);
        const code = stripComments(readFileSync(file, 'utf8'));
        if (/\bsetInterval\s*\(/.test(code)) {
          violations.push(
            `${rel}: interval timers belong in src/engine/timer.ts, not components/domain`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps docs/EXCEPTIONS.md well-formed and ensures any EX-NNN code references are documented', () => {
    const exceptionsPath = join(ROOT, 'docs', 'EXCEPTIONS.md');
    const exceptionsDoc = readFileSync(exceptionsPath, 'utf8');
    const documentedIds = new Set(
      Array.from(exceptionsDoc.matchAll(/\|\s*`(EX-\d{3})`\s*\|/g), (m) => m[1]!),
    );

    expect(documentedIds.size).toBeGreaterThan(0);

    const files = collectFiles(SRC_DIR, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
    const unknownRefs: string[] = [];
    for (const file of files) {
      const rel = normalizeRelPath(file);
      const raw = readFileSync(file, 'utf8');
      for (const match of raw.matchAll(/guideline-exception:\s*(EX-\d{3})/g)) {
        const id = match[1]!;
        if (!documentedIds.has(id)) {
          unknownRefs.push(`${rel}: references undocumented exception ${id}`);
        }
      }
    }

    expect(unknownRefs).toEqual([]);
  });

  it('keeps index.html free of external CDN stylesheet/script URLs for true offline-first behavior', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const externalRefs = Array.from(
      html.matchAll(/\b(?:href|src)=["'](https?:\/\/[^"']+)["']/gi),
    ).map((m) => m[1]!);
    expect(externalRefs).toEqual([]);
  });

  it('isolates browser file I/O and service-worker APIs to src/services/ rather than UI components', () => {
    const componentsDir = join(SRC_DIR, 'components');
    const files = collectFiles(componentsDir, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
    const forbidden = /\b(FileReader|createObjectURL|serviceWorker)\b/;
    const violations: string[] = [];

    for (const file of files) {
      const rel = normalizeRelPath(file);
      const code = stripComments(readFileSync(file, 'utf8'));
      const match = forbidden.exec(code);
      if (match) {
        violations.push(`${rel}: browser I/O API "${match[1]}" must live in src/services/`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('forbids static imports of src/components/stage3d/ outside ExerciseDemonstrator.tsx so Three.js stays lazy-loaded', () => {
    const files = collectFiles(SRC_DIR, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
    const violations: string[] = [];

    for (const file of files) {
      const rel = normalizeRelPath(file);
      if (rel.startsWith('src/components/stage3d/')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));

      for (const spec of extractImports(code)) {
        if (/(?:^|\/)stage3d(?:\/|$)/.test(spec)) {
          violations.push(
            `${rel}: static import "${spec}" pulls Three.js into the eager bundle; use dynamic import() in ExerciseDemonstrator.tsx`,
          );
        }
      }

      if (
        rel !== 'src/components/ExerciseDemonstrator.tsx' &&
        /import\s*\([^)]*stage3d/.test(code)
      ) {
        violations.push(
          `${rel}: only ExerciseDemonstrator.tsx may dynamically import src/components/stage3d/`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it('enforces a hard 500-line ceiling per src/ file (unless explicitly exempted via EX-NNN)', () => {
    const MAX_LINES = 500;
    const files = collectFiles(SRC_DIR, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
    const violations: string[] = [];

    for (const file of files) {
      const rel = normalizeRelPath(file);
      const raw = readFileSync(file, 'utf8');
      if (/guideline-exception:\s*EX-\d{3}/.test(raw)) continue;
      const lineCount = raw.split('\n').length;
      if (lineCount > MAX_LINES) {
        violations.push(
          `${rel}: ${lineCount} lines exceeds hard ${MAX_LINES}-line ceiling (ADR-0007)`,
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
