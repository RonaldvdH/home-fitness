import { APP_STATE } from '../state/store.js';
import { KINEMATICS_ENGINE } from '../engine/kinematics.js';
import { formatMMSS } from '../engine/timeline.js';
import { escapeHTML } from './dom.js';

const PHASE_STYLES = {
  'WARM-UP': {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    stroke: '#fbbf24',
    stage: 'stage-spotlight-warmup',
    label: 'WARM-UP',
  },
  WORK: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    stroke: '#10b981',
    stage: 'stage-spotlight',
    label: 'WORK',
  },
  REST: {
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    stroke: '#38bdf8',
    stage: 'stage-spotlight-rest',
    label: 'REST',
  },
  'COOL-DOWN': {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    stroke: '#c084fc',
    stage: 'stage-spotlight',
    label: 'COOL-DOWN',
  },
};

export function updateTransportButtons() {
  const play = document.getElementById('icon-play');
  const pause = document.getElementById('icon-pause');
  const label = document.getElementById('btn-start-text');
  if (!play || !pause || !label) return;

  if (APP_STATE.isRunning) {
    play.classList.add('hidden');
    pause.classList.remove('hidden');
    label.textContent = 'Pause';
  } else {
    play.classList.remove('hidden');
    pause.classList.add('hidden');
    label.textContent =
      APP_STATE.currentIndex === 0 && APP_STATE.remainingSec === APP_STATE.timeline[0]?.duration
        ? 'Start'
        : 'Resume';
  }
}

export function renderActiveStep(isCompleted = false) {
  const current = APP_STATE.timeline[APP_STATE.currentIndex];
  if (!current) return;

  const phaseBadge = document.getElementById('phase-badge');
  const ringProgress = document.getElementById('ring-progress');
  const stageWrapper = document.getElementById('animation-stage-wrapper');

  const st = isCompleted
    ? {
        badge: 'bg-emerald-500 text-slate-950 border-emerald-400',
        stroke: '#10b981',
        stage: 'stage-spotlight',
        label: 'DONE!',
      }
    : PHASE_STYLES[current.phase] || PHASE_STYLES.WORK;

  phaseBadge.className = `px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border ${st.badge}`;
  phaseBadge.textContent = st.label;
  ringProgress.setAttribute('stroke', st.stroke);
  stageWrapper.className = `md:col-span-7 ${st.stage} relative flex flex-col items-center justify-center p-6 sm:p-8 min-h-[320px] sm:min-h-[380px] border-b md:border-b-0 md:border-r border-slate-800/80`;

  // Mini Ring circumference = 2 * PI * 14 = 87.96
  const circ = 87.96;
  const ratio = current.duration > 0 ? APP_STATE.remainingSec / current.duration : 0;
  ringProgress.style.strokeDashoffset = circ * (1 - Math.max(0, Math.min(1, ratio)));

  document.getElementById('timer-display').textContent = formatMMSS(APP_STATE.remainingSec);
  document.getElementById('round-indicator').textContent =
    current.round === 0 ? 'Prep' : `Round ${current.round}/${current.totalRounds}`;
  document.getElementById('step-counter').textContent =
    `${APP_STATE.currentIndex + 1}/${APP_STATE.timeline.length}`;

  const totalSteps = APP_STATE.timeline.length;
  const pct = isCompleted
    ? 100
    : Math.round(((APP_STATE.currentIndex + (1 - ratio)) / totalSteps) * 100);
  document.getElementById('overall-progress-bar').style.width = `${pct}%`;

  KINEMATICS_ENGINE.setExerciseType(current.exercise.animationType);

  document.getElementById('active-equipment-tag').textContent =
    current.exercise.equipment || '2x 5kg Dumbbells';
  document.getElementById('active-exercise-muscles').textContent = current.exercise.muscleGroup;
  document.getElementById('active-exercise-title').textContent = current.exercise.name;
  document.getElementById('active-exercise-tip').textContent =
    current.exercise.tip || 'Keep your core engaged and control the 5kg dumbbells on the way down.';

  document.getElementById('active-exercise-steps').innerHTML = current.exercise.steps
    .map(
      (step, i) => `
      <li class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          ${i + 1}
        </span>
        <span>${escapeHTML(step)}</span>
      </li>`
    )
    .join('');

  const nextStep = APP_STATE.timeline[APP_STATE.currentIndex + 1];
  if (nextStep) {
    document.getElementById('up-next-title').textContent =
      `${nextStep.phase}: ${nextStep.exercise.name}`;
    document.getElementById('up-next-duration').textContent = `${nextStep.duration}s`;
  } else {
    document.getElementById('up-next-title').textContent = 'Finish & Log Session';
    document.getElementById('up-next-duration').textContent = 'Done';
  }
}
