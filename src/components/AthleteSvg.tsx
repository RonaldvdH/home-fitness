import { useEffect, useRef } from 'preact/hooks';
import type { AnimationId } from '../domain/schema';
import { computeAnimationFrame } from '../engine/animations';
import { resolveMuscleHighlights, type MuscleHighlightMap } from '../engine/muscleHighlights';
import { applyHighlightsToSvg, applyPoseToSvg, type AthleteSvgRefs } from './athleteSvgDom';

export interface AthleteSvgProps {
  animationType: AnimationId;
  muscleGroup?: string;
  speedMultiplier: number;
  weightLabel: string | null;
  variant?: 'default' | 'flex';
  hideBadge?: boolean;
  onCueIndexChange?: (cueIndex: 0 | 1 | 2 | 3) => void;
}

function SvgDumbbell({
  groupRef,
  testId,
  badgeText,
}: {
  groupRef: AthleteSvgRefs['dumbbellLeft'];
  testId: string;
  badgeText: string;
}) {
  return (
    <g ref={groupRef} data-testid={testId}>
      <rect x="-18" y="-3.5" width="36" height="7" rx="2" fill="#94a3b8" />
      <rect
        x="-21"
        y="-10"
        width="7"
        height="20"
        rx="2"
        fill="#f8fafc"
        stroke="#0f172a"
        stroke-width="1.5"
      />
      <rect
        x="14"
        y="-10"
        width="7"
        height="20"
        rx="2"
        fill="#f8fafc"
        stroke="#0f172a"
        stroke-width="1.5"
      />
      <text
        x="0"
        y="2.5"
        text-anchor="middle"
        font-size="6.5"
        font-weight="800"
        fill="#0f172a"
        font-family="Inter, sans-serif"
      >
        {badgeText}
      </text>
    </g>
  );
}

export function AthleteSvg({
  animationType,
  muscleGroup,
  speedMultiplier,
  weightLabel,
  variant = 'default',
  hideBadge = false,
  onCueIndexChange,
}: AthleteSvgProps) {
  const showDumbbells = weightLabel !== null;

  const refs: AthleteSvgRefs = {
    floor: useRef<SVGLineElement>(null),
    motionGuide: useRef<SVGPathElement>(null),
    head: useRef<SVGCircleElement>(null),
    upperTorso: useRef<SVGLineElement>(null),
    coreTorso: useRef<SVGLineElement>(null),
    pelvis: useRef<SVGCircleElement>(null),
    clavicle: useRef<SVGLineElement>(null),
    leftThigh: useRef<SVGLineElement>(null),
    leftShin: useRef<SVGLineElement>(null),
    rightThigh: useRef<SVGLineElement>(null),
    rightShin: useRef<SVGLineElement>(null),
    footLeft: useRef<SVGLineElement>(null),
    footRight: useRef<SVGLineElement>(null),
    leftUpperArm: useRef<SVGLineElement>(null),
    leftForearm: useRef<SVGLineElement>(null),
    leftElbow: useRef<SVGCircleElement>(null),
    dumbbellLeft: useRef<SVGGElement>(null),
    rightUpperArm: useRef<SVGLineElement>(null),
    rightForearm: useRef<SVGLineElement>(null),
    rightElbow: useRef<SVGCircleElement>(null),
    dumbbellRight: useRef<SVGGElement>(null),
  };

  const refsRef = useRef(refs);
  refsRef.current = refs;

  const animTypeRef = useRef<AnimationId>(animationType);
  const highlightsRef = useRef<MuscleHighlightMap>(
    resolveMuscleHighlights(animationType, muscleGroup),
  );
  const speedRef = useRef<number>(speedMultiplier);
  const showDumbbellsRef = useRef<boolean>(showDumbbells);
  const onCueIndexChangeRef = useRef(onCueIndexChange);
  const lastCueIndexRef = useRef<number>(-1);
  const phaseTimeRef = useRef<number>(0);

  animTypeRef.current = animationType;
  highlightsRef.current = resolveMuscleHighlights(animationType, muscleGroup);
  speedRef.current = speedMultiplier;
  showDumbbellsRef.current = showDumbbells;
  onCueIndexChangeRef.current = onCueIndexChange;

  useEffect(() => {
    const paintFrame = (rawT: number): void => {
      const frame = computeAnimationFrame(animTypeRef.current, rawT);
      if (frame.cueIndex !== lastCueIndexRef.current) {
        lastCueIndexRef.current = frame.cueIndex;
        onCueIndexChangeRef.current?.(frame.cueIndex);
      }
      applyPoseToSvg(
        refsRef.current,
        frame.pose,
        highlightsRef.current,
        showDumbbellsRef.current,
        frame.progress,
      );
    };

    // Paint initial frame immediately so first paint and unit tests are accurate.
    paintFrame(0);

    let rafId: number | null = null;
    let lastTimestamp = 0;

    const tick = (timestamp: number): void => {
      if (document.hidden) {
        lastTimestamp = 0;
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const dt = Math.min(0.1, Math.max(0, (timestamp - lastTimestamp) / 1000));
      lastTimestamp = timestamp;

      const cycleDuration = 3.2 / Math.max(0.5, speedRef.current);
      phaseTimeRef.current = (phaseTimeRef.current + dt) % cycleDuration;
      paintFrame(phaseTimeRef.current / cycleDuration);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Re-sync immediately when exercise type, muscle highlight, or weight visibility changes.
  useEffect(() => {
    phaseTimeRef.current = 0;
    lastCueIndexRef.current = 0;
    const frame = computeAnimationFrame(animationType, 0);
    const highlights = resolveMuscleHighlights(animationType, muscleGroup);
    highlightsRef.current = highlights;

    applyHighlightsToSvg(refsRef.current, highlights, false);
    onCueIndexChangeRef.current?.(frame.cueIndex);
    if (refsRef.current.dumbbellLeft.current) {
      refsRef.current.dumbbellLeft.current.style.display =
        showDumbbells && frame.pose.leftArm && !frame.pose.hideLeftDumbbell ? 'inline' : 'none';
    }
    if (refsRef.current.dumbbellRight.current) {
      refsRef.current.dumbbellRight.current.style.display = showDumbbells ? 'inline' : 'none';
    }
  }, [animationType, muscleGroup, showDumbbells]);

  const badgeText = weightLabel ?? '';
  const isFlex = variant === 'flex';

  return (
    <>
      {!isFlex && !hideBadge && (
        <div class="absolute top-3 left-3 sm:top-3.5 sm:left-4 flex items-center gap-1.5 sm:gap-2">
          <span
            class="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"
            aria-hidden="true"
          />
          <span class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider sm:tracking-widest text-slate-400">
            60 FPS Guide
          </span>
        </div>
      )}

      {!isFlex && (
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
      )}

      <svg
        viewBox="0 0 320 280"
        role="img"
        aria-label="Animated exercise form demonstrator"
        class={
          isFlex
            ? 'w-full h-full max-h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]'
            : 'w-full h-full max-h-[330px] drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]'
        }
      >
        <line
          ref={refs.floor}
          x1="45"
          y1="248"
          x2="275"
          y2="248"
          stroke="#334155"
          stroke-width="3"
          stroke-linecap="round"
        />
        <line
          x1="75"
          y1="255"
          x2="245"
          y2="255"
          stroke="#1e293b"
          stroke-width="1.5"
          stroke-linecap="round"
        />

        <path
          ref={refs.motionGuide}
          d=""
          fill="none"
          stroke="#10b981"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          opacity="0.35"
        />

        <g>
          <line
            ref={refs.leftThigh}
            data-muscle-region="thighs"
            x1="160"
            y1="158"
            x2="144"
            y2="202"
            stroke="#64748b"
            stroke-width="10"
            stroke-linecap="round"
          />
          <line
            ref={refs.leftShin}
            data-muscle-region="calves"
            x1="144"
            y1="202"
            x2="138"
            y2="246"
            stroke="#94a3b8"
            stroke-width="9"
            stroke-linecap="round"
          />
          <line
            ref={refs.rightThigh}
            data-muscle-region="thighs"
            x1="160"
            y1="158"
            x2="176"
            y2="202"
            stroke="#64748b"
            stroke-width="10"
            stroke-linecap="round"
          />
          <line
            ref={refs.rightShin}
            data-muscle-region="calves"
            x1="176"
            y1="202"
            x2="182"
            y2="246"
            stroke="#94a3b8"
            stroke-width="9"
            stroke-linecap="round"
          />
          <line
            ref={refs.footLeft}
            x1="128"
            y1="246"
            x2="142"
            y2="246"
            stroke="#cbd5e1"
            stroke-width="5"
            stroke-linecap="round"
          />
          <line
            ref={refs.footRight}
            x1="178"
            y1="246"
            x2="192"
            y2="246"
            stroke="#f8fafc"
            stroke-width="5"
            stroke-linecap="round"
          />
          <line
            ref={refs.coreTorso}
            data-muscle-region="core"
            x1="160"
            y1="158"
            x2="160"
            y2="126"
            stroke="#64748b"
            stroke-width="13"
            stroke-linecap="round"
          />
          <line
            ref={refs.upperTorso}
            data-muscle-region="chestBack"
            x1="160"
            y1="126"
            x2="160"
            y2="92"
            stroke="#cbd5e1"
            stroke-width="15"
            stroke-linecap="round"
          />
          <circle
            ref={refs.pelvis}
            data-muscle-region="glutes"
            cx="160"
            cy="158"
            r="8.5"
            fill="#475569"
          />
          <line
            ref={refs.clavicle}
            data-muscle-region="shoulders"
            x1="140"
            y1="94"
            x2="180"
            y2="94"
            stroke="#cbd5e1"
            stroke-width="9"
            stroke-linecap="round"
          />
          <circle
            ref={refs.head}
            cx="160"
            cy="62"
            r="16"
            fill="#0f172a"
            stroke="#e2e8f0"
            stroke-width="4"
          />
        </g>

        <g>
          <line
            ref={refs.leftUpperArm}
            data-muscle-region="upperArms"
            x1="140"
            y1="94"
            x2="116"
            y2="116"
            stroke="#94a3b8"
            stroke-width="9"
            stroke-linecap="round"
          />
          <line
            ref={refs.leftForearm}
            data-muscle-region="forearms"
            x1="116"
            y1="116"
            x2="114"
            y2="82"
            stroke="#64748b"
            stroke-width="8"
            stroke-linecap="round"
          />
          <circle ref={refs.leftElbow} cx="116" cy="116" r="4" fill="#94a3b8" />

          <line
            ref={refs.rightUpperArm}
            data-muscle-region="upperArms"
            x1="180"
            y1="94"
            x2="204"
            y2="116"
            stroke="#94a3b8"
            stroke-width="9"
            stroke-linecap="round"
          />
          <line
            ref={refs.rightForearm}
            data-muscle-region="forearms"
            x1="204"
            y1="116"
            x2="206"
            y2="82"
            stroke="#64748b"
            stroke-width="8"
            stroke-linecap="round"
          />
          <circle ref={refs.rightElbow} cx="204" cy="116" r="4" fill="#94a3b8" />

          <SvgDumbbell groupRef={refs.dumbbellLeft} testId="dumbbell-left" badgeText={badgeText} />
          <SvgDumbbell
            groupRef={refs.dumbbellRight}
            testId="dumbbell-right"
            badgeText={badgeText}
          />
        </g>
      </svg>
    </>
  );
}
