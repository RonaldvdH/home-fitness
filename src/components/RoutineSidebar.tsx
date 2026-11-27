import type { Exercise } from '../domain/schema';

export interface RoutineSidebarProps {
  exercises: readonly Exercise[];
  highlightedExerciseId: string | null;
  onAddExercise: () => void;
  onOpenLibrary: () => void;
  onPreviewExercise: (id: string) => void;
  onMoveExercise: (index: number, delta: -1 | 1) => void;
  onToggleExercise: (id: string) => void;
  onEditExercise: (exercise: Exercise) => void;
  onDeleteExercise: (id: string) => void;
}

export function RoutineSidebar({
  exercises,
  highlightedExerciseId,
  onAddExercise,
  onOpenLibrary,
  onPreviewExercise,
  onMoveExercise,
  onToggleExercise,
  onEditExercise,
  onDeleteExercise,
}: RoutineSidebarProps) {
  return (
    <aside class="lg:col-span-4 min-w-0 flex flex-col gap-4">
      <div class="rounded-3xl bg-slate-900 border border-slate-800/90 p-4 sm:p-5 shadow-xl flex flex-col min-w-0">
        <div class="flex items-center justify-between gap-2 mb-3.5">
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-bold text-white truncate">Your Circuit Routine</h3>
            <p class="text-xs text-slate-400 truncate">
              Tap a move to preview<span class="hidden sm:inline"> • Auto-saved</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onAddExercise}
            class="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 transition active:scale-95 shrink-0"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Exercise</span>
          </button>
        </div>

        <div class="space-y-2.5 max-h-[460px] overflow-y-auto pr-0.5 sm:pr-1">
          {exercises.map((ex, idx) => {
            const isHighlighted = highlightedExerciseId === ex.id;
            return (
              <div
                key={ex.id}
                class={`group p-3 rounded-2xl border transition ${
                  isHighlighted
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : ex.active
                      ? 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/40'
                      : 'bg-slate-950/30 border-slate-800/50 opacity-55'
                }`}
              >
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onPreviewExercise(ex.id)}
                    class="min-w-0 flex-1 text-left focus:outline-none"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-xs font-mono font-bold text-slate-500 shrink-0">
                        {idx + 1}.
                      </span>
                      <h4 class="font-bold text-sm text-white truncate group-hover:text-emerald-300 transition">
                        {ex.name}
                      </h4>
                    </div>
                    <p class="text-xs text-slate-400 truncate pl-5 mt-0.5">{ex.muscleGroup}</p>
                  </button>

                  <div class="flex items-center justify-end gap-1 sm:gap-0.5 shrink-0 pl-5 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => onMoveExercise(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${ex.name} up`}
                      title="Move Up"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        aria-hidden="true"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveExercise(idx, 1)}
                      disabled={idx === exercises.length - 1}
                      aria-label={`Move ${ex.name} down`}
                      title="Move Down"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleExercise(ex.id)}
                      aria-label={ex.active ? `Disable ${ex.name}` : `Enable ${ex.name}`}
                      aria-pressed={ex.active}
                      title={ex.active ? 'Included in Circuit' : 'Excluded'}
                      class={`p-1.5 rounded-lg transition ${
                        ex.active
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-slate-500 bg-slate-800'
                      }`}
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditExercise(ex)}
                      aria-label={`Edit ${ex.name}`}
                      title="Edit"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExercise(ex.id)}
                      aria-label={`Delete ${ex.name}`}
                      title="Delete"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Exercise Library Browser Entry */}
        <div class="mt-4 pt-3.5 border-t border-slate-800">
          <button
            type="button"
            onClick={onOpenLibrary}
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold text-slate-200 hover:text-emerald-300 flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <svg
              class="w-4 h-4 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Browse All Exercises</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
