import { lazy, Suspense } from 'preact/compat';
import { useCallback, useState } from 'preact/hooks';
import type { AnimationId } from '../domain/schema';
import { AthleteSvg } from './AthleteSvg';

const LazyStage3D = lazy(() => import('./stage3d/Stage3D').then((m) => ({ default: m.Stage3D })));

export type DemonstratorMode = '3d' | '2d';

export interface ExerciseDemonstratorProps {
  animationType: AnimationId;
  muscleGroup?: string;
  speedMultiplier: number;
  weightLabel: string | null;
  variant?: 'default' | 'flex' | 'compact';
  paused?: boolean;
  /** Optional override (e.g., compact modal previews keep lightweight 2D SVG). */
  preferredMode?: DemonstratorMode;
}

let cachedWebGLSupport: boolean | null = null;

/**
 * Probe WebGL2/WebGL1 availability once without importing Three.js into the entry bundle.
 */
export function detectWebGLSupport(): boolean {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  if (typeof document === 'undefined') {
    cachedWebGLSupport = false;
    return false;
  }
  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ??
      testCanvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    cachedWebGLSupport = gl !== null;
    if (gl && 'getExtension' in gl) {
      const loseExt = gl.getExtension('WEBGL_lose_context');
      loseExt?.loseContext();
    }
  } catch {
    cachedWebGLSupport = false;
  }
  return cachedWebGLSupport;
}

/** Reset cached WebGL detection (used by automated tests). */
export function resetWebGLSupportCache(): void {
  cachedWebGLSupport = null;
}

/**
 * Unified exercise form demonstrator seam (Phase 4 / ADR-0002).
 *
 * - Renders the lazy-loaded Three.js 3D mannequin when WebGL is available.
 * - Paints `AthleteSvg` immediately during the first async chunk load (zero blank flash).
 * - Automatically falls back to `AthleteSvg` if WebGL is unavailable or context is lost.
 * - Exposes a compact 3D / 2D quick toggle on full stages.
 */
export function ExerciseDemonstrator({
  animationType,
  muscleGroup,
  speedMultiplier,
  weightLabel,
  variant = 'default',
  paused = false,
  preferredMode,
}: ExerciseDemonstratorProps) {
  const isCompact = variant === 'compact';
  const [webglAvailable, setWebglAvailable] = useState<boolean>(() =>
    isCompact || preferredMode === '2d' ? false : detectWebGLSupport(),
  );
  const [userMode, setUserMode] = useState<DemonstratorMode>(preferredMode ?? '3d');

  const handleFallback = useCallback(() => {
    setWebglAvailable(false);
  }, []);

  if (isCompact) {
    return (
      <AthleteSvg
        animationType={animationType}
        muscleGroup={muscleGroup}
        speedMultiplier={speedMultiplier}
        weightLabel={weightLabel}
        variant="flex"
      />
    );
  }

  const effectiveMode: DemonstratorMode = webglAvailable && userMode === '3d' ? '3d' : '2d';
  const isFlex = variant === 'flex';
  const showModeToggle = webglAvailable && preferredMode === undefined;

  const svgFallback = (
    <AthleteSvg
      animationType={animationType}
      muscleGroup={muscleGroup}
      speedMultiplier={speedMultiplier}
      weightLabel={weightLabel}
      variant={isFlex ? 'flex' : 'default'}
      hideBadge={showModeToggle && !isFlex}
    />
  );

  return (
    <div
      data-testid="exercise-demonstrator"
      data-mode={effectiveMode}
      class={
        isFlex
          ? 'relative w-full h-full min-h-0 flex items-center justify-center'
          : 'relative w-full h-full flex items-center justify-center'
      }
    >
      {showModeToggle && (
        <div
          role="group"
          aria-label="Demonstrator view mode"
          class={
            isFlex
              ? 'absolute bottom-2.5 left-3 z-20 flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950/85 border border-slate-700/80 shadow-lg text-[10px]'
              : 'absolute top-2.5 left-3 sm:top-3.5 sm:left-4 z-20 flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950/85 border border-slate-800 text-[10px]'
          }
        >
          <button
            type="button"
            data-testid="demonstrator-mode-3d"
            aria-pressed={effectiveMode === '3d'}
            onClick={() => setUserMode('3d')}
            class={`px-2 py-0.5 rounded-md font-bold tracking-wide transition ${
              effectiveMode === '3d'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            3D
          </button>
          <button
            type="button"
            data-testid="demonstrator-mode-2d"
            aria-pressed={effectiveMode === '2d'}
            onClick={() => setUserMode('2d')}
            class={`px-2 py-0.5 rounded-md font-bold tracking-wide transition ${
              effectiveMode === '2d'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            2D
          </button>
        </div>
      )}

      {effectiveMode === '3d' ? (
        <Suspense fallback={svgFallback}>
          <LazyStage3D
            animationType={animationType}
            muscleGroup={muscleGroup}
            speedMultiplier={speedMultiplier}
            weightLabel={weightLabel}
            variant={isFlex ? 'flex' : 'default'}
            paused={paused}
            onFallback={handleFallback}
          />
        </Suspense>
      ) : (
        svgFallback
      )}
    </div>
  );
}
