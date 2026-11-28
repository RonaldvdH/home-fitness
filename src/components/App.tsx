import { lazy, Suspense } from 'preact/compat';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Exercise } from '../domain/schema';
import {
  createFoldableController,
  type FloorModeSnapshot,
  type FoldableController,
} from '../services/foldable';
import {
  createWorkoutStore,
  type WorkoutStore,
  type WorkoutStoreState,
} from '../state/workoutStore';
import { HeaderBar } from './HeaderBar';
import type { SettingsTab } from './modals/SettingsModal';
import { RoutineSidebar } from './RoutineSidebar';
import { ToastHost } from './ToastHost';
import { WorkoutStage } from './WorkoutStage';

const FlexWorkoutView = lazy(() =>
  import('./FlexWorkoutView').then((m) => ({ default: m.FlexWorkoutView })),
);
const ExerciseLibraryModal = lazy(() =>
  import('./modals/ExerciseLibraryModal').then((m) => ({ default: m.ExerciseLibraryModal })),
);
const ExerciseModal = lazy(() =>
  import('./modals/ExerciseModal').then((m) => ({ default: m.ExerciseModal })),
);
const HistoryModal = lazy(() =>
  import('./modals/HistoryModal').then((m) => ({ default: m.HistoryModal })),
);
const NewWorkoutModal = lazy(() =>
  import('./modals/NewWorkoutModal').then((m) => ({ default: m.NewWorkoutModal })),
);
const SettingsModal = lazy(() =>
  import('./modals/SettingsModal').then((m) => ({ default: m.SettingsModal })),
);

export interface AppProps {
  store?: WorkoutStore;
  foldable?: FoldableController;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function App({ store: externalStore, foldable: externalFoldable }: AppProps) {
  const store = useMemo(() => externalStore ?? createWorkoutStore(), [externalStore]);
  const [state, setState] = useState<WorkoutStoreState>(() => store.getState());

  const foldable = useMemo(
    () => externalFoldable ?? createFoldableController(),
    [externalFoldable],
  );
  const [floorMode, setFloorMode] = useState<FloorModeSnapshot>(() => foldable.getSnapshot());

  const [newWorkoutModalOpen, setNewWorkoutModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [returnToNewWorkout, setReturnToNewWorkout] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const anyModalOpen =
    newWorkoutModalOpen ||
    libraryModalOpen ||
    exerciseModalOpen ||
    settingsModalOpen ||
    historyModalOpen;

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

  useEffect(() => {
    setFloorMode(foldable.getSnapshot());
    const unsubscribe = foldable.subscribe(() => {
      setFloorMode(foldable.getSnapshot());
    });
    return () => {
      unsubscribe();
      if (!externalFoldable) {
        foldable.destroy();
      }
    };
  }, [foldable, externalFoldable]);

  // Lock page scroll while Floor Mode is active so bottom-half taps never shift the top visual.
  useEffect(() => {
    document.documentElement.classList.toggle('floor-mode-active', floorMode.active);
    return () => {
      document.documentElement.classList.remove('floor-mode-active');
    };
  }, [floorMode.active]);

  // Hands-free keyboard controls (Space, Arrows, M, V, F, Escape) when no modal/input is focused.
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
      } else if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        foldable.toggleFloorMode();
      } else if (event.key === 'Escape' && foldable.getSnapshot().active) {
        event.preventDefault();
        foldable.exitFloorMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, foldable, anyModalOpen]);

  const currentStep = state.timeline[state.timer.currentIndex] ?? state.timeline[0]!;
  const nextStep = state.timeline[state.timer.currentIndex + 1] ?? null;

  const previewExercise =
    state.previewExerciseItem ??
    (state.previewExerciseId
      ? (state.activeRoutine.exercises.find((ex) => ex.id === state.previewExerciseId) ?? null)
      : null);

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
      {floorMode.active ? (
        <Suspense fallback={null}>
          <FlexWorkoutView
            routineName={state.activeRoutine.name}
            currentStep={currentStep}
            nextStep={nextStep}
            totalSteps={state.timeline.length}
            timer={state.timer}
            previewExercise={previewExercise}
            demoSpeed={state.activeRoutine.settings.demoSpeed}
            stagePaused={anyModalOpen}
            soundEnabled={state.activeRoutine.settings.soundEnabled}
            voiceEnabled={state.activeRoutine.settings.voiceEnabled}
            voiceSupported={state.voiceSupported}
            activation={floorMode.activation}
            onToggleStartPause={() => store.toggleStartPause()}
            onPrev={() => store.stepBackward()}
            onNext={() => store.stepForward()}
            onReset={() => store.reset()}
            onToggleSound={() => store.toggleSound()}
            onToggleVoice={() => store.toggleVoice()}
            onSetDemoSpeed={(speed) => store.setDemoSpeed(speed)}
            onClearPreview={() => store.clearPreview()}
            onOpenNewWorkout={() => setNewWorkoutModalOpen(true)}
            onExitFloorMode={() => foldable.exitFloorMode()}
          />
        </Suspense>
      ) : (
        <>
          <HeaderBar
            currentStep={currentStep}
            totalSteps={state.timeline.length}
            totalDurationSec={state.totalDurationSec}
            timer={state.timer}
            soundEnabled={state.activeRoutine.settings.soundEnabled}
            voiceEnabled={state.activeRoutine.settings.voiceEnabled}
            voiceSupported={state.voiceSupported}
            floorModeActive={floorMode.active}
            onToggleStartPause={() => store.toggleStartPause()}
            onPrev={() => store.stepBackward()}
            onNext={() => store.stepForward()}
            onReset={() => store.reset()}
            onToggleSound={() => store.toggleSound()}
            onToggleVoice={() => store.toggleVoice()}
            onToggleFloorMode={() => foldable.toggleFloorMode()}
            onOpenSettings={() => {
              setReturnToNewWorkout(false);
              setSettingsTab('general');
              setSettingsModalOpen(true);
            }}
            onOpenHistory={() => setHistoryModalOpen(true)}
          />

          <main class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <WorkoutStage
              routineName={state.activeRoutine.name}
              currentStep={currentStep}
              nextStep={nextStep}
              previewExercise={previewExercise}
              isCompleted={state.timer.status === 'completed'}
              demoSpeed={state.activeRoutine.settings.demoSpeed}
              stagePaused={anyModalOpen}
              onSetDemoSpeed={(speed) => store.setDemoSpeed(speed)}
              onClearPreview={() => store.clearPreview()}
              onOpenNewWorkout={() => setNewWorkoutModalOpen(true)}
            />

            <RoutineSidebar
              exercises={state.activeRoutine.exercises}
              highlightedExerciseId={highlightedExerciseId}
              onAddExercise={() => {
                setEditingExercise(null);
                setExerciseModalOpen(true);
              }}
              onOpenLibrary={() => setLibraryModalOpen(true)}
              onPreviewExercise={(id) => store.previewExercise(id)}
              onMoveExercise={(index, delta) => store.moveExercise(index, delta)}
              onToggleExercise={(id) => store.toggleExerciseActive(id)}
              onEditExercise={(exercise) => {
                setEditingExercise(exercise);
                setExerciseModalOpen(true);
              }}
              onDeleteExercise={(id) => store.deleteExercise(id)}
            />
          </main>
        </>
      )}

      <Suspense fallback={null}>
        {newWorkoutModalOpen && (
          <NewWorkoutModal
            open={newWorkoutModalOpen}
            currentSettings={state.activeRoutine.settings}
            userExercises={state.activeRoutine.exercises}
            spaces={state.data.spaces}
            activeSpace={state.activeSpace}
            onSelectSpace={(spaceId) => store.selectSpace(spaceId)}
            onManageSpaces={() => {
              setReturnToNewWorkout(true);
              setNewWorkoutModalOpen(false);
              setSettingsTab('spaces');
              setSettingsModalOpen(true);
            }}
            onClose={() => setNewWorkoutModalOpen(false)}
            onApply={(preset, autoStart) => store.applyWorkoutPreset(preset, { autoStart })}
          />
        )}

        {libraryModalOpen && (
          <ExerciseLibraryModal
            open={libraryModalOpen}
            userExercises={state.activeRoutine.exercises}
            activeRoutineExerciseIds={state.activeRoutine.exercises.map((ex) => ex.id)}
            activeSpace={state.activeSpace}
            demoSpeed={state.activeRoutine.settings.demoSpeed}
            onClose={() => setLibraryModalOpen(false)}
            onPreviewOnStage={(exercise) => store.previewCatalogExercise(exercise)}
            onAddToRoutine={(exercise) => store.addCatalogExercise(exercise)}
          />
        )}

        {exerciseModalOpen && (
          <ExerciseModal
            open={exerciseModalOpen}
            editingExercise={editingExercise}
            onClose={() => setExerciseModalOpen(false)}
            onSave={(input) => store.saveExercise(input)}
          />
        )}

        {settingsModalOpen && (
          <SettingsModal
            open={settingsModalOpen}
            initialTab={settingsTab}
            settings={state.activeRoutine.settings}
            voiceSupported={state.voiceSupported}
            spaces={state.data.spaces}
            activeSpaceId={state.activeSpace.id}
            onClose={() => {
              setSettingsModalOpen(false);
              if (returnToNewWorkout) {
                setReturnToNewWorkout(false);
                setNewWorkoutModalOpen(true);
              }
            }}
            onSave={(next) => store.updateSettings(next)}
            onTestBeep={() => store.testAudioBeep()}
            onTestVoice={() => store.testVoice()}
            onSelectSpace={(spaceId) => store.selectSpace(spaceId)}
            onSaveSpace={(input) => store.saveSpace(input)}
            onDeleteSpace={(spaceId) => store.deleteSpace(spaceId)}
            onExportJson={handleExportJson}
            onImportFile={handleImportFile}
            onRestoreDefaults={() => store.restoreDefaultExercises()}
          />
        )}

        {historyModalOpen && (
          <HistoryModal
            open={historyModalOpen}
            history={state.data.history}
            onClose={() => setHistoryModalOpen(false)}
            onLogManualSession={() => store.logManualSession()}
          />
        )}
      </Suspense>

      <ToastHost toasts={state.toasts} onDismiss={(id) => store.dismissToast(id)} />
    </>
  );
}
