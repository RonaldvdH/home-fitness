import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalDialog } from '../src/components/modals/ModalDialog';

afterEach(() => {
  cleanup();
});

describe('<ModalDialog /> (shadcn + Base UI Dialog)', () => {
  it('renders dialog content with accessible title when open and closes via close button or Escape', async () => {
    const onClose = vi.fn();
    render(
      <ModalDialog open title="Test Dialog" titleId="test-dialog-title" onClose={onClose}>
        <p>Dialog body copy</p>
      </ModalDialog>,
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(screen.getByText('Test Dialog')).toBeTruthy();
    expect(screen.getByText('Dialog body copy')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Close dialog'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose on Escape key press', async () => {
    const onClose = vi.fn();
    render(
      <ModalDialog open title="Escape Dialog" titleId="escape-dialog-title" onClose={onClose}>
        <p>Press escape</p>
      </ModalDialog>,
    );

    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
