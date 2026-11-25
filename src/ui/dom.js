/**
 * Shared DOM & notification utilities.
 */

export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export function showToast(msg, variant = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  const style =
    variant === 'success'
      ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
      : variant === 'error'
        ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
        : 'bg-slate-900/95 border-slate-700 text-slate-200';
  el.className = `pointer-events-auto px-4 py-2.5 rounded-2xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 ${style}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
}

export function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.classList.remove('flex');
}
