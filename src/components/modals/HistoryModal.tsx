import type { SessionRecord } from '../../domain/schema';
import { ModalDialog } from './ModalDialog';

export interface HistoryModalProps {
  open: boolean;
  history: readonly SessionRecord[];
  onClose: () => void;
  onLogManualSession: () => void;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatSessionDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return dateFormatter.format(new Date(parsed));
}

export function HistoryModal({ open, history, onClose, onLogManualSession }: HistoryModalProps) {
  return (
    <ModalDialog
      open={open}
      title="Workout History & Local Storage"
      titleId="modal-history-heading"
      onClose={onClose}
    >
      <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-5">
        <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
          Offline-First Persistence
        </span>
        <p class="text-sm font-semibold text-white mt-0.5">Saved automatically on this device</p>
        <p class="text-xs text-slate-400 mt-1 leading-relaxed">
          Your exercises, timer settings, and workout history stay stored in browser storage and
          work 100% offline. Use Export JSON in the routine panel to back up or transfer between
          devices.
        </p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2.5">
          <h4 class="text-sm font-bold text-white">Completed Sessions ({history.length})</h4>
          <button
            type="button"
            onClick={onLogManualSession}
            class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            + Log Completed Workout
          </button>
        </div>

        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p class="text-xs text-slate-500 py-5 text-center border border-dashed border-slate-800 rounded-xl">
              No completed sessions logged yet. Finish a circuit or click &ldquo;+ Log Completed
              Workout&rdquo;.
            </p>
          ) : (
            history.map((session) => {
              const durationMin = Math.max(1, Math.round(session.durationSec / 60));
              return (
                <div
                  key={session.id}
                  class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div class="min-w-0">
                    <span class="font-semibold text-white block truncate">
                      {formatSessionDate(session.completedAt)}
                    </span>
                    <span class="text-slate-400">
                      {session.rounds} rounds • {session.exerciseCount} exercises
                      {session.source === 'manual' ? ' • Manual' : ''}
                    </span>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold shrink-0">
                    {durationMin} min
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
