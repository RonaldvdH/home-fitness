import { useEffect, useRef } from 'preact/hooks';
import type { AnimationId } from '../domain/schema';
import { computeAnimationFrame, type AthletePose, type Point2D } from '../engine/animations';

export interface AthleteSvgProps {
  animationType: AnimationId;
  speedMultiplier: number;
  weightLabel: string | null;
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

function formatPoints(points: readonly [Point2D, Point2D, Point2D]): string {
  return points.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
}

function setDumbbellTransform(
  el: SVGGElement | null,
  x: number,
  y: number,
  angleDeg: number,
): void {
  if (!el) return;
  el.setAttribute(
    'transform',
    `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})`,
  );
}

export function AthleteSvg({ animationType, speedMultiplier, weightLabel }: AthleteSvgProps) {
  const showDumbbells = weightLabel !== null;

  const cueRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<SVGLineElement>(null);
  const motionGuideRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const torsoRef = useRef<SVGLineElement>(null);
  const clavicleRef = useRef<SVGLineElement>(null);
  const legLeftRef = useRef<SVGPolylineElement>(null);
  const legRightRef = useRef<SVGPolylineElement>(null);
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
  const speedRef = useRef<number>(speedMultiplier);
  const showDumbbellsRef = useRef<boolean>(showDumbbells);
  const phaseTimeRef = useRef<number>(0);

  animTypeRef.current = animationType;
  speedRef.current = speedMultiplier;
  showDumbbellsRef.current = showDumbbells;

  useEffect(() => {
    const applyPose = (pose: AthletePose, cue: string, includeDumbbells: boolean): void => {
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

      setLineAttrs(
        torsoRef.current,
        pose.torsoHip.x,
        pose.torsoHip.y,
        pose.torsoShoulder.x,
        pose.torsoShoulder.y,
      );
      setLineAttrs(
        clavicleRef.current,
        pose.clavicleStart.x,
        pose.clavicleStart.y,
        pose.clavicleEnd.x,
        pose.clavicleEnd.y,
      );

      if (legLeftRef.current) legLeftRef.current.setAttribute('points', formatPoints(pose.legLeft));
      if (legRightRef.current)
        legRightRef.current.setAttribute('points', formatPoints(pose.legRight));

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
          dumbbellLeftRef.current.style.display = includeDumbbells ? 'inline' : 'none';
          if (includeDumbbells) {
            setDumbbellTransform(
              dumbbellLeftRef.current,
              pose.leftArm.hand.x,
              pose.leftArm.hand.y,
              pose.leftArm.dumbbellAngleDeg,
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
          );
        }
      }
    };

    // Paint initial frame immediately so first paint and unit tests are accurate.
    const initial = computeAnimationFrame(animTypeRef.current, 0);
    applyPose(initial.pose, initial.cue, showDumbbellsRef.current);

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
      applyPose(frame.pose, frame.cue, showDumbbellsRef.current);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Re-sync immediately when exercise type or weight visibility changes without restarting rAF.
  useEffect(() => {
    phaseTimeRef.current = 0;
    const frame = computeAnimationFrame(animationType, 0);
    if (cueRef.current) cueRef.current.textContent = frame.cue;
    if (dumbbellLeftRef.current) {
      dumbbellLeftRef.current.style.display =
        showDumbbells && frame.pose.leftArm ? 'inline' : 'none';
    }
    if (dumbbellRightRef.current) {
      dumbbellRightRef.current.style.display = showDumbbells ? 'inline' : 'none';
    }
  }, [animationType, showDumbbells]);

  const badgeText = weightLabel ?? '';

  return (
    <>
      <div class="absolute top-3.5 left-4 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
        <span class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          60 FPS Form Loop
        </span>
      </div>

      <div
        ref={cueRef}
        data-testid="live-rep-cue"
        class="absolute top-3.5 right-4 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono font-semibold text-emerald-300"
      >
        Controlled Tempo
      </div>

      <svg
        viewBox="0 0 320 280"
        role="img"
        aria-label="Animated exercise form demonstrator"
        class="w-full h-full max-h-[330px] drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
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
          <polyline
            ref={legLeftRef}
            points="160,158 144,202 138,246"
            fill="none"
            stroke="#64748b"
            stroke-width="10"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polyline
            ref={legRightRef}
            points="160,158 176,202 182,246"
            fill="none"
            stroke="#94a3b8"
            stroke-width="10"
            stroke-linecap="round"
            stroke-linejoin="round"
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
            ref={torsoRef}
            x1="160"
            y1="158"
            x2="160"
            y2="92"
            stroke="#cbd5e1"
            stroke-width="14"
            stroke-linecap="round"
          />
          <line
            ref={clavicleRef}
            x1="140"
            y1="94"
            x2="180"
            y2="94"
            stroke="#e2e8f0"
            stroke-width="8"
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
            x1="140"
            y1="94"
            x2="116"
            y2="116"
            stroke="#10b981"
            stroke-width="9"
            stroke-linecap="round"
          />
          <line
            ref={leftForearmRef}
            x1="116"
            y1="116"
            x2="114"
            y2="82"
            stroke="#34d399"
            stroke-width="8"
            stroke-linecap="round"
          />
          <circle ref={leftElbowRef} cx="116" cy="116" r="4" fill="#064e3b" />

          <line
            ref={rightUpperArmRef}
            x1="180"
            y1="94"
            x2="204"
            y2="116"
            stroke="#10b981"
            stroke-width="9"
            stroke-linecap="round"
          />
          <line
            ref={rightForearmRef}
            x1="204"
            y1="116"
            x2="206"
            y2="82"
            stroke="#34d399"
            stroke-width="8"
            stroke-linecap="round"
          />
          <circle ref={rightElbowRef} cx="204" cy="116" r="4" fill="#064e3b" />

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
