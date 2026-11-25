import { DEFAULT_EXERCISES } from '../data/exercises.js';
import { APP_STATE } from '../state/store.js';
import { AUDIO_ENGINE } from '../services/audio.js';
import { getCloudStatus, signInWithGoogle, signOutUser } from '../services/persistence.js';
import { closeModal, openModal, showToast } from './dom.js';
import { renderHistoryList } from './historyView.js';

export function openEditExerciseModal(id) {
  const ex = APP_STATE.exercises.find((e) => e.id === id);
  if (!ex) return;

  document.getElementById('modal-exercise-heading').textContent = 'Edit Exercise';
  document.getElementById('field-ex-id').value = ex.id;
  document.getElementById('field-ex-name').value = ex.name;
  document.getElementById('field-ex-muscles').value = ex.muscleGroup;
  document.getElementById('field-ex-anim').value = ex.animationType;
  document.getElementById('field-ex-step1').value = ex.steps[0] || '';
  document.getElementById('field-ex-step2').value = ex.steps[1] || '';
  document.getElementById('field-ex-step3').value = ex.steps[2] || '';
  document.getElementById('field-ex-tip').value = ex.tip || '';

  openModal(document.getElementById('modal-exercise'));
}

export function bindModalEvents({ onRefreshAll, onLogManualSession }) {
  // Add / Edit Exercise Modal
  const exerciseModal = document.getElementById('modal-exercise');
  document.getElementById('btn-open-add-modal').addEventListener('click', () => {
    document.getElementById('modal-exercise-heading').textContent = 'Add Dumbbell Exercise';
    document.getElementById('form-exercise').reset();
    document.getElementById('field-ex-id').value = '';
    openModal(exerciseModal);
  });
  document
    .getElementById('btn-close-exercise-modal')
    .addEventListener('click', () => closeModal(exerciseModal));
  document
    .getElementById('btn-cancel-exercise-modal')
    .addEventListener('click', () => closeModal(exerciseModal));

  document.getElementById('form-exercise').addEventListener('submit', (e) => {
    e.preventDefault();
    const existingId = document.getElementById('field-ex-id').value;
    const payload = {
      id: existingId || `ex-${Date.now()}`,
      name: document.getElementById('field-ex-name').value.trim(),
      muscleGroup: document.getElementById('field-ex-muscles').value.trim(),
      equipment: '2x 5kg Dumbbells',
      animationType: document.getElementById('field-ex-anim').value,
      active: true,
      steps: [
        document.getElementById('field-ex-step1').value.trim(),
        document.getElementById('field-ex-step2').value.trim(),
        document.getElementById('field-ex-step3').value.trim(),
      ],
      tip:
        document.getElementById('field-ex-tip').value.trim() ||
        'Maintain steady breathing and smooth control.',
    };

    if (existingId) {
      const idx = APP_STATE.exercises.findIndex((item) => item.id === existingId);
      if (idx !== -1) {
        payload.active = APP_STATE.exercises[idx].active;
        APP_STATE.exercises[idx] = payload;
      }
      showToast(`Updated "${payload.name}"`, 'success');
    } else {
      APP_STATE.exercises.push(payload);
      showToast(`Added "${payload.name}" and saved!`, 'success');
    }

    closeModal(exerciseModal);
    onRefreshAll?.(true);
  });

  // Timer Settings Modal
  const settingsModal = document.getElementById('modal-settings');
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    document.getElementById('set-work').value = APP_STATE.settings.workSec;
    document.getElementById('set-rest').value = APP_STATE.settings.restSec;
    document.getElementById('set-rounds').value = APP_STATE.settings.rounds;
    document.getElementById('set-warmup').checked = APP_STATE.settings.includeWarmup;
    document.getElementById('set-cooldown').checked = APP_STATE.settings.includeCooldown;
    openModal(settingsModal);
  });
  document
    .getElementById('btn-close-settings')
    .addEventListener('click', () => closeModal(settingsModal));
  document
    .getElementById('btn-cancel-settings')
    .addEventListener('click', () => closeModal(settingsModal));

  document.getElementById('btn-test-beep-modal').addEventListener('click', () => {
    AUDIO_ENGINE.beepWorkStart();
    showToast('Playing interval start beep!');
  });

  document.getElementById('form-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    APP_STATE.settings = {
      workSec: Math.max(10, parseInt(document.getElementById('set-work').value, 10) || 40),
      restSec: Math.max(5, parseInt(document.getElementById('set-rest').value, 10) || 20),
      rounds: Math.max(1, parseInt(document.getElementById('set-rounds').value, 10) || 3),
      includeWarmup: document.getElementById('set-warmup').checked,
      includeCooldown: document.getElementById('set-cooldown').checked,
    };
    closeModal(settingsModal);
    onRefreshAll?.(true);
    showToast('Timer settings saved across sessions!', 'success');
  });

  // Account & History Modal
  const accountModal = document.getElementById('modal-account');
  const openAccountModal = () => {
    renderHistoryList();
    openModal(accountModal);
  };

  document.getElementById('btn-open-account').addEventListener('click', openAccountModal);
  document.getElementById('btn-auth-status').addEventListener('click', openAccountModal);
  document
    .getElementById('btn-close-account')
    .addEventListener('click', () => closeModal(accountModal));

  document.getElementById('btn-log-manual-session').addEventListener('click', () => {
    onLogManualSession?.();
    renderHistoryList();
    showToast('Workout session logged!', 'success');
  });

  document.getElementById('btn-google-signin').addEventListener('click', async () => {
    const { auth } = getCloudStatus();
    if (!auth) {
      showToast('Cloud sync is already saved locally on this browser.', 'info');
      return;
    }
    try {
      await signInWithGoogle();
      showToast('Signed in with Google! Routine synced.', 'success');
    } catch {
      showToast('Could not complete Google Sign-In. Local save remains active.', 'error');
    }
  });

  document.getElementById('btn-signout').addEventListener('click', async () => {
    await signOutUser();
    showToast('Signed out. Local backup remains intact.');
  });

  // Export / Import / Reset Defaults
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const bundle = {
      exercises: APP_STATE.exercises,
      settings: APP_STATE.settings,
      history: APP_STATE.history,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '5kg-dumbbell-circuit-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded!');
  });

  document.getElementById('input-import-json').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed)) {
          APP_STATE.exercises = parsed;
        } else if (parsed && Array.isArray(parsed.exercises)) {
          APP_STATE.exercises = parsed.exercises;
          if (parsed.settings) APP_STATE.settings = { ...APP_STATE.settings, ...parsed.settings };
          if (Array.isArray(parsed.history)) APP_STATE.history = parsed.history;
        } else {
          throw new Error('Invalid format');
        }
        onRefreshAll?.(true);
        showToast('Workout routine imported & saved!', 'success');
      } catch {
        showToast('Invalid JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-restore-defaults').addEventListener('click', () => {
    APP_STATE.exercises = structuredClone(DEFAULT_EXERCISES);
    onRefreshAll?.(true);
    showToast('Default 4 upper-body exercises restored.');
  });
}
