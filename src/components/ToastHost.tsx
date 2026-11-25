import type { ToastItem } from '../state/workoutStore';

export interface ToastHostProps {
  toasts: readonly ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <div
      aria-live="polite"
      class="fixed bottom-5 right-4 left-4 sm:left-auto sm:right-5 z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const style =
          toast.variant === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
            : toast.variant === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/95 border-slate-700 text-slate-200';
        return (
          <div
            key={toast.id}
            role="status"
            onClick={() => onDismiss(toast.id)}
            class={`pointer-events-auto cursor-pointer px-4 py-2.5 rounded-2xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 ${style}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
