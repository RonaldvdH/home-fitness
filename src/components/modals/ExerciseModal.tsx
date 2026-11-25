import { useEffect, useState } from 'preact/hooks';
import type { AnimationId, Exercise } from '../../domain/schema';
import { ANIMATION_OPTIONS } from '../../engine/animations';
import type { ExerciseFormInput } from '../../state/workoutStore';
import { ModalDialog } from './ModalDialog';

export interface ExerciseModalProps {
  open: boolean;
  editingExercise: Exercise | null;
  onClose: () => void;
  onSave: (input: ExerciseFormInput) => void;
}

export function ExerciseModal({ open, editingExercise, onClose, onSave }: ExerciseModalProps) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipmentLabel, setEquipmentLabel] = useState('2x 5kg Dumbbells');
  const [animationType, setAnimationType] = useState<AnimationId>('overhead-press');
  const [step1, setStep1] = useState('');
  const [step2, setStep2] = useState('');
  const [step3, setStep3] = useState('');
  const [tip, setTip] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingExercise) {
      setName(editingExercise.name);
      setMuscleGroup(editingExercise.muscleGroup);
      setEquipmentLabel(editingExercise.equipment.label);
      setAnimationType(editingExercise.animationType);
      setStep1(editingExercise.steps[0] ?? '');
      setStep2(editingExercise.steps[1] ?? '');
      setStep3(editingExercise.steps[2] ?? '');
      setTip(editingExercise.tip ?? '');
    } else {
      setName('');
      setMuscleGroup('');
      setEquipmentLabel('2x 5kg Dumbbells');
      setAnimationType('overhead-press');
      setStep1('');
      setStep2('');
      setStep3('');
      setTip('');
    }
  }, [open, editingExercise]);

  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!name.trim() || !muscleGroup.trim()) return;

    onSave({
      ...(editingExercise ? { id: editingExercise.id } : {}),
      name,
      muscleGroup,
      equipment: equipmentLabel.trim() || '2x 5kg Dumbbells',
      animationType,
      steps: [step1, step2, step3].filter((step) => step.trim().length > 0),
      tip,
    });
    onClose();
  };

  return (
    <ModalDialog
      open={open}
      title={editingExercise ? 'Edit Exercise' : 'Add Dumbbell Exercise'}
      titleId="modal-exercise-heading"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} class="space-y-3.5">
        <div>
          <label for="field-ex-name" class="block text-xs font-semibold text-slate-300 mb-1">
            Exercise Name *
          </label>
          <input
            id="field-ex-name"
            type="text"
            required
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g., Dumbbell Lateral Raises"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="field-ex-muscles" class="block text-xs font-semibold text-slate-300 mb-1">
              Target Muscles *
            </label>
            <input
              id="field-ex-muscles"
              type="text"
              required
              value={muscleGroup}
              onInput={(e) => setMuscleGroup((e.target as HTMLInputElement).value)}
              placeholder="e.g., Side Deltoids"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label for="field-ex-anim" class="block text-xs font-semibold text-slate-300 mb-1">
              60 FPS Animation Template
            </label>
            <select
              id="field-ex-anim"
              value={animationType}
              onChange={(e) =>
                setAnimationType((e.target as HTMLSelectElement).value as AnimationId)
              }
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {ANIMATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label for="field-ex-equipment" class="block text-xs font-semibold text-slate-300 mb-1">
            Equipment & Weight
          </label>
          <input
            id="field-ex-equipment"
            type="text"
            value={equipmentLabel}
            onInput={(e) => setEquipmentLabel((e.target as HTMLInputElement).value)}
            placeholder="e.g., 2x 5kg Dumbbells • Standing"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label for="field-ex-step1" class="block text-xs font-semibold text-slate-300 mb-1">
            Step 1 (Setup & Posture) *
          </label>
          <input
            id="field-ex-step1"
            type="text"
            required
            value={step1}
            onInput={(e) => setStep1((e.target as HTMLInputElement).value)}
            placeholder="Stand tall holding dumbbells at your sides..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label for="field-ex-step2" class="block text-xs font-semibold text-slate-300 mb-1">
            Step 2 (Execution) *
          </label>
          <input
            id="field-ex-step2"
            type="text"
            required
            value={step2}
            onInput={(e) => setStep2((e.target as HTMLInputElement).value)}
            placeholder="Raise arms smoothly to shoulder level with soft elbows..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label for="field-ex-step3" class="block text-xs font-semibold text-slate-300 mb-1">
            Step 3 (Controlled Return) *
          </label>
          <input
            id="field-ex-step3"
            type="text"
            required
            value={step3}
            onInput={(e) => setStep3((e.target as HTMLInputElement).value)}
            placeholder="Lower with a 2-second count back to starting position..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label for="field-ex-tip" class="block text-xs font-semibold text-slate-300 mb-1">
            Form Tip (Optional)
          </label>
          <input
            id="field-ex-tip"
            type="text"
            value={tip}
            onInput={(e) => setTip((e.target as HTMLInputElement).value)}
            placeholder="Keep shoulders down away from your ears."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-bold text-slate-950 transition"
          >
            Save Exercise
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
