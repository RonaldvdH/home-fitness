/**
 * Browser file I/O helpers for JSON workout backup export & import.
 * Isolates Blob, Object URL, and FileReader usage from UI components.
 */

import { readRawStorageSnapshot } from './storage';

export const BACKUP_FILENAME = 'home-fitness-backup.json';
export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export type ReadBackupFileResult = { ok: true; text: string } | { ok: false; error: string };

export function downloadJsonBackup(payload: string, filename = BACKUP_FILENAME): void {
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRawStorageBackup(): boolean {
  const snapshot = readRawStorageSnapshot();
  if (!snapshot) return false;
  downloadJsonBackup(snapshot, 'home-fitness-recovery-backup.json');
  return true;
}

export function readBackupFile(file: File): Promise<ReadBackupFileResult> {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    return Promise.resolve({
      ok: false,
      error: 'Backup file is too large (maximum 2 MB).',
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        if (typeof reader.result === 'string') {
          resolve({ ok: true, text: reader.result });
        } else {
          resolve({ ok: false, error: 'Could not read backup file.' });
        }
      },
      { once: true },
    );
    reader.addEventListener(
      'error',
      () => {
        resolve({ ok: false, error: 'Failed to read backup file.' });
      },
      { once: true },
    );
    reader.readAsText(file);
  });
}
