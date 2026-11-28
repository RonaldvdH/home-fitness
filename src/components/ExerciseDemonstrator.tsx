import { lazy, Suspense } from 'preact/compat';
import { useCallback, useRef, useState } from 'preact/hooks';
import type { AnimationId } from '../domain/schema';
import { getAnimationDefinition, getBreathCues } from '../engine/animations';
import { AthleteSvg } from './AthleteSvg';
import { ErrorBoundary } from './ErrorBoundary';
import { SegmentedControl } from './ui/segmented-control';

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
  const cueItemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const breathBadgeRef = useRef<HTMLSpanElement | null>(null);
  const breathCues = getBreathCues(animationType);
  const breathCuesRef = useRef(breathCues);
  breathCuesRef.current = breathCues;

  const handleFallback = useCallback(() => {
    setWebglAvailable(false);
  }, []);

  const handleCueIndexChange = useCallback((activeIdx: 0 | 1 | 2 | 3) => {
    for (let i = 0; i < 4; i += 1) {
      const el = cueItemRefs.current[i];
      if (!el) continue;
      const next = i === activeIdx ? 'true' : 'false';
      if (el.dataset.active !== next) {
        el.dataset.active = next;
      }
    }
    const breathEl = breathBadgeRef.current;
    const cues = breathCuesRef.current;
    if (breathEl && cues) {
      const nextText = cues[activeIdx];
      if (breathEl.textContent !== nextText) {
        breathEl.textContent = nextText;
      }
    }
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
  const phaseCues = getAnimationDefinition(animationType).cues;

  const svgFallback = (
    <AthleteSvg
      animationType={animationType}
      muscleGroup={muscleGroup}
      speedMultiplier={speedMultiplier}
      weightLabel={weightLabel}
      variant={isFlex ? 'flex' : 'default'}
      hideBadge={showModeToggle && !isFlex}
      onCueIndexChange={isFlex ? undefined : handleCueIndexChange}
    />
  );

  const stageCanvas =
    effectiveMode === '3d' ? (
      <ErrorBoundary fallback={svgFallback} onError={handleFallback}>
        <Suspense fallback={svgFallback}>
          <LazyStage3D
            animationType={animationType}
            muscleGroup={muscleGroup}
            speedMultiplier={speedMultiplier}
            weightLabel={weightLabel}
            variant={isFlex ? 'flex' : 'default'}
            paused={paused}
            onCueIndexChange={isFlex ? undefined : handleCueIndexChange}
            onFallback={handleFallback}
          />
        </Suspense>
      </ErrorBoundary>
    ) : (
      svgFallback
    );

  return (
    <div
      data-testid="exercise-demonstrator"
      data-mode={effectiveMode}
      class={
        isFlex
          ? 'relative w-full h-full min-h-0 flex items-center justify-center'
          : 'relative w-full h-full flex flex-col'
      }
    >
      <div
        class={
          isFlex
            ? 'relative w-full h-full min-h-0 flex items-center justify-center'
            : 'relative flex-1 min-h-0 w-full flex items-center justify-center'
        }
      >
        {showModeToggle && (
          <SegmentedControl<DemonstratorMode>
            value={effectiveMode}
            onChange={setUserMode}
            ariaLabel="Demonstrator view mode"
            size="xs"
            options={[
              { value: '3d', label: '3D', testId: 'demonstrator-mode-3d' },
              { value: '2d', label: '2D', testId: 'demonstrator-mode-2d' },
            ]}
            className={
              isFlex
                ? 'absolute bottom-2.5 left-3 z-20 border-slate-700/80 shadow-lg'
                : 'absolute top-2.5 left-3 sm:top-3.5 sm:left-4 z-20'
            }
          />
        )}

        {breathCues && (
          <div
            data-testid="live-breath-cue"
            class="absolute bottom-2.5 right-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/35 backdrop-blur-sm text-[11px] font-semibold text-sky-200 pointer-events-none"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" aria-hidden="true" />
            <span ref={breathBadgeRef}>{breathCues[0]}</span>
          </div>
        )}

        {stageCanvas}
      </div>

      {!isFlex && (
        <ol
          data-testid="live-rep-cue"
          aria-label="Repetition tempo cues"
          class="mt-2 pt-2 border-t border-slate-800/70 grid grid-cols-2 gap-1.5 w-full shrink-0"
        >
          {phaseCues.map((cueText, idx) => (
            <li
              key={idx}
              ref={(el) => {
                cueItemRefs.current[idx] = el;
              }}
              data-active={idx === 0 ? 'true' : 'false'}
              class="group min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/70 text-[11px] leading-tight font-medium text-slate-400 transition-colors duration-300 data-[active=true]:bg-emerald-500/10 data-[active=true]:border-emerald-500/30 data-[active=true]:text-emerald-200"
            >
              <span
                class="w-1.5 h-1.5 rounded-full bg-slate-600 group-data-[active=true]:bg-emerald-400 transition-colors duration-300 shrink-0"
                aria-hidden="true"
              />
              <span class="min-w-0 break-words">{cueText}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
