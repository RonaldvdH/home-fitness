import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

export interface ModalDialogProps {
  open: boolean;
  title: string;
  titleId: string;
  maxWidthClass?: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function ModalDialog({
  open,
  title,
  titleId,
  maxWidthClass = 'max-w-lg',
  onClose,
  children,
}: ModalDialogProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Bind synchronously on commit so Escape works immediately as soon as the dialog is visible,
  // and keep the listener stable across parent re-renders via onCloseRef.
  useLayoutEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        class={`bg-slate-900 border border-slate-800 rounded-3xl ${maxWidthClass} w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}
      >
        <div class="flex items-center justify-between mb-4">
          <h3 id={titleId} class="text-lg font-bold text-white">
            {title}
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => onCloseRef.current()}
            class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
