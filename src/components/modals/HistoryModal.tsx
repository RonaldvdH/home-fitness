import { useMemo } from 'preact/hooks';
import { computeHistoryInsights, computeWeightProgressionNudge } from '../../domain/insights';
import type { SessionRecord, WorkoutSpace } from '../../domain/schema';
import { ModalDialog } from './ModalDialog';

export interface HistoryModalProps {
  open: boolean;
  history: readonly SessionRecord[];
  activeSpace?: WorkoutSpace;
  onClose: () => void;
  onLogManualSession: () => void;
  onUpgradeSpaceWeight?: (space: WorkoutSpace, nextKg: number) => void;
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

export function HistoryModal({
  open,
  history,
  activeSpace,
  onClose,
  onLogManualSession,
  onUpgradeSpaceWeight,
}: HistoryModalProps) {
  const insights = useMemo(() => computeHistoryInsights(history), [history]);
  const weightNudge = useMemo(
    () => (activeSpace ? computeWeightProgressionNudge(history, activeSpace) : null),
    [history, activeSpace],
  );

  return (
    <ModalDialog
      open={open}
      title="Workout History & Insights"
      titleId="modal-history-heading"
      onClose={onClose}
    >
      <div class="space-y-4">
        {/* Consistency & Streak Summary */}
        <div data-testid="history-insights" class="grid grid-cols-3 gap-2 text-center">
          <div class="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span class="block font-mono text-lg font-extrabold text-emerald-400 leading-tight">
              {insights.weeklyStreak}w
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Week Streak
            </span>
          </div>
          <div class="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span class="block font-mono text-lg font-extrabold text-white leading-tight">
              {insights.minutesThisWeek}m
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              This Week
            </span>
          </div>
          <div class="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span class="block font-mono text-lg font-extrabold text-sky-300 leading-tight">
              {insights.totalMinutes}m
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              All-Time
            </span>
          </div>
        </div>

        {/* 28-Day Consistency Calendar */}
        <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-300">
              28-Day Consistency
            </span>
            <span
              data-testid="app-version-badge"
              class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono text-[11px] font-semibold text-slate-300 shrink-0"
            >
              {import.meta.env.VITE_APP_VERSION ?? 'dev'}
            </span>
          </div>

          <div
            data-testid="consistency-heatmap"
            class="grid grid-cols-7 gap-1.5"
            role="list"
            aria-label="Last 28 days workout activity"
          >
            {insights.heatmap.map((day) => (
              <div
                key={day.dateKey}
                role="listitem"
                title={`${day.dateKey}: ${day.count} session${day.count === 1 ? '' : 's'}`}
                data-level={day.level}
                class={`h-4 rounded-md border transition ${
                  day.level === 2
                    ? 'bg-emerald-400 border-emerald-300/60'
                    : day.level === 1
                      ? 'bg-emerald-500/45 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800/80'
                }`}
              />
            ))}
          </div>

          {insights.focusBreakdown.length > 0 && (
            <div class="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
              {insights.focusBreakdown.slice(0, 4).map((item) => (
                <span
                  key={item.label}
                  class="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                >
                  {item.label}: <strong class="text-emerald-300 font-mono">{item.count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Gentle Weight Progression Nudge */}
        {weightNudge && activeSpace && onUpgradeSpaceWeight && (
          <div
            data-testid="weight-progression-nudge"
            class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <p class="text-xs font-bold text-emerald-300">
                Ready for {weightNudge.suggestedKg}kg in {weightNudge.spaceName}?
              </p>
              <p class="text-[11px] text-slate-300 mt-0.5">
                {weightNudge.recentSessionCount} recent strength sessions at {weightNudge.currentKg}
                kg. Bump up when it feels smooth!
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpgradeSpaceWeight(activeSpace, weightNudge.suggestedKg)}
              class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-extrabold text-slate-950 shrink-0 transition"
            >
              Set {weightNudge.suggestedKg}kg
            </button>
          </div>
        )}

        {/* Completed Sessions List */}
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

          <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                      <span class="text-slate-400 block truncate">
                        {session.routineName} • {session.rounds}r • {session.exerciseCount} moves
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
      </div>
    </ModalDialog>
  );
}
