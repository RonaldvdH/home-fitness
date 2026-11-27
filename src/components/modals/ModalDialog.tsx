import type { ComponentChildren } from 'preact';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ModalDialogProps {
  open: boolean;
  title: string;
  titleId: string;
  maxWidthClass?: string;
  onClose: () => void;
  children: ComponentChildren;
}

/**
 * Shared modal shell backed by shadcn + Base UI Dialog (ADR-0005).
 * Provides standardized focus trapping, Escape/backdrop dismiss, scroll lock, and ARIA wiring.
 */
export function ModalDialog({
  open,
  title,
  titleId,
  maxWidthClass = 'max-w-lg',
  onClose,
  children,
}: ModalDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className={maxWidthClass}>
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
