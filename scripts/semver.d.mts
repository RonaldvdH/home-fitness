export const ALLOWED_TYPES: readonly string[];

export interface ParsedConventionalCommit {
  valid: boolean;
  type: string | null;
  scope: string | null;
  breaking: boolean;
  subject: string;
}

export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
}

export interface NextVersionResult extends ParsedConventionalCommit {
  current: string;
  next: string;
  bump: 'major' | 'minor' | 'patch' | 'none';
  shouldRelease: boolean;
}

export function parseConventionalCommit(rawMessage: string): ParsedConventionalCommit;
export function parseSemverTag(rawTag: string): SemverParts;
export function computeNextVersion(currentTag: string, commitMessage: string): NextVersionResult;
