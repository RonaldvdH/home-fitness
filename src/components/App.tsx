import { lazy, Suspense } from 'preact/compat';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Exercise } from '../domain/schema';
import {
  createFoldableController,
  type FloorModeSnapshot,
  type FoldableController,
} from '../services/foldable';
import {
  createPwaUpdateController,
  describeUpdateCheckResult,
  type PwaUpdateController,
  type PwaUpdateSnapshot,
} from '../services/pwa';
import {
  shallowEqual,
  useStoreSelector,
  useWorkoutStore,
  WorkoutStoreProvider,
} from '../state/storeContext';
import {
  createWorkoutStore,
  type WorkoutStore,
  type WorkoutStoreState,
} from '../state/workoutStore';
import { AppModals, type ActiveModal } from './AppModals';
import { HeaderBar } from './HeaderBar';
import { RoutineSidebar } from './RoutineSidebar';
import { ToastHost } from './ToastHost';
import { WorkoutStage } from './WorkoutStage';

const FlexWorkoutView = lazy(() =>
  import('./FlexWorkoutView').then((m) => ({ default: m.FlexWorkoutView })),
);

export interface AppProps {
  store?: WorkoutStore;
  foldable?: FoldableController;
  pwa?: PwaUpdateController;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function selectPreviewExercise(state: WorkoutStoreState): Exercise | null {
  return (
    state.previewExerciseItem ??
    (state.previewExerciseId
      ? (state.activeRoutine.exercises.find((ex) => ex.id === state.previewExerciseId) ?? null)
      : null)
  );
}

function PwaUpdateBridge({
  pwa,
  pwaState,
}: {
  pwa: PwaUpdateController;
  pwaState: PwaUpdateSnapshot;
}) {
  const store = useWorkoutStore();
  const isRunning = useStoreSelector((s) => s.timer.status === 'running');
  const updateToastIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canPrompt = pwaState.updateAvailable && !isRunning;
    if (canPrompt && updateToastIdRef.current === null) {
      updateToastIdRef.current = store.pushToast('Update available', 'info', {
        persistent: true,
        action: {
          label: 'Refresh',
          onClick: () => {
            void pwa.applyUpdate();
          },
        },
      });
    } else if (!pwaState.updateAvailable && updateToastIdRef.current !== null) {
      store.dismissToast(updateToastIdRef.current);
      updateToastIdRef.current = null;
    }
  }, [pwaState.updateAvailable, isRunning, store, pwa]);

  return null;
}

function ConnectedHeaderBar({
  floorModeActive,
  onToggleFloorMode,
  onOpenSettings,
  onOpenHistory,
}: {
  floorModeActive: boolean;
  onToggleFloorMode: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}) {
  const store = useWorkoutStore();
  const slice = useStoreSelector(
    (s) => ({
      currentStep: s.timeline[s.timer.currentIndex] ?? s.timeline[0]!,
      totalSteps: s.timeline.length,
      totalDurationSec: s.totalDurationSec,
      timer: s.timer,
      soundEnabled: s.activeRoutine.settings.soundEnabled,
      voiceEnabled: s.activeRoutine.settings.voiceEnabled,
      voiceSupported: s.voiceSupported,
    }),
    shallowEqual,
  );

  return (
    <HeaderBar
      currentStep={slice.currentStep}
      totalSteps={slice.totalSteps}
      totalDurationSec={slice.totalDurationSec}
      timer={slice.timer}
      soundEnabled={slice.soundEnabled}
      voiceEnabled={slice.voiceEnabled}
      voiceSupported={slice.voiceSupported}
      floorModeActive={floorModeActive}
      onToggleStartPause={() => store.toggleStartPause()}
      onPrev={() => store.stepBackward()}
      onNext={() => store.stepForward()}
      onReset={() => store.reset()}
      onToggleSound={() => store.toggleSound()}
      onToggleVoice={() => store.toggleVoice()}
      onToggleFloorMode={onToggleFloorMode}
      onOpenSettings={onOpenSettings}
      onOpenHistory={onOpenHistory}
    />
  );
}

function ConnectedWorkoutStage({
  stagePaused,
  onOpenNewWorkout,
}: {
  stagePaused: boolean;
  onOpenNewWorkout: () => void;
}) {
  const store = useWorkoutStore();
  const slice = useStoreSelector(
    (s) => ({
      routineName: s.activeRoutine.name,
      currentStep: s.timeline[s.timer.currentIndex] ?? s.timeline[0]!,
      nextStep: s.timeline[s.timer.currentIndex + 1] ?? null,
      previewExercise: selectPreviewExercise(s),
      isCompleted: s.timer.status === 'completed',
      demoSpeed: s.activeRoutine.settings.demoSpeed,
    }),
    shallowEqual,
  );

  return (
    <WorkoutStage
      routineName={slice.routineName}
      currentStep={slice.currentStep}
      nextStep={slice.nextStep}
      previewExercise={slice.previewExercise}
      isCompleted={slice.isCompleted}
      demoSpeed={slice.demoSpeed}
      stagePaused={stagePaused}
      onSetDemoSpeed={(speed) => store.setDemoSpeed(speed)}
      onClearPreview={() => store.clearPreview()}
      onOpenNewWorkout={onOpenNewWorkout}
    />
  );
}

function ConnectedRoutineSidebar({
  onAddExercise,
  onOpenLibrary,
  onEditExercise,
}: {
  onAddExercise: () => void;
  onOpenLibrary: () => void;
  onEditExercise: (exercise: Exercise) => void;
}) {
  const store = useWorkoutStore();
  const slice = useStoreSelector((s) => {
    const currentStep = s.timeline[s.timer.currentIndex] ?? s.timeline[0]!;
    const preview = selectPreviewExercise(s);
    const highlightedExerciseId = preview
      ? preview.id
      : currentStep.phase === 'WORK'
        ? currentStep.exercise.id
        : null;
    return {
      exercises: s.activeRoutine.exercises,
      highlightedExerciseId,
    };
  }, shallowEqual);

  return (
    <RoutineSidebar
      exercises={slice.exercises}
      highlightedExerciseId={slice.highlightedExerciseId}
      onAddExercise={onAddExercise}
      onOpenLibrary={onOpenLibrary}
      onPreviewExercise={(id) => store.previewExercise(id)}
      onMoveExercise={(index, delta) => store.moveExercise(index, delta)}
      onToggleExercise={(id) => store.toggleExerciseActive(id)}
      onEditExercise={onEditExercise}
      onDeleteExercise={(id) => store.deleteExercise(id)}
    />
  );
}

function ConnectedFlexView({
  floorMode,
  stagePaused,
  onOpenNewWorkout,
  onExitFloorMode,
}: {
  floorMode: FloorModeSnapshot;
  stagePaused: boolean;
  onOpenNewWorkout: () => void;
  onExitFloorMode: () => void;
}) {
  const store = useWorkoutStore();
  const slice = useStoreSelector(
    (s) => ({
      routineName: s.activeRoutine.name,
      currentStep: s.timeline[s.timer.currentIndex] ?? s.timeline[0]!,
      nextStep: s.timeline[s.timer.currentIndex + 1] ?? null,
      totalSteps: s.timeline.length,
      timer: s.timer,
      previewExercise: selectPreviewExercise(s),
      demoSpeed: s.activeRoutine.settings.demoSpeed,
      soundEnabled: s.activeRoutine.settings.soundEnabled,
      voiceEnabled: s.activeRoutine.settings.voiceEnabled,
      voiceSupported: s.voiceSupported,
    }),
    shallowEqual,
  );

  return (
    <Suspense fallback={null}>
      <FlexWorkoutView
        routineName={slice.routineName}
        currentStep={slice.currentStep}
        nextStep={slice.nextStep}
        totalSteps={slice.totalSteps}
        timer={slice.timer}
        previewExercise={slice.previewExercise}
        demoSpeed={slice.demoSpeed}
        stagePaused={stagePaused}
        soundEnabled={slice.soundEnabled}
        voiceEnabled={slice.voiceEnabled}
        voiceSupported={slice.voiceSupported}
        activation={floorMode.activation}
        onToggleStartPause={() => store.toggleStartPause()}
        onPrev={() => store.stepBackward()}
        onNext={() => store.stepForward()}
        onReset={() => store.reset()}
        onToggleSound={() => store.toggleSound()}
        onToggleVoice={() => store.toggleVoice()}
        onSetDemoSpeed={(speed) => store.setDemoSpeed(speed)}
        onClearPreview={() => store.clearPreview()}
        onOpenNewWorkout={onOpenNewWorkout}
        onExitFloorMode={onExitFloorMode}
      />
    </Suspense>
  );
}

function ConnectedToastHost() {
  const store = useWorkoutStore();
  const toasts = useStoreSelector((s) => s.toasts);
  return <ToastHost toasts={toasts} onDismiss={(id) => store.dismissToast(id)} />;
}

export function App({
  store: externalStore,
  foldable: externalFoldable,
  pwa: externalPwa,
}: AppProps) {
  const store = useMemo(() => externalStore ?? createWorkoutStore(), [externalStore]);
  const foldable = useMemo(
    () => externalFoldable ?? createFoldableController(),
    [externalFoldable],
  );
  const [floorMode, setFloorMode] = useState<FloorModeSnapshot>(() => foldable.getSnapshot());

  const pwa = useMemo(() => externalPwa ?? createPwaUpdateController(), [externalPwa]);
  const [pwaState, setPwaState] = useState<PwaUpdateSnapshot>(() => pwa.getSnapshot());

  const [modal, setModal] = useState<ActiveModal>({ kind: 'none' });
  const anyModalOpen = modal.kind !== 'none';

  useEffect(() => {
    return () => {
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

  useEffect(() => {
    setPwaState(pwa.getSnapshot());
    const unsubscribe = pwa.subscribe(() => {
      setPwaState(pwa.getSnapshot());
    });
    return () => {
      unsubscribe();
      if (!externalPwa) {
        pwa.destroy();
      }
    };
  }, [pwa, externalPwa]);

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

  const handleCheckForUpdate = () => {
    if (pwaState.updateAvailable) {
      void pwa.applyUpdate();
      return;
    }
    void pwa.checkForUpdate().then((result) => {
      const { message, tone } = describeUpdateCheckResult(result);
      store.pushToast(message, tone);
    });
  };

  const handleForceReload = () => {
    void pwa.forceReload();
  };

  return (
    <WorkoutStoreProvider store={store}>
      <PwaUpdateBridge pwa={pwa} pwaState={pwaState} />

      {floorMode.active ? (
        <ConnectedFlexView
          floorMode={floorMode}
          stagePaused={anyModalOpen}
          onOpenNewWorkout={() => setModal({ kind: 'new-workout' })}
          onExitFloorMode={() => foldable.exitFloorMode()}
        />
      ) : (
        <>
          <ConnectedHeaderBar
            floorModeActive={floorMode.active}
            onToggleFloorMode={() => foldable.toggleFloorMode()}
            onOpenSettings={() => setModal({ kind: 'settings', tab: 'general' })}
            onOpenHistory={() => setModal({ kind: 'history' })}
          />

          <main class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <ConnectedWorkoutStage
              stagePaused={anyModalOpen}
              onOpenNewWorkout={() => setModal({ kind: 'new-workout' })}
            />

            <ConnectedRoutineSidebar
              onAddExercise={() => setModal({ kind: 'exercise', editing: null })}
              onOpenLibrary={() => setModal({ kind: 'library' })}
              onEditExercise={(exercise) => setModal({ kind: 'exercise', editing: exercise })}
            />
          </main>
        </>
      )}

      <AppModals
        modal={modal}
        onChangeModal={setModal}
        updateAvailable={pwaState.updateAvailable}
        onCheckForUpdate={handleCheckForUpdate}
        onForceReload={handleForceReload}
      />

      <ConnectedToastHost />
    </WorkoutStoreProvider>
  );
}
