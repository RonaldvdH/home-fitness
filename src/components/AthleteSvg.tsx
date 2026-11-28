import { useEffect, useRef } from 'preact/hooks';
import type { AnimationId } from '../domain/schema';
import { computeAnimationFrame, lerp, type AthletePose } from '../engine/animations';
import {
  getRegionColorSpec,
  resolveMuscleHighlights,
  type BodyRegion,
  type MuscleHighlightMap,
} from '../engine/muscleHighlights';

export interface AthleteSvgProps {
  animationType: AnimationId;
  muscleGroup?: string;
  speedMultiplier: number;
  weightLabel: string | null;
  variant?: 'default' | 'flex';
  hideBadge?: boolean;
}

function setLineAttrs(
  el: SVGLineElement | null,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  if (!el) return;
  el.setAttribute('x1', x1.toFixed(1));
  el.setAttribute('y1', y1.toFixed(1));
  el.setAttribute('x2', x2.toFixed(1));
  el.setAttribute('y2', y2.toFixed(1));
}

function setDumbbellTransform(
  el: SVGGElement | null,
  x: number,
  y: number,
  angleDeg: number,
  scaleX = 1,
): void {
  if (!el) return;
  const scalePart = Math.abs(scaleX - 1) > 0.005 ? ` scale(${scaleX.toFixed(2)}, 1)` : '';
  el.setAttribute(
    'transform',
    `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})${scalePart}`,
  );
}

function setRegionStroke(
  el: SVGElement | null,
  region: BodyRegion,
  highlights: MuscleHighlightMap,
  atPeak: boolean,
): void {
  if (!el) return;
  const level = highlights[region];
  const spec = getRegionColorSpec(region, level);
  const color = atPeak ? spec.peakHex : spec.hex;
  if (el.getAttribute('stroke') !== color) {
    el.setAttribute('stroke', color);
  }
  if (el.getAttribute('data-highlight') !== level) {
    el.setAttribute('data-highlight', level);
  }
}

function setRegionFill(
  el: SVGElement | null,
  region: BodyRegion,
  highlights: MuscleHighlightMap,
  atPeak: boolean,
): void {
  if (!el) return;
  const level = highlights[region];
  const spec = getRegionColorSpec(region, level);
  const color = atPeak ? spec.peakHex : spec.hex;
  if (el.getAttribute('fill') !== color) {
    el.setAttribute('fill', color);
  }
  if (el.getAttribute('data-highlight') !== level) {
    el.setAttribute('data-highlight', level);
  }
}

export function AthleteSvg({
  animationType,
  muscleGroup,
  speedMultiplier,
  weightLabel,
  variant = 'default',
  hideBadge = false,
}: AthleteSvgProps) {
  const showDumbbells = weightLabel !== null;

  const cueRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<SVGLineElement>(null);
  const motionGuideRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const upperTorsoRef = useRef<SVGLineElement>(null);
  const coreTorsoRef = useRef<SVGLineElement>(null);
  const pelvisRef = useRef<SVGCircleElement>(null);
  const clavicleRef = useRef<SVGLineElement>(null);

  const leftThighRef = useRef<SVGLineElement>(null);
  const leftShinRef = useRef<SVGLineElement>(null);
  const rightThighRef = useRef<SVGLineElement>(null);
  const rightShinRef = useRef<SVGLineElement>(null);
  const footLeftRef = useRef<SVGLineElement>(null);
  const footRightRef = useRef<SVGLineElement>(null);

  const leftUpperArmRef = useRef<SVGLineElement>(null);
  const leftForearmRef = useRef<SVGLineElement>(null);
  const leftElbowRef = useRef<SVGCircleElement>(null);
  const dumbbellLeftRef = useRef<SVGGElement>(null);

  const rightUpperArmRef = useRef<SVGLineElement>(null);
  const rightForearmRef = useRef<SVGLineElement>(null);
  const rightElbowRef = useRef<SVGCircleElement>(null);
  const dumbbellRightRef = useRef<SVGGElement>(null);

  const animTypeRef = useRef<AnimationId>(animationType);
  const highlightsRef = useRef<MuscleHighlightMap>(
    resolveMuscleHighlights(animationType, muscleGroup),
  );
  const speedRef = useRef<number>(speedMultiplier);
  const showDumbbellsRef = useRef<boolean>(showDumbbells);
  const phaseTimeRef = useRef<number>(0);

  animTypeRef.current = animationType;
  highlightsRef.current = resolveMuscleHighlights(animationType, muscleGroup);
  speedRef.current = speedMultiplier;
  showDumbbellsRef.current = showDumbbells;

  useEffect(() => {
    const applyHighlights = (highlights: MuscleHighlightMap, atPeak: boolean): void => {
      setRegionStroke(clavicleRef.current, 'shoulders', highlights, atPeak);
      setRegionStroke(upperTorsoRef.current, 'chestBack', highlights, atPeak);
      setRegionStroke(coreTorsoRef.current, 'core', highlights, atPeak);
      setRegionFill(pelvisRef.current, 'glutes', highlights, atPeak);

      setRegionStroke(leftThighRef.current, 'thighs', highlights, atPeak);
      setRegionStroke(rightThighRef.current, 'thighs', highlights, atPeak);
      setRegionStroke(leftShinRef.current, 'calves', highlights, atPeak);
      setRegionStroke(rightShinRef.current, 'calves', highlights, atPeak);

      setRegionStroke(leftUpperArmRef.current, 'upperArms', highlights, atPeak);
      setRegionStroke(rightUpperArmRef.current, 'upperArms', highlights, atPeak);
      setRegionFill(leftElbowRef.current, 'upperArms', highlights, atPeak);
      setRegionFill(rightElbowRef.current, 'upperArms', highlights, atPeak);
      setRegionStroke(leftForearmRef.current, 'forearms', highlights, atPeak);
      setRegionStroke(rightForearmRef.current, 'forearms', highlights, atPeak);
    };

    const applyPose = (
      pose: AthletePose,
      cue: string,
      includeDumbbells: boolean,
      progress: number,
    ): void => {
      applyHighlights(highlightsRef.current, progress > 0.45);

      if (cueRef.current && cueRef.current.textContent !== cue) {
        cueRef.current.textContent = cue;
      }

      if (floorRef.current) {
        const floorStr = pose.floorY.toFixed(1);
        floorRef.current.setAttribute('y1', floorStr);
        floorRef.current.setAttribute('y2', floorStr);
      }

      if (motionGuideRef.current) {
        motionGuideRef.current.setAttribute('d', pose.motionGuidePath);
      }

      if (headRef.current) {
        headRef.current.setAttribute('cx', pose.head.x.toFixed(1));
        headRef.current.setAttribute('cy', pose.head.y.toFixed(1));
      }

      const midX = lerp(pose.torsoHip.x, pose.torsoShoulder.x, 0.48);
      const midY = lerp(pose.torsoHip.y, pose.torsoShoulder.y, 0.48);

      setLineAttrs(coreTorsoRef.current, pose.torsoHip.x, pose.torsoHip.y, midX, midY);
      setLineAttrs(upperTorsoRef.current, midX, midY, pose.torsoShoulder.x, pose.torsoShoulder.y);
      if (pelvisRef.current) {
        pelvisRef.current.setAttribute('cx', pose.torsoHip.x.toFixed(1));
        pelvisRef.current.setAttribute('cy', pose.torsoHip.y.toFixed(1));
      }

      setLineAttrs(
        clavicleRef.current,
        pose.clavicleStart.x,
        pose.clavicleStart.y,
        pose.clavicleEnd.x,
        pose.clavicleEnd.y,
      );

      setLineAttrs(
        leftThighRef.current,
        pose.legLeft[0].x,
        pose.legLeft[0].y,
        pose.legLeft[1].x,
        pose.legLeft[1].y,
      );
      setLineAttrs(
        leftShinRef.current,
        pose.legLeft[1].x,
        pose.legLeft[1].y,
        pose.legLeft[2].x,
        pose.legLeft[2].y,
      );
      setLineAttrs(
        rightThighRef.current,
        pose.legRight[0].x,
        pose.legRight[0].y,
        pose.legRight[1].x,
        pose.legRight[1].y,
      );
      setLineAttrs(
        rightShinRef.current,
        pose.legRight[1].x,
        pose.legRight[1].y,
        pose.legRight[2].x,
        pose.legRight[2].y,
      );

      if (footLeftRef.current) {
        if (pose.footLeft) {
          footLeftRef.current.style.display = 'inline';
          setLineAttrs(
            footLeftRef.current,
            pose.footLeft[0].x,
            pose.footLeft[0].y,
            pose.footLeft[1].x,
            pose.footLeft[1].y,
          );
        } else {
          footLeftRef.current.style.display = 'none';
        }
      }

      setLineAttrs(
        footRightRef.current,
        pose.footRight[0].x,
        pose.footRight[0].y,
        pose.footRight[1].x,
        pose.footRight[1].y,
      );

      if (pose.leftArm) {
        if (leftUpperArmRef.current) leftUpperArmRef.current.style.display = 'inline';
        if (leftForearmRef.current) leftForearmRef.current.style.display = 'inline';
        if (leftElbowRef.current) leftElbowRef.current.style.display = 'inline';
        setLineAttrs(
          leftUpperArmRef.current,
          pose.leftArm.shoulder.x,
          pose.leftArm.shoulder.y,
          pose.leftArm.elbow.x,
          pose.leftArm.elbow.y,
        );
        setLineAttrs(
          leftForearmRef.current,
          pose.leftArm.elbow.x,
          pose.leftArm.elbow.y,
          pose.leftArm.hand.x,
          pose.leftArm.hand.y,
        );
        if (leftElbowRef.current) {
          leftElbowRef.current.setAttribute('cx', pose.leftArm.elbow.x.toFixed(1));
          leftElbowRef.current.setAttribute('cy', pose.leftArm.elbow.y.toFixed(1));
        }
        if (dumbbellLeftRef.current) {
          const showLeftDb = includeDumbbells && !pose.hideLeftDumbbell;
          dumbbellLeftRef.current.style.display = showLeftDb ? 'inline' : 'none';
          if (showLeftDb) {
            setDumbbellTransform(
              dumbbellLeftRef.current,
              pose.leftArm.hand.x,
              pose.leftArm.hand.y,
              pose.leftArm.dumbbellAngleDeg,
              pose.leftArm.dumbbellScaleX,
            );
          }
        }
      } else {
        if (leftUpperArmRef.current) leftUpperArmRef.current.style.display = 'none';
        if (leftForearmRef.current) leftForearmRef.current.style.display = 'none';
        if (leftElbowRef.current) leftElbowRef.current.style.display = 'none';
        if (dumbbellLeftRef.current) dumbbellLeftRef.current.style.display = 'none';
      }

      setLineAttrs(
        rightUpperArmRef.current,
        pose.rightArm.shoulder.x,
        pose.rightArm.shoulder.y,
        pose.rightArm.elbow.x,
        pose.rightArm.elbow.y,
      );
      setLineAttrs(
        rightForearmRef.current,
        pose.rightArm.elbow.x,
        pose.rightArm.elbow.y,
        pose.rightArm.hand.x,
        pose.rightArm.hand.y,
      );
      if (rightElbowRef.current) {
        rightElbowRef.current.setAttribute('cx', pose.rightArm.elbow.x.toFixed(1));
        rightElbowRef.current.setAttribute('cy', pose.rightArm.elbow.y.toFixed(1));
      }
      if (dumbbellRightRef.current) {
        dumbbellRightRef.current.style.display = includeDumbbells ? 'inline' : 'none';
        if (includeDumbbells) {
          setDumbbellTransform(
            dumbbellRightRef.current,
            pose.rightArm.hand.x,
            pose.rightArm.hand.y,
            pose.rightArm.dumbbellAngleDeg,
            pose.rightArm.dumbbellScaleX,
          );
        }
      }
    };

    // Paint initial frame immediately so first paint and unit tests are accurate.
    const initial = computeAnimationFrame(animTypeRef.current, 0);
    applyPose(initial.pose, initial.cue, showDumbbellsRef.current, initial.progress);

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
      const rawT = phaseTimeRef.current / cycleDuration;

      const frame = computeAnimationFrame(animTypeRef.current, rawT);
      applyPose(frame.pose, frame.cue, showDumbbellsRef.current, frame.progress);

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
    const frame = computeAnimationFrame(animationType, 0);
    const highlights = resolveMuscleHighlights(animationType, muscleGroup);
    highlightsRef.current = highlights;

    setRegionStroke(clavicleRef.current, 'shoulders', highlights, false);
    setRegionStroke(upperTorsoRef.current, 'chestBack', highlights, false);
    setRegionStroke(coreTorsoRef.current, 'core', highlights, false);
    setRegionFill(pelvisRef.current, 'glutes', highlights, false);
    setRegionStroke(leftThighRef.current, 'thighs', highlights, false);
    setRegionStroke(rightThighRef.current, 'thighs', highlights, false);
    setRegionStroke(leftShinRef.current, 'calves', highlights, false);
    setRegionStroke(rightShinRef.current, 'calves', highlights, false);
    setRegionStroke(leftUpperArmRef.current, 'upperArms', highlights, false);
    setRegionStroke(rightUpperArmRef.current, 'upperArms', highlights, false);
    setRegionFill(leftElbowRef.current, 'upperArms', highlights, false);
    setRegionFill(rightElbowRef.current, 'upperArms', highlights, false);
    setRegionStroke(leftForearmRef.current, 'forearms', highlights, false);
    setRegionStroke(rightForearmRef.current, 'forearms', highlights, false);

    if (cueRef.current) cueRef.current.textContent = frame.cue;
    if (dumbbellLeftRef.current) {
      dumbbellLeftRef.current.style.display =
        showDumbbells && frame.pose.leftArm && !frame.pose.hideLeftDumbbell ? 'inline' : 'none';
    }
    if (dumbbellRightRef.current) {
      dumbbellRightRef.current.style.display = showDumbbells ? 'inline' : 'none';
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

      <div
        ref={cueRef}
        data-testid="live-rep-cue"
        class={
          isFlex
            ? 'absolute bottom-2.5 right-3 max-w-[65%] truncate px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-700/80 text-xs font-mono font-semibold text-emerald-300 shadow-lg'
            : 'absolute top-2.5 right-3 sm:top-3.5 sm:right-4 max-w-[52%] truncate px-2 sm:px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] sm:text-xs font-mono font-semibold text-emerald-300'
        }
      >
        Controlled Tempo
      </div>

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
          ref={floorRef}
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
          ref={motionGuideRef}
          d=""
          fill="none"
          stroke="#10b981"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          opacity="0.35"
        />

        <g>
          <line
            ref={leftThighRef}
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
            ref={leftShinRef}
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
            ref={rightThighRef}
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
            ref={rightShinRef}
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
            ref={footLeftRef}
            x1="128"
            y1="246"
            x2="142"
            y2="246"
            stroke="#cbd5e1"
            stroke-width="5"
            stroke-linecap="round"
          />
          <line
            ref={footRightRef}
            x1="178"
            y1="246"
            x2="192"
            y2="246"
            stroke="#f8fafc"
            stroke-width="5"
            stroke-linecap="round"
          />
          <line
            ref={coreTorsoRef}
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
            ref={upperTorsoRef}
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
            ref={pelvisRef}
            data-muscle-region="glutes"
            cx="160"
            cy="158"
            r="8.5"
            fill="#475569"
          />
          <line
            ref={clavicleRef}
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
            ref={headRef}
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
            ref={leftUpperArmRef}
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
            ref={leftForearmRef}
            data-muscle-region="forearms"
            x1="116"
            y1="116"
            x2="114"
            y2="82"
            stroke="#64748b"
            stroke-width="8"
            stroke-linecap="round"
          />
          <circle ref={leftElbowRef} cx="116" cy="116" r="4" fill="#94a3b8" />

          <line
            ref={rightUpperArmRef}
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
            ref={rightForearmRef}
            data-muscle-region="forearms"
            x1="204"
            y1="116"
            x2="206"
            y2="82"
            stroke="#64748b"
            stroke-width="8"
            stroke-linecap="round"
          />
          <circle ref={rightElbowRef} cx="204" cy="116" r="4" fill="#94a3b8" />

          <g ref={dumbbellLeftRef} data-testid="dumbbell-left">
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

          <g ref={dumbbellRightRef} data-testid="dumbbell-right">
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
        </g>
      </svg>
    </>
  );
}
