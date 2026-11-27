import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/components/App';
import { createDefaultAppData } from '../src/domain/defaults';
import type { AppDataV3 } from '../src/domain/schema';
import type { StorageAdapter } from '../src/services/storage';
import { createWorkoutStore } from '../src/state/workoutStore';

function createMemoryAdapter(initial?: AppDataV3): StorageAdapter {
  let stored = initial ?? createDefaultAppData('2026-01-01T00:00:00.000Z');
  return {
    load: () => structuredClone(stored),
    save: (next) => {
      stored = structuredClone(next);
      return true;
    },
  };
}

afterEach(() => {
  cleanup();
});

describe('<App /> integration flows', () => {
  it('hides dumbbells during bodyweight warm-up and shows dynamic weight label on work step', () => {
    const store = createWorkoutStore({ storage: createMemoryAdapter() });
    render(<App store={store} />);

    expect(screen.getByTestId('phase-badge').textContent).toBe('WARM-UP');
    expect(screen.getByTestId('dumbbell-right').style.display).toBe('none');

    fireEvent.click(screen.getByLabelText('Next step'));

    expect(screen.getByTestId('phase-badge').textContent).toBe('WORK');
    expect(screen.getByTestId('active-exercise-title').textContent).toBe(
      'Dumbbell Overhead Shoulder Press',
    );
    expect(screen.getByTestId('dumbbell-right').style.display).toBe('inline');
    expect(screen.getByTestId('dumbbell-right').textContent).toContain('5kg');

    store.destroy();
  });

  it('previews even a disabled exercise without losing active workout step progress', () => {
    const store = createWorkoutStore({ storage: createMemoryAdapter() });
    render(<App store={store} />);

    // Disable Standing Bicep Curls, then advance to step 2 (WORK: Overhead Press)
    fireEvent.click(screen.getByLabelText('Disable Standing Bicep Curls'));
    fireEvent.click(screen.getByLabelText('Next step'));
    expect(screen.getByTestId('step-counter').textContent?.startsWith('2/')).toBe(true);

    // Click disabled exercise to preview
    fireEvent.click(screen.getByText('Standing Bicep Curls'));
    expect(screen.getByTestId('active-exercise-title').textContent).toBe('Standing Bicep Curls');
    expect(screen.getByText('Back to Workout')).toBeTruthy();

    // Return to workout and verify step 2 was preserved
    fireEvent.click(screen.getByText('Back to Workout'));
    expect(screen.getByTestId('active-exercise-title').textContent).toBe(
      'Dumbbell Overhead Shoulder Press',
    );
    expect(screen.getByTestId('step-counter').textContent?.startsWith('2/')).toBe(true);

    store.destroy();
  });

  it('edits an exercise while preserving equipment metadata and closes modals on Escape', async () => {
    const store = createWorkoutStore({ storage: createMemoryAdapter() });
    render(<App store={store} />);

    fireEvent.click(screen.getByLabelText('Edit Dumbbell Floor Chest Press'));
    const nameInput = (await screen.findByLabelText(
      'Exercise Name *',
      {},
      { timeout: 5000 },
    )) as HTMLInputElement;
    const equipInput = screen.getByLabelText('Equipment & Weight') as HTMLInputElement;

    expect(equipInput.value).toBe('2x 5kg Dumbbells • Floor / Mat');

    fireEvent.input(nameInput, { target: { value: 'Floor Press (Pause)' } });
    fireEvent.submit(nameInput.closest('form')!);

    const updated = store.getState().activeRoutine.exercises.find((e) => e.id === 'ex-floor-press');
    expect(updated?.name).toBe('Floor Press (Pause)');
    expect(updated?.equipment.label).toBe('2x 5kg Dumbbells • Floor / Mat');

    // Open history modal, log manual workout, then close with Escape
    fireEvent.click(screen.getByText('History'));
    expect(await screen.findByRole('dialog', {}, { timeout: 5000 })).toBeTruthy();
    fireEvent.click(screen.getByText('+ Log Completed Workout'));
    expect(store.getState().data.history).toHaveLength(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    store.destroy();
  });

  it('builds, shuffles, and starts a tagged 10 min Abs & Core workout from the New Workout overlay', async () => {
    const store = createWorkoutStore({ storage: createMemoryAdapter() });
    render(<App store={store} />);

    fireEvent.click(screen.getByText('New Workout'));
    expect(await screen.findByRole('dialog', {}, { timeout: 5000 })).toBeTruthy();

    fireEvent.click(screen.getByText('10 min'));
    fireEvent.click(screen.getByText('Abs & Core'));

    const preview = screen.getByTestId('new-workout-preview');
    expect(preview.textContent).toContain('10:00');
    expect(preview.textContent).toContain('tagged moves');

    // Shuffle button should be available since >4 exercises are tagged for 10m abs
    fireEvent.click(screen.getByText('Shuffle'));

    fireEvent.click(screen.getByText('Start Workout'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(screen.getByTestId('active-routine-name').textContent).toBe('10 min • Abs & Core');
    expect(store.getState().timer.status).toBe('running');

    const loaded = store.getState().activeRoutine.exercises;
    expect(loaded).toHaveLength(4);
    for (const ex of loaded) {
      expect(ex.muscleGroups).toContain('abs');
      expect(ex.durations).toContain(10);
    }

    store.destroy();
  });
});
