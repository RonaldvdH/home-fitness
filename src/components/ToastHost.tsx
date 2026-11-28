import type { ToastItem } from '../state/workoutStore';
import { CloseIcon } from './icons';

export interface ToastHostProps {
  toasts: readonly ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <section
      aria-label="Notifications"
      class="fixed bottom-5 right-4 left-4 sm:left-auto sm:right-5 z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.variant === 'error';
        const style =
          toast.variant === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
            : isError
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/95 border-slate-700 text-slate-200';
        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            aria-atomic="true"
            class={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 max-w-sm ${style}`}
          >
            <span class="min-w-0 leading-snug">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                class="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shrink-0 transition"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              class="p-1 -mr-1.5 rounded-lg text-current/70 hover:text-current hover:bg-white/10 transition shrink-0"
            >
              <CloseIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
