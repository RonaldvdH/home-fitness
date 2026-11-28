import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ExerciseDemonstrator,
  resetWebGLSupportCache,
} from '../src/components/ExerciseDemonstrator';

describe('ExerciseDemonstrator seam', () => {
  afterEach(() => {
    cleanup();
    resetWebGLSupportCache();
    vi.restoreAllMocks();
  });

  it('gracefully falls back to 2D AthleteSvg when WebGL is unavailable', () => {
    resetWebGLSupportCache();
    render(
      <ExerciseDemonstrator animationType="bicep-curl" speedMultiplier={1} weightLabel="5kg" />,
    );

    const wrapper = screen.getByTestId('exercise-demonstrator');
    expect(wrapper.getAttribute('data-mode')).toBe('2d');
    expect(screen.getByRole('img', { name: 'Animated exercise form demonstrator' })).toBeTruthy();
    expect(screen.getByTestId('live-rep-cue').textContent).toBeTruthy();
    expect(screen.queryByTestId('demonstrator-mode-3d')).toBeNull();
  });

  it('keeps compact variant on lightweight 2D SVG without creating a WebGL context', () => {
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    render(
      <ExerciseDemonstrator
        animationType="wall-sit"
        speedMultiplier={1}
        weightLabel={null}
        variant="compact"
      />,
    );

    expect(screen.getByRole('img', { name: 'Animated exercise form demonstrator' })).toBeTruthy();
    expect(getContextSpy).not.toHaveBeenCalled();
  });

  it('exposes the 3D/2D mode toggle when WebGL is available and switches cleanly to 2D', () => {
    resetWebGLSupportCache();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => null,
    } as unknown as RenderingContext);

    render(
      <ExerciseDemonstrator animationType="overhead-press" speedMultiplier={1} weightLabel="5kg" />,
    );

    const wrapper = screen.getByTestId('exercise-demonstrator');
    expect(wrapper.getAttribute('data-mode')).toBe('3d');
    expect(screen.getByTestId('demonstrator-mode-3d')).toBeTruthy();

    fireEvent.click(screen.getByTestId('demonstrator-mode-2d'));
    expect(wrapper.getAttribute('data-mode')).toBe('2d');
    expect(screen.getByRole('img', { name: 'Animated exercise form demonstrator' })).toBeTruthy();
  });
});
