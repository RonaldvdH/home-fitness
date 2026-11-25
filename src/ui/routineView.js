import { APP_STATE } from '../state/store.js';
import { computeTotalDuration, formatMMSS } from '../engine/timeline.js';
import { escapeHTML } from './dom.js';

export function renderExerciseList() {
  const container = document.getElementById('exercise-list-container');
  const totalSec = computeTotalDuration(APP_STATE.timeline);
  const badge = document.getElementById('total-duration-badge');
  if (badge) badge.textContent = `${formatMMSS(totalSec)} Total`;
  if (!container) return;

  container.innerHTML = APP_STATE.exercises
    .map(
      (ex, idx) => `
      <div data-ex-id="${ex.id}" class="exercise-row group p-3 rounded-2xl border transition cursor-pointer ${
        ex.active
          ? 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/40'
          : 'bg-slate-950/30 border-slate-800/50 opacity-55'
      }">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1" data-action="preview" data-ex-id="${ex.id}">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-slate-500">${idx + 1}.</span>
              <h4 class="font-bold text-sm text-white truncate group-hover:text-emerald-300 transition">${escapeHTML(ex.name)}</h4>
            </div>
            <p class="text-xs text-slate-400 truncate pl-5 mt-0.5">${escapeHTML(ex.muscleGroup)}</p>
          </div>

          <div class="flex items-center gap-0.5 shrink-0">
            <button type="button" data-action="move-up" data-index="${idx}" title="Move Up" ${idx === 0 ? 'disabled' : ''}
              class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25">
              <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button type="button" data-action="move-down" data-index="${idx}" title="Move Down" ${idx === APP_STATE.exercises.length - 1 ? 'disabled' : ''}
              class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25">
              <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <button type="button" data-action="toggle" data-ex-id="${ex.id}" title="${ex.active ? 'Included in Circuit' : 'Excluded'}"
              class="p-1.5 rounded-lg ${ex.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'}">
              <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button type="button" data-action="edit" data-ex-id="${ex.id}" title="Edit"
              class="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800">
              <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button type="button" data-action="delete" data-ex-id="${ex.id}" title="Delete"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800">
              <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>`
    )
    .join('');
}

/**
 * Bind delegated click handling for the exercise routine list.
 */
export function bindRoutineListEvents({ onPreview, onMove, onToggle, onEdit, onDelete }) {
  const container = document.getElementById('exercise-list-container');
  if (!container) return;

  container.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.exId;
    const index = Number(target.dataset.index);

    switch (action) {
      case 'preview':
        if (id) onPreview?.(id);
        break;
      case 'move-up':
        onMove?.(index, -1);
        break;
      case 'move-down':
        onMove?.(index, 1);
        break;
      case 'toggle':
        if (id) onToggle?.(id);
        break;
      case 'edit':
        if (id) onEdit?.(id);
        break;
      case 'delete':
        if (id) onDelete?.(id);
        break;
    }
  });
}
