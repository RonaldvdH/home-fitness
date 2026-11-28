/**
 * Encapsulated toast notification queue with auto-dismiss timers and persistent actions.
 */

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  persistent?: boolean;
  action?: ToastAction;
}

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  persistent?: boolean;
  action?: ToastAction;
}

export interface ToastQueue {
  getToasts: () => ToastItem[];
  push: (message: string, variant?: ToastVariant, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  destroy: () => void;
}

export function createToastQueue(
  onChange: (toasts: ToastItem[]) => void,
  autoDismissMs = 3200,
): ToastQueue {
  let toasts: ToastItem[] = [];
  let nextToastId = 1;
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  const dismiss = (id: number): void => {
    const handle = timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timers.delete(id);
    }
    if (toasts.some((t) => t.id === id)) {
      toasts = toasts.filter((t) => t.id !== id);
      onChange(toasts);
    }
  };

  const push = (
    message: string,
    variant: ToastVariant = 'info',
    options?: ToastOptions,
  ): number => {
    const id = nextToastId++;
    const item: ToastItem = {
      id,
      message,
      variant,
      ...(options?.persistent ? { persistent: true } : {}),
      ...(options?.action ? { action: options.action } : {}),
    };
    toasts = [...toasts, item];
    onChange(toasts);

    if (!options?.persistent) {
      const handle = setTimeout(() => {
        dismiss(id);
      }, autoDismissMs);
      timers.set(id, handle);
    }
    return id;
  };

  return {
    getToasts: () => toasts,
    push,
    dismiss,
    destroy() {
      timers.forEach((handle) => clearTimeout(handle));
      timers.clear();
    },
  };
}
