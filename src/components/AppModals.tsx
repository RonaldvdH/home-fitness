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

export type ActiveModal =
  | { kind: 'none' }
  | { kind: 'new-workout' }
  | { kind: 'library' }
  | { kind: 'exercise'; editing: Exercise | null }
  | { kind: 'settings'; tab: SettingsTab; returnToNewWorkout?: boolean }
  | { kind: 'history' };

export interface AppModalsProps {
  modal: ActiveModal;
  onChangeModal: (next: ActiveModal) => void;
  updateAvailable: boolean;
  onCheckForUpdate: () => void;
  onForceReload: () => void;
}

export function AppModals({
  modal,
  onChangeModal,
  updateAvailable,
  onCheckForUpdate,
  onForceReload,
}: AppModalsProps) {
  const store = useWorkoutStore();
  const slice = useStoreSelector(
    (s) => ({
      activeRoutine: s.activeRoutine,
      activeSpace: s.activeSpace,
      preferredStyle: s.preferredStyle,
      spaces: s.data.spaces,
      history: s.data.history,
      voiceSupported: s.voiceSupported,
    }),
    shallowEqual,
  );

  if (modal.kind === 'none') return null;

  const closeModal = (): void => onChangeModal({ kind: 'none' });

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
      {modal.kind === 'new-workout' && (
        <NewWorkoutModal
          open
          currentSettings={slice.activeRoutine.settings}
          userExercises={slice.activeRoutine.exercises}
          spaces={slice.spaces}
          activeSpace={slice.activeSpace}
          activeStyle={slice.preferredStyle}
          onSelectSpace={(spaceId) => store.selectSpace(spaceId)}
          onSelectStyle={(style) => store.setPreferredStyle(style)}
          onManageSpaces={() =>
            onChangeModal({ kind: 'settings', tab: 'spaces', returnToNewWorkout: true })
          }
          onClose={closeModal}
          onApply={(preset, autoStart) => store.applyWorkoutPreset(preset, { autoStart })}
        />
      )}

      {modal.kind === 'library' && (
        <ExerciseLibraryModal
          open
          userExercises={slice.activeRoutine.exercises}
          activeRoutineExerciseIds={slice.activeRoutine.exercises.map((ex) => ex.id)}
          activeSpace={slice.activeSpace}
          demoSpeed={slice.activeRoutine.settings.demoSpeed}
          onClose={closeModal}
          onPreviewOnStage={(exercise) => store.previewCatalogExercise(exercise)}
          onAddToRoutine={(exercise) => store.addCatalogExercise(exercise)}
        />
      )}

      {modal.kind === 'exercise' && (
        <ExerciseModal
          open
          editingExercise={modal.editing}
          onClose={closeModal}
          onSave={(input) => store.saveExercise(input)}
        />
      )}

      {modal.kind === 'settings' && (
        <SettingsModal
          open
          initialTab={modal.tab}
          settings={slice.activeRoutine.settings}
          voiceSupported={slice.voiceSupported}
          spaces={slice.spaces}
          activeSpaceId={slice.activeSpace.id}
          onClose={() => {
            if (modal.returnToNewWorkout) {
              onChangeModal({ kind: 'new-workout' });
            } else {
              closeModal();
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
          updateAvailable={updateAvailable}
          onCheckForUpdate={onCheckForUpdate}
          onForceReload={onForceReload}
        />
      )}

      {modal.kind === 'history' && (
        <HistoryModal
          open
          history={slice.history}
          onClose={closeModal}
          onLogManualSession={() => store.logManualSession()}
        />
      )}
    </Suspense>
  );
}
