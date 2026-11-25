import { APP_STATE } from '../state/store.js';
import { getCloudStatus } from '../services/persistence.js';
import { escapeHTML } from './dom.js';

export function renderHistoryList() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  if (APP_STATE.history.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-xl">No completed sessions logged yet. Finish a circuit or click "+ Log Completed Workout".</p>`;
    return;
  }

  container.innerHTML = APP_STATE.history
    .map(
      (h) => `
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span class="font-semibold text-white block">${escapeHTML(h.date)}</span>
          <span class="text-slate-400">${h.rounds} rounds • ${h.exerciseCount} exercises</span>
        </div>
        <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold">
          ${h.durationMin} min
        </span>
      </div>`
    )
    .join('');
}

export function updateSyncUI(mode, text, user = null) {
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  const statusDesc = document.getElementById('account-status-desc');
  const userEmail = document.getElementById('account-user-email');
  const btnGoogle = document.getElementById('btn-google-signin');
  const btnSignOut = document.getElementById('btn-signout');
  const { cloudAvailable } = getCloudStatus();

  if (label) label.textContent = text;
  if (!dot) return;

  if (mode === 'cloud') {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]';
    if (statusDesc) statusDesc.textContent = 'Connected to Cloud & Local Storage';
    if (user && !user.isAnonymous) {
      if (userEmail) userEmail.textContent = `Signed in as ${user.email || user.displayName}`;
      btnGoogle?.classList.add('hidden');
      btnSignOut?.classList.remove('hidden');
    } else {
      if (userEmail) {
        userEmail.textContent = 'Anonymous cloud session active. Link Google to sync across devices.';
      }
      btnGoogle?.classList.remove('hidden');
      btnSignOut?.classList.add('hidden');
    }
  } else if (mode === 'syncing') {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse';
  } else {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-sky-400';
    if (statusDesc) statusDesc.textContent = 'Saved Persistently in Browser Storage';
    if (!cloudAvailable && btnGoogle) {
      btnGoogle.classList.add('hidden');
    }
  }
}
