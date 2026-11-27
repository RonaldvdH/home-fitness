import { useMemo, useState } from 'preact/hooks';
import { buildExercisePool } from '../../domain/presets';
import {
  applySpaceToExercise,
  EQUIPMENT_TAG_LABELS,
  formatDumbbellWeight,
  isExerciseEligibleForSpace,
  type EquipmentTag,
  type Exercise,
  type MuscleGroupTag,
  type WorkoutSpace,
} from '../../domain/schema';
import { AthleteSvg } from '../AthleteSvg';
import { ModalDialog } from './ModalDialog';

export interface ExerciseLibraryModalProps {
  open: boolean;
  userExercises: readonly Exercise[];
  activeRoutineExerciseIds: readonly string[];
  activeSpace: WorkoutSpace;
  demoSpeed: number;
  onClose: () => void;
  onPreviewOnStage: (exercise: Exercise) => void;
  onAddToRoutine: (exercise: Exercise) => void;
}

type MuscleFilter = 'all' | MuscleGroupTag;
type EquipmentFilter = 'all' | 'active-space' | 'bodyweight' | EquipmentTag;

const MUSCLE_FILTERS: readonly { id: MuscleFilter; label: string }[] = [
  { id: 'all', label: 'All Muscles' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' },
  { id: 'abs', label: 'Abs & Core' },
];

export function ExerciseLibraryModal({
  open,
  userExercises,
  activeRoutineExerciseIds,
  activeSpace,
  demoSpeed,
  onClose,
  onPreviewOnStage,
  onAddToRoutine,
}: ExerciseLibraryModalProps) {
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allExercises = useMemo(
    () => buildExercisePool(userExercises).map((ex) => applySpaceToExercise(ex, activeSpace)),
    [userExercises, activeSpace],
  );

  const activeIdSet = useMemo(() => new Set(activeRoutineExerciseIds), [activeRoutineExerciseIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allExercises.filter((ex) => {
      if (muscleFilter !== 'all' && !ex.muscleGroups.includes(muscleFilter)) {
        return false;
      }
      if (equipmentFilter === 'active-space' && !isExerciseEligibleForSpace(ex, activeSpace)) {
        return false;
      } else if (
        equipmentFilter === 'bodyweight' &&
        (ex.equipment.kind !== 'bodyweight' || ex.requiredEquipment.includes('dumbbells'))
      ) {
        return false;
      } else if (
        equipmentFilter !== 'all' &&
        equipmentFilter !== 'active-space' &&
        equipmentFilter !== 'bodyweight' &&
        !ex.requiredEquipment.includes(equipmentFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.label.toLowerCase().includes(q)
      );
    });
  }, [allExercises, query, muscleFilter, equipmentFilter, activeSpace]);

  const selectedExercise = filtered.find((ex) => ex.id === selectedId) ?? filtered[0] ?? null;

  const equipmentFilterOptions: readonly { id: EquipmentFilter; label: string }[] = [
    { id: 'all', label: 'All Gear' },
    { id: 'active-space', label: activeSpace.name },
    { id: 'dumbbells', label: EQUIPMENT_TAG_LABELS.dumbbells },
    { id: 'bands', label: EQUIPMENT_TAG_LABELS.bands },
    { id: 'wall', label: EQUIPMENT_TAG_LABELS.wall },
    { id: 'floor', label: EQUIPMENT_TAG_LABELS.floor },
    { id: 'foam-roller', label: EQUIPMENT_TAG_LABELS['foam-roller'] },
    { id: 'bodyweight', label: 'Bodyweight' },
  ];

  return (
    <ModalDialog
      open={open}
      title={`All Exercises (${allExercises.length})`}
      titleId="modal-library-heading"
      maxWidthClass="max-w-2xl"
      onClose={onClose}
    >
      <div class="space-y-3">
        {/* Search + Filter Controls */}
        <div class="space-y-2">
          <div class="relative">
            <input
              type="search"
              aria-label="Search exercises"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="Search exercises, muscles, bands, wall, foam roller..."
              class="w-full px-3.5 py-2 pr-8 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            {query.length > 0 && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold px-1"
              >
                ×
              </button>
            )}
          </div>

          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by muscle group">
            {MUSCLE_FILTERS.map((opt) => {
              const active = muscleFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMuscleFilter(opt.id)}
                  class={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by equipment">
            {equipmentFilterOptions.map((opt) => {
              const active = equipmentFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setEquipmentFilter(opt.id)}
                  class={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                    active
                      ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live 60 FPS Preview Pane */}
        {selectedExercise ? (
          <div
            data-testid="library-preview-card"
            class="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800"
          >
            <div class="sm:col-span-5 stage-spotlight relative h-48 sm:h-52 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center px-2 pt-2 pb-9">
              <AthleteSvg
                animationType={selectedExercise.animationType}
                speedMultiplier={demoSpeed}
                weightLabel={formatDumbbellWeight(selectedExercise.equipment)}
                variant="flex"
              />
            </div>

            <div class="sm:col-span-7 min-w-0 flex flex-col justify-between gap-2.5">
              <div class="space-y-1.5 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    {selectedExercise.equipment.label}
                  </span>
                  <span class="text-[11px] text-slate-400 truncate">
                    {selectedExercise.muscleGroup}
                  </span>
                </div>
                <h3
                  data-testid="library-preview-title"
                  class="text-base font-extrabold text-white leading-snug"
                >
                  {selectedExercise.name}
                </h3>
                <ol class="space-y-1 text-[11px] text-slate-300 leading-snug list-decimal list-inside">
                  {selectedExercise.steps.slice(0, 3).map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
                {selectedExercise.tip && (
                  <p class="text-[11px] text-amber-300/90 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 leading-snug">
                    <span class="font-bold uppercase text-[10px] text-amber-400 mr-1">Tip:</span>
                    {selectedExercise.tip}
                  </p>
                )}
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onPreviewOnStage(selectedExercise);
                    onClose();
                  }}
                  class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  Preview on Stage
                </button>
                <button
                  type="button"
                  onClick={() => onAddToRoutine(selectedExercise)}
                  class={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeIdSet.has(selectedExercise.id)
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {activeIdSet.has(selectedExercise.id) ? 'In Routine ✓' : '+ Add to Routine'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div class="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-400">
            No exercises match your current search and filters.
          </div>
        )}

        {/* Scrollable Exercise Catalog List */}
        <div>
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span>
              Showing {filtered.length} of {allExercises.length} exercises
            </span>
            <span>Tap any move to preview live</span>
          </div>
          <div
            data-testid="library-exercise-list"
            class="space-y-1.5 max-h-48 overflow-y-auto pr-0.5"
          >
            {filtered.map((ex) => {
              const isSelected = selectedExercise?.id === ex.id;
              const inRoutine = activeIdSet.has(ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedId(ex.id)}
                  class={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="font-bold text-xs sm:text-sm text-white truncate">
                        {ex.name}
                      </span>
                      {inRoutine && (
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p class="text-[11px] text-slate-400 truncate">
                      {ex.equipment.label} • {ex.muscleGroup}
                    </p>
                  </div>
                  <span class="text-[11px] font-semibold text-emerald-400 shrink-0">
                    {isSelected ? 'Viewing' : 'Preview'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
