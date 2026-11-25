import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Exercise } from '../domain/schema';
import {
  createWorkoutStore,
  type WorkoutStore,
  type WorkoutStoreState,
} from '../state/workoutStore';
import { HeaderBar } from './HeaderBar';
import { RoutineSidebar } from './RoutineSidebar';
import { ToastHost } from './ToastHost';
import { WorkoutStage } from './WorkoutStage';
import { ExerciseModal } from './modals/ExerciseModal';
import { HistoryModal } from './modals/HistoryModal';
import { SettingsModal } from './modals/SettingsModal';

export interface AppProps {
  store?: WorkoutStore;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function App({ store: externalStore }: AppProps) {
  const store = useMemo(() => externalStore ?? createWorkoutStore(), [externalStore]);
  const [state, setState] = useState<WorkoutStoreState>(() => store.getState());

  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const anyModalOpen = exerciseModalOpen || settingsModalOpen || historyModalOpen;

  useEffect(() => {
    setState(store.getState());
    const unsubscribe = store.subscribe(() => {
      setState(store.getState());
    });
    return () => {
      unsubscribe();
      if (!externalStore) {
        store.destroy();
      }
    };
  }, [store, externalStore]);

  // Hands-free keyboard controls (Space, Arrows, M, V) when no modal/input is focused.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (anyModalOpen || isEditableElement(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === 'Space') {
        event.preventDefault();
        store.toggleStartPause();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        store.stepForward();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        store.stepBackward();
      } else if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        store.toggleSound();
      } else if ((event.key === 'v' || event.key === 'V') && store.getState().voiceSupported) {
        event.preventDefault();
        store.toggleVoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, anyModalOpen]);

  const currentStep = state.timeline[state.timer.currentIndex] ?? state.timeline[0]!;
  const nextStep = state.timeline[state.timer.currentIndex + 1] ?? null;

  const previewExercise = state.previewExerciseId
    ? (state.activeRoutine.exercises.find((ex) => ex.id === state.previewExerciseId) ?? null)
    : null;

  const highlightedExerciseId = previewExercise
    ? previewExercise.id
    : currentStep.phase === 'WORK'
      ? currentStep.exercise.id
      : null;

  const handleExportJson = (): void => {
    const payload = store.exportJson();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dumbbell-circuit-backup.json';
    link.click();
    URL.revokeObjectURL(url);
    store.pushToast('Backup JSON downloaded!');
  };

  const handleImportFile = (file: File): void => {
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        if (typeof reader.result === 'string') {
          store.importJson(reader.result);
        } else {
          store.pushToast('Could not read backup file.', 'error');
        }
      },
      { once: true },
    );
    reader.readAsText(file);
  };

  return (
    <>
      <HeaderBar
        currentStep={currentStep}
        totalSteps={state.timeline.length}
        totalDurationSec={state.totalDurationSec}
        timer={state.timer}
        soundEnabled={state.activeRoutine.settings.soundEnabled}
        voiceEnabled={state.activeRoutine.settings.voiceEnabled}
        voiceSupported={state.voiceSupported}
        onToggleStartPause={() => store.toggleStartPause()}
        onPrev={() => store.stepBackward()}
        onNext={() => store.stepForward()}
        onReset={() => store.reset()}
        onToggleSound={() => store.toggleSound()}
        onToggleVoice={() => store.toggleVoice()}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenHistory={() => setHistoryModalOpen(true)}
      />

      <main class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        <WorkoutStage
          currentStep={currentStep}
          nextStep={nextStep}
          previewExercise={previewExercise}
          isCompleted={state.timer.status === 'completed'}
          demoSpeed={state.activeRoutine.settings.demoSpeed}
          onSetDemoSpeed={(speed) => store.setDemoSpeed(speed)}
          onClearPreview={() => store.clearPreview()}
        />

        <RoutineSidebar
          exercises={state.activeRoutine.exercises}
          highlightedExerciseId={highlightedExerciseId}
          onAddExercise={() => {
            setEditingExercise(null);
            setExerciseModalOpen(true);
          }}
          onPreviewExercise={(id) => store.previewExercise(id)}
          onMoveExercise={(index, delta) => store.moveExercise(index, delta)}
          onToggleExercise={(id) => store.toggleExerciseActive(id)}
          onEditExercise={(exercise) => {
            setEditingExercise(exercise);
            setExerciseModalOpen(true);
          }}
          onDeleteExercise={(id) => store.deleteExercise(id)}
          onExportJson={handleExportJson}
          onImportFile={handleImportFile}
          onRestoreDefaults={() => store.restoreDefaultExercises()}
        />
      </main>

      <ExerciseModal
        open={exerciseModalOpen}
        editingExercise={editingExercise}
        onClose={() => setExerciseModalOpen(false)}
        onSave={(input) => store.saveExercise(input)}
      />

      <SettingsModal
        open={settingsModalOpen}
        settings={state.activeRoutine.settings}
        voiceSupported={state.voiceSupported}
        onClose={() => setSettingsModalOpen(false)}
        onSave={(next) => store.updateSettings(next)}
        onTestBeep={() => store.testAudioBeep()}
        onTestVoice={() => store.testVoice()}
      />

      <HistoryModal
        open={historyModalOpen}
        history={state.data.history}
        onClose={() => setHistoryModalOpen(false)}
        onLogManualSession={() => store.logManualSession()}
      />

      <ToastHost toasts={state.toasts} onDismiss={(id) => store.dismissToast(id)} />
    </>
  );
}
