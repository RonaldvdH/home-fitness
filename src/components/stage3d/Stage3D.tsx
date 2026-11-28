import { useEffect, useRef, useState } from 'preact/hooks';
import type { AnimationId } from '../../domain/schema';
import { createStage3DController, type Stage3DController } from './threeScene';

export interface Stage3DProps {
  animationType: AnimationId;
  muscleGroup?: string;
  speedMultiplier: number;
  weightLabel: string | null;
  variant?: 'default' | 'flex';
  paused?: boolean;
  onCueIndexChange?: (cueIndex: 0 | 1 | 2 | 3) => void;
  onFallback: () => void;
}

export function Stage3D({
  animationType,
  muscleGroup,
  speedMultiplier,
  weightLabel,
  variant = 'default',
  paused = false,
  onCueIndexChange,
  onFallback,
}: Stage3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Stage3DController | null>(null);
  const onCueIndexChangeRef = useRef(onCueIndexChange);
  onCueIndexChangeRef.current = onCueIndexChange;
  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;

  const [isOrbited, setIsOrbited] = useState(false);

  const initialPropsRef = useRef({
    animationType,
    muscleGroup,
    speedMultiplier,
    weightLabel,
    paused,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let controller: Stage3DController | null = null;
    try {
      controller = createStage3DController({
        container: host,
        initialAnimation: initialPropsRef.current.animationType,
        initialMuscleGroup: initialPropsRef.current.muscleGroup,
        initialSpeed: initialPropsRef.current.speedMultiplier,
        initialWeightLabel: initialPropsRef.current.weightLabel,
        paused: initialPropsRef.current.paused,
        onCueIndexChange: (cueIndex) => {
          onCueIndexChangeRef.current?.(cueIndex);
        },
        onOrbitChange: (orbited) => {
          setIsOrbited(orbited);
        },
        onContextLost: () => {
          onFallbackRef.current();
        },
      });
      controllerRef.current = controller;
    } catch {
      onFallbackRef.current();
      return;
    }

    return () => {
      controllerRef.current = null;
      controller?.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setAnimation(animationType, muscleGroup);
  }, [animationType, muscleGroup]);

  useEffect(() => {
    controllerRef.current?.setSpeed(speedMultiplier);
  }, [speedMultiplier]);

  useEffect(() => {
    controllerRef.current?.setWeightLabel(weightLabel);
  }, [weightLabel]);

  useEffect(() => {
    controllerRef.current?.setPaused(paused);
  }, [paused]);

  const isFlex = variant === 'flex';

  return (
    <>
      <div
        ref={hostRef}
        data-testid="stage-3d-host"
        class={isFlex ? 'w-full h-full min-h-0' : 'w-full h-[250px] sm:h-full sm:min-h-[340px]'}
      />

      {isOrbited ? (
        <button
          type="button"
          data-testid="stage-3d-reset-view"
          onClick={() => controllerRef.current?.resetOrbit()}
          class={
            isFlex
              ? 'absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 shadow-lg transition whitespace-nowrap'
              : 'absolute bottom-3 left-3 sm:bottom-3.5 sm:left-4 z-20 px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 transition whitespace-nowrap'
          }
        >
          Reset View
        </button>
      ) : (
        !isFlex && (
          <>
            <div
              data-testid="muscle-highlight-legend"
              class="pointer-events-none absolute bottom-2.5 left-3 sm:bottom-3 sm:left-4 z-10 flex items-center gap-2.5 text-[10px] font-medium text-slate-400"
            >
              <span class="inline-flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Primary
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
                Secondary
              </span>
            </div>
            <span class="pointer-events-none absolute bottom-2.5 right-3 sm:bottom-3 sm:right-4 z-10 text-[10px] font-medium text-slate-500">
              Drag to orbit
            </span>
          </>
        )
      )}
    </>
  );
}
