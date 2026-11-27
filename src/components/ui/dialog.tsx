import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type { ComponentChildren } from 'preact';
import { cn } from '@/lib/utils';

type WithoutRef<T> = Omit<T, 'ref'>;

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: WithoutRef<DialogPrimitive.Trigger.Props>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: WithoutRef<DialogPrimitive.Portal.Props>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: WithoutRef<DialogPrimitive.Close.Props>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogBackdrop({ className, ...props }: WithoutRef<DialogPrimitive.Backdrop.Props>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

export interface DialogContentProps extends Omit<
  WithoutRef<DialogPrimitive.Popup.Props>,
  'children'
> {
  children?: ComponentChildren;
  showCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            'relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto outline-none transition-all duration-150 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              aria-label="Close dialog"
              className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children?: ComponentChildren;
}) {
  return (
    <div data-slot="dialog-header" className={cn('mb-4 pr-10', className)}>
      {children}
    </div>
  );
}

function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children?: ComponentChildren;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-800',
        className,
      )}
    >
      {children}
    </div>
  );
}

function DialogTitle({ className, ...props }: WithoutRef<DialogPrimitive.Title.Props>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-bold text-white leading-snug', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: WithoutRef<DialogPrimitive.Description.Props>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-xs text-slate-400 mt-1', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
