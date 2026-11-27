/**
 * Automated architectural & repo-rule guardrail tests.
 * Runs deterministically in Vitest (0 LLM tokens) to catch boundary violations early.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());
const SRC_DIR = join(ROOT, 'src');

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
        const rel = relative(ROOT, file);
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
      const rel = relative(ROOT, file);
      if (rel === 'src/services/storage.ts') continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      if (/\blocalStorage\b/.test(code)) {
        violations.push(`${rel}: direct localStorage access must go through StorageAdapter`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('requires every modal component under src/components/modals/ to use ModalDialog', () => {
    const modalsDir = join(SRC_DIR, 'components', 'modals');
    const files = collectFiles(modalsDir, (p) => p.endsWith('.tsx'));
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file);
      if (rel.endsWith('/ModalDialog.tsx')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      if (!code.includes('<ModalDialog')) {
        violations.push(
          `${rel}: modal must wrap content with <ModalDialog> for ARIA & Escape handling`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it('forbids raw setInterval timers inside UI components and domain modules', () => {
    const restrictedDirs = [join(SRC_DIR, 'components'), join(SRC_DIR, 'domain')];
    const violations: string[] = [];

    for (const dir of restrictedDirs) {
      const files = collectFiles(dir, (p) => p.endsWith('.ts') || p.endsWith('.tsx'));
      for (const file of files) {
        const rel = relative(ROOT, file);
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
      const rel = relative(ROOT, file);
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
});
