import './styles/main.css';
import { APP_STATE, loadLocalState } from './state/store.js';
import { AUDIO_ENGINE } from './services/audio.js';
import { initCloudPersistence, persistAllState } from './services/persistence.js';
import { KINEMATICS_ENGINE } from './engine/kinematics.js';
import { buildCircuitTimeline } from './engine/timeline.js';
import { createTimerController } from './engine/timer.js';
import { showToast } from './ui/dom.js';
import { renderActiveStep, updateTransportButtons } from './ui/stageView.js';
import { bindRoutineListEvents, renderExerciseList } from './ui/routineView.js';
import { renderHistoryList, updateSyncUI } from './ui/historyView.js';
import { bindModalEvents, openEditExerciseModal } from './ui/modals.js';

function rebuildTimeline() {
  const list = buildCircuitTimeline(APP_STATE.exercises, APP_STATE.settings);
  APP_STATE.timeline = list;
  APP_STATE.currentIndex = 0;
  APP_STATE.remainingSec = list[0]?.duration ?? 0;
}

const timer = createTimerController({
  onTick: (isCompleted) => renderActiveStep(isCompleted),
  onTransportChange: updateTransportButtons,
  onComplete: () => {
    renderHistoryList();
    showToast('Circuit Complete! Session saved to your workout history.', 'success');
  },
  onPersist: () => persistAllState(updateSyncUI),
});

function refreshAll(shouldPersist = true) {
  timer.pauseTimer();
  rebuildTimeline();
  renderExerciseList();
  renderActiveStep();
  renderHistoryList();
  if (shouldPersist) {
    persistAllState(updateSyncUI);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLocalState();
  rebuildTimeline();
  renderExerciseList();
  renderActiveStep();
  renderHistoryList();

  KINEMATICS_ENGINE.start(APP_STATE.timeline[0]?.exercise.animationType || 'lateral-raise');
  initCloudPersistence({
    onSyncStatus: updateSyncUI,
    onRemoteHydrated: () => refreshAll(false),
  });

  // Transport Controls
  document.getElementById('btn-start-pause').addEventListener('click', () => {
    if (APP_STATE.isRunning) timer.pauseTimer();
    else timer.startTimer();
  });
  document.getElementById('btn-reset').addEventListener('click', timer.resetTimer);
  document.getElementById('btn-next').addEventListener('click', () => timer.advanceTimeline(1, false));
  document.getElementById('btn-prev').addEventListener('click', () => timer.advanceTimeline(-1, false));

  // Demo Pace Toggle (Slow vs Normal)
  document.querySelectorAll('.speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed) || 1;
      KINEMATICS_ENGINE.speedMultiplier = speed;
      document.querySelectorAll('.speed-btn').forEach((b) => {
        b.className = 'speed-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition';
      });
      btn.className =
        'speed-btn px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 font-semibold transition';
    });
  });

  // Audio Mute Toggle
  document.getElementById('btn-mute-toggle').addEventListener('click', () => {
    AUDIO_ENGINE.muted = !AUDIO_ENGINE.muted;
    document.getElementById('icon-sound-on').classList.toggle('hidden', AUDIO_ENGINE.muted);
    document.getElementById('icon-sound-off').classList.toggle('hidden', !AUDIO_ENGINE.muted);
    showToast(AUDIO_ENGINE.muted ? 'Beeps muted' : 'Beeps enabled');
  });

  // Delegated Exercise List Actions
  bindRoutineListEvents({
    onPreview: (id) => {
      const targetIdx = APP_STATE.timeline.findIndex(
        (step) => step.phase === 'WORK' && step.exercise.id === id
      );
      if (targetIdx !== -1) {
        timer.pauseTimer();
        APP_STATE.currentIndex = targetIdx;
        APP_STATE.remainingSec = APP_STATE.timeline[targetIdx].duration;
        renderActiveStep();
      }
    },
    onMove: (index, delta) => {
      const target = index + delta;
      if (target < 0 || target >= APP_STATE.exercises.length) return;
      const tmp = APP_STATE.exercises[index];
      APP_STATE.exercises[index] = APP_STATE.exercises[target];
      APP_STATE.exercises[target] = tmp;
      refreshAll(true);
    },
    onToggle: (id) => {
      const ex = APP_STATE.exercises.find((e) => e.id === id);
      if (!ex) return;
      ex.active = !ex.active;
      refreshAll(true);
      showToast(ex.active ? `Enabled "${ex.name}"` : `Disabled "${ex.name}"`);
    },
    onEdit: (id) => openEditExerciseModal(id),
    onDelete: (id) => {
      if (APP_STATE.exercises.length <= 1) {
        showToast('Keep at least one exercise in your circuit.', 'error');
        return;
      }
      APP_STATE.exercises = APP_STATE.exercises.filter((e) => e.id !== id);
      refreshAll(true);
      showToast('Exercise removed and saved.');
    },
  });

  // Modals & Persistence Actions
  bindModalEvents({
    onRefreshAll: refreshAll,
    onLogManualSession: timer.logWorkoutSession,
  });
});
