import { lazy, Suspense } from 'preact/compat';
import type { Exercise } from '../domain/schema';
import { downloadJsonBackup, readBackupFile } from '../services/backup';
import { shallowEqual, useStoreSelector, useWorkoutStore } from '../state/storeContext';
import type { SettingsTab } from './modals/SettingsModal';

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

export interface AppModalsProps {
  newWorkoutModalOpen: boolean;
  libraryModalOpen: boolean;
  exerciseModalOpen: boolean;
  editingExercise: Exercise | null;
  settingsModalOpen: boolean;
  settingsTab: SettingsTab;
  historyModalOpen: boolean;
  onCloseNewWorkout: () => void;
  onManageSpaces: () => void;
  onCloseLibrary: () => void;
  onCloseExercise: () => void;
  onCloseSettings: () => void;
  onCloseHistory: () => void;
}

export function AppModals({
  newWorkoutModalOpen,
  libraryModalOpen,
  exerciseModalOpen,
  editingExercise,
  settingsModalOpen,
  settingsTab,
  historyModalOpen,
  onCloseNewWorkout,
  onManageSpaces,
  onCloseLibrary,
  onCloseExercise,
  onCloseSettings,
  onCloseHistory,
}: AppModalsProps) {
  const store = useWorkoutStore();
  const slice = useStoreSelector(
    (s) => ({
      activeRoutine: s.activeRoutine,
      activeSpace: s.activeSpace,
      spaces: s.data.spaces,
      history: s.data.history,
      voiceSupported: s.voiceSupported,
    }),
    shallowEqual,
  );

  const handleExportJson = (): void => {
    downloadJsonBackup(store.exportJson());
    store.pushToast('Backup JSON downloaded!');
  };

  const handleImportFile = (file: File): void => {
    void readBackupFile(file).then((result) => {
      if (result.ok) {
        store.importJson(result.text);
      } else {
        store.pushToast(result.error, 'error');
      }
    });
  };

  return (
    <Suspense fallback={null}>
      {newWorkoutModalOpen && (
        <NewWorkoutModal
          open={newWorkoutModalOpen}
          currentSettings={slice.activeRoutine.settings}
          userExercises={slice.activeRoutine.exercises}
          spaces={slice.spaces}
          activeSpace={slice.activeSpace}
          onSelectSpace={(spaceId) => store.selectSpace(spaceId)}
          onManageSpaces={onManageSpaces}
          onClose={onCloseNewWorkout}
          onApply={(preset, autoStart) => store.applyWorkoutPreset(preset, { autoStart })}
        />
      )}

      {libraryModalOpen && (
        <ExerciseLibraryModal
          open={libraryModalOpen}
          userExercises={slice.activeRoutine.exercises}
          activeRoutineExerciseIds={slice.activeRoutine.exercises.map((ex) => ex.id)}
          activeSpace={slice.activeSpace}
          demoSpeed={slice.activeRoutine.settings.demoSpeed}
          onClose={onCloseLibrary}
          onPreviewOnStage={(exercise) => store.previewCatalogExercise(exercise)}
          onAddToRoutine={(exercise) => store.addCatalogExercise(exercise)}
        />
      )}

      {exerciseModalOpen && (
        <ExerciseModal
          open={exerciseModalOpen}
          editingExercise={editingExercise}
          onClose={onCloseExercise}
          onSave={(input) => store.saveExercise(input)}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal
          open={settingsModalOpen}
          initialTab={settingsTab}
          settings={slice.activeRoutine.settings}
          voiceSupported={slice.voiceSupported}
          spaces={slice.spaces}
          activeSpaceId={slice.activeSpace.id}
          onClose={onCloseSettings}
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
          history={slice.history}
          onClose={onCloseHistory}
          onLogManualSession={() => store.logManualSession()}
        />
      )}
    </Suspense>
  );
}
