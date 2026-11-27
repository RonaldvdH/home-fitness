import { useState } from 'preact/hooks';
import {
  EQUIPMENT_TAG_LABELS,
  EQUIPMENT_TAGS,
  type EquipmentTag,
  type WorkoutSpace,
} from '../../domain/schema';
import type { SpaceFormInput } from '../../state/workoutStore';
import { ModalDialog } from './ModalDialog';

export interface SpacesModalProps {
  open: boolean;
  spaces: readonly WorkoutSpace[];
  activeSpaceId: string;
  onClose: () => void;
  onSelectSpace: (spaceId: string) => void;
  onSaveSpace: (input: SpaceFormInput) => WorkoutSpace | null;
  onDeleteSpace: (spaceId: string) => void;
}

export function SpacesModal({
  open,
  spaces,
  activeSpaceId,
  onClose,
  onSelectSpace,
  onSaveSpace,
  onDeleteSpace,
}: SpacesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState('');
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentTag[]>(['wall', 'floor']);
  const [dumbbellWeightKg, setDumbbellWeightKg] = useState(5);

  const isFormOpen = isAdding || editingId !== null;

  const openAddForm = (): void => {
    setEditingId(null);
    setIsAdding(true);
    setName('');
    setAvailableEquipment(['wall', 'floor']);
    setDumbbellWeightKg(5);
  };

  const openEditForm = (space: WorkoutSpace): void => {
    setIsAdding(false);
    setEditingId(space.id);
    setName(space.name);
    setAvailableEquipment([...space.availableEquipment]);
    setDumbbellWeightKg(space.dumbbellWeightKg);
  };

  const closeForm = (): void => {
    setIsAdding(false);
    setEditingId(null);
  };

  const toggleEquipment = (tag: EquipmentTag): void => {
    setAvailableEquipment((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      const next = new Set([...prev, tag]);
      return EQUIPMENT_TAGS.filter((t) => next.has(t));
    });
  };

  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!name.trim()) return;

    const saved = onSaveSpace({
      ...(editingId ? { id: editingId } : {}),
      name,
      availableEquipment,
      dumbbellWeightKg: Number.isFinite(dumbbellWeightKg) ? dumbbellWeightKg : 5,
    });
    if (saved) {
      closeForm();
    }
  };

  const hasDumbbells = availableEquipment.includes('dumbbells');

  return (
    <ModalDialog
      open={open}
      title={
        isFormOpen ? (editingId ? 'Edit Workout Space' : 'New Workout Space') : 'Workout Spaces'
      }
      titleId="modal-spaces-heading"
      maxWidthClass="max-w-lg"
      onClose={onClose}
    >
      {isFormOpen ? (
        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label for="space-name" class="block text-xs font-semibold text-slate-300 mb-1">
              Space Name *
            </label>
            <input
              id="space-name"
              type="text"
              required
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Home Gym, Living Room, Hotel Room"
              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <span class="block text-xs font-semibold text-slate-300 mb-1.5">
              Available Equipment & Surfaces
            </span>
            <div class="grid grid-cols-2 gap-2">
              {EQUIPMENT_TAGS.map((tag) => {
                const selected = availableEquipment.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleEquipment(tag)}
                    class={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between gap-2 ${
                      selected
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span class="truncate">{EQUIPMENT_TAG_LABELS[tag]}</span>
                    <span
                      class={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 text-[10px] ${
                        selected
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                          : 'border-slate-700'
                      }`}
                      aria-hidden="true"
                    >
                      {selected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <p class="text-[11px] text-slate-500 mt-1.5">
              Standing bodyweight exercises are always eligible even with no equipment selected.
            </p>
          </div>

          {hasDumbbells && (
            <div>
              <label
                for="space-dumbbell-weight"
                class="block text-xs font-semibold text-slate-300 mb-1"
              >
                Dumbbell Weight (kg)
              </label>
              <div class="flex items-center gap-2">
                <input
                  id="space-dumbbell-weight"
                  type="number"
                  min={1}
                  max={50}
                  step={0.5}
                  value={dumbbellWeightKg}
                  onInput={(e) => setDumbbellWeightKg(Number((e.target as HTMLInputElement).value))}
                  class="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                <span class="text-xs text-slate-400">
                  Automatically updates weight labels & 2D/3D cues in this space.
                </span>
              </div>
            </div>
          )}

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={closeForm}
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 transition"
            >
              Save Space
            </button>
          </div>
        </form>
      ) : (
        <div class="space-y-3">
          <p class="text-xs text-slate-400">
            Match generated workouts to the equipment available where you train.
          </p>

          <div class="space-y-2.5 max-h-[55vh] overflow-y-auto pr-0.5">
            {spaces.map((space) => {
              const isActive = space.id === activeSpaceId;
              return (
                <div
                  key={space.id}
                  data-testid={`space-card-${space.id}`}
                  class={`p-3 rounded-2xl border transition ${
                    isActive
                      ? 'bg-emerald-950/35 border-emerald-500/50'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="font-bold text-sm text-white truncate">{space.name}</span>
                      {isActive && (
                        <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectSpace(space.id)}
                          class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition"
                        >
                          Use
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditForm(space)}
                        aria-label={`Edit ${space.name}`}
                        class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 transition"
                      >
                        Edit
                      </button>
                      {spaces.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteSpace(space.id)}
                          aria-label={`Delete ${space.name}`}
                          class="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-1.5">
                    {space.availableEquipment.length > 0 ? (
                      space.availableEquipment.map((tag) => (
                        <span
                          key={tag}
                          class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                        >
                          {tag === 'dumbbells'
                            ? `${space.dumbbellWeightKg}kg Dumbbells`
                            : EQUIPMENT_TAG_LABELS[tag]}
                        </span>
                      ))
                    ) : (
                      <span class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                        Standing Bodyweight Only
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={openAddForm}
              class="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-bold text-emerald-300 transition"
            >
              + Add Workout Space
            </button>
            <button
              type="button"
              onClick={onClose}
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
