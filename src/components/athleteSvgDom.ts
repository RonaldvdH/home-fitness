/**
 * Direct DOM attribute mutators for AthleteSvg so 60 FPS animation ticks
 * update SVG geometry and muscle-group colors with zero Preact re-renders.
 */

import type { RefObject } from 'preact';
import { lerp, type AthletePose } from '../engine/animations';
import {
  getRegionColorSpec,
  type BodyRegion,
  type MuscleHighlightMap,
} from '../engine/muscleHighlights';

export interface AthleteSvgRefs {
  floor: RefObject<SVGLineElement | null>;
  motionGuide: RefObject<SVGPathElement | null>;
  head: RefObject<SVGCircleElement | null>;
  upperTorso: RefObject<SVGLineElement | null>;
  coreTorso: RefObject<SVGLineElement | null>;
  pelvis: RefObject<SVGCircleElement | null>;
  clavicle: RefObject<SVGLineElement | null>;
  leftThigh: RefObject<SVGLineElement | null>;
  leftShin: RefObject<SVGLineElement | null>;
  rightThigh: RefObject<SVGLineElement | null>;
  rightShin: RefObject<SVGLineElement | null>;
  footLeft: RefObject<SVGLineElement | null>;
  footRight: RefObject<SVGLineElement | null>;
  leftUpperArm: RefObject<SVGLineElement | null>;
  leftForearm: RefObject<SVGLineElement | null>;
  leftElbow: RefObject<SVGCircleElement | null>;
  dumbbellLeft: RefObject<SVGGElement | null>;
  rightUpperArm: RefObject<SVGLineElement | null>;
  rightForearm: RefObject<SVGLineElement | null>;
  rightElbow: RefObject<SVGCircleElement | null>;
  dumbbellRight: RefObject<SVGGElement | null>;
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

export function applyHighlightsToSvg(
  refs: AthleteSvgRefs,
  highlights: MuscleHighlightMap,
  atPeak: boolean,
): void {
  setRegionStroke(refs.clavicle.current, 'shoulders', highlights, atPeak);
  setRegionStroke(refs.upperTorso.current, 'chestBack', highlights, atPeak);
  setRegionStroke(refs.coreTorso.current, 'core', highlights, atPeak);
  setRegionFill(refs.pelvis.current, 'glutes', highlights, atPeak);

  setRegionStroke(refs.leftThigh.current, 'thighs', highlights, atPeak);
  setRegionStroke(refs.rightThigh.current, 'thighs', highlights, atPeak);
  setRegionStroke(refs.leftShin.current, 'calves', highlights, atPeak);
  setRegionStroke(refs.rightShin.current, 'calves', highlights, atPeak);

  setRegionStroke(refs.leftUpperArm.current, 'upperArms', highlights, atPeak);
  setRegionStroke(refs.rightUpperArm.current, 'upperArms', highlights, atPeak);
  setRegionFill(refs.leftElbow.current, 'upperArms', highlights, atPeak);
  setRegionFill(refs.rightElbow.current, 'upperArms', highlights, atPeak);
  setRegionStroke(refs.leftForearm.current, 'forearms', highlights, atPeak);
  setRegionStroke(refs.rightForearm.current, 'forearms', highlights, atPeak);
}

export function applyPoseToSvg(
  refs: AthleteSvgRefs,
  pose: AthletePose,
  highlights: MuscleHighlightMap,
  includeDumbbells: boolean,
  progress: number,
): void {
  applyHighlightsToSvg(refs, highlights, progress > 0.45);

  if (refs.floor.current) {
    const floorStr = pose.floorY.toFixed(1);
    refs.floor.current.setAttribute('y1', floorStr);
    refs.floor.current.setAttribute('y2', floorStr);
  }

  if (refs.motionGuide.current) {
    refs.motionGuide.current.setAttribute('d', pose.motionGuidePath);
  }

  if (refs.head.current) {
    refs.head.current.setAttribute('cx', pose.head.x.toFixed(1));
    refs.head.current.setAttribute('cy', pose.head.y.toFixed(1));
  }

  const midX = lerp(pose.torsoHip.x, pose.torsoShoulder.x, 0.48);
  const midY = lerp(pose.torsoHip.y, pose.torsoShoulder.y, 0.48);

  setLineAttrs(refs.coreTorso.current, pose.torsoHip.x, pose.torsoHip.y, midX, midY);
  setLineAttrs(refs.upperTorso.current, midX, midY, pose.torsoShoulder.x, pose.torsoShoulder.y);
  if (refs.pelvis.current) {
    refs.pelvis.current.setAttribute('cx', pose.torsoHip.x.toFixed(1));
    refs.pelvis.current.setAttribute('cy', pose.torsoHip.y.toFixed(1));
  }

  setLineAttrs(
    refs.clavicle.current,
    pose.clavicleStart.x,
    pose.clavicleStart.y,
    pose.clavicleEnd.x,
    pose.clavicleEnd.y,
  );

  setLineAttrs(
    refs.leftThigh.current,
    pose.legLeft[0].x,
    pose.legLeft[0].y,
    pose.legLeft[1].x,
    pose.legLeft[1].y,
  );
  setLineAttrs(
    refs.leftShin.current,
    pose.legLeft[1].x,
    pose.legLeft[1].y,
    pose.legLeft[2].x,
    pose.legLeft[2].y,
  );
  setLineAttrs(
    refs.rightThigh.current,
    pose.legRight[0].x,
    pose.legRight[0].y,
    pose.legRight[1].x,
    pose.legRight[1].y,
  );
  setLineAttrs(
    refs.rightShin.current,
    pose.legRight[1].x,
    pose.legRight[1].y,
    pose.legRight[2].x,
    pose.legRight[2].y,
  );

  if (refs.footLeft.current) {
    if (pose.footLeft) {
      refs.footLeft.current.style.display = 'inline';
      setLineAttrs(
        refs.footLeft.current,
        pose.footLeft[0].x,
        pose.footLeft[0].y,
        pose.footLeft[1].x,
        pose.footLeft[1].y,
      );
    } else {
      refs.footLeft.current.style.display = 'none';
    }
  }

  setLineAttrs(
    refs.footRight.current,
    pose.footRight[0].x,
    pose.footRight[0].y,
    pose.footRight[1].x,
    pose.footRight[1].y,
  );

  if (pose.leftArm) {
    if (refs.leftUpperArm.current) refs.leftUpperArm.current.style.display = 'inline';
    if (refs.leftForearm.current) refs.leftForearm.current.style.display = 'inline';
    if (refs.leftElbow.current) refs.leftElbow.current.style.display = 'inline';
    setLineAttrs(
      refs.leftUpperArm.current,
      pose.leftArm.shoulder.x,
      pose.leftArm.shoulder.y,
      pose.leftArm.elbow.x,
      pose.leftArm.elbow.y,
    );
    setLineAttrs(
      refs.leftForearm.current,
      pose.leftArm.elbow.x,
      pose.leftArm.elbow.y,
      pose.leftArm.hand.x,
      pose.leftArm.hand.y,
    );
    if (refs.leftElbow.current) {
      refs.leftElbow.current.setAttribute('cx', pose.leftArm.elbow.x.toFixed(1));
      refs.leftElbow.current.setAttribute('cy', pose.leftArm.elbow.y.toFixed(1));
    }
    if (refs.dumbbellLeft.current) {
      const showLeftDb = includeDumbbells && !pose.hideLeftDumbbell;
      refs.dumbbellLeft.current.style.display = showLeftDb ? 'inline' : 'none';
      if (showLeftDb) {
        setDumbbellTransform(
          refs.dumbbellLeft.current,
          pose.leftArm.hand.x,
          pose.leftArm.hand.y,
          pose.leftArm.dumbbellAngleDeg,
          pose.leftArm.dumbbellScaleX,
        );
      }
    }
  } else {
    if (refs.leftUpperArm.current) refs.leftUpperArm.current.style.display = 'none';
    if (refs.leftForearm.current) refs.leftForearm.current.style.display = 'none';
    if (refs.leftElbow.current) refs.leftElbow.current.style.display = 'none';
    if (refs.dumbbellLeft.current) refs.dumbbellLeft.current.style.display = 'none';
  }

  setLineAttrs(
    refs.rightUpperArm.current,
    pose.rightArm.shoulder.x,
    pose.rightArm.shoulder.y,
    pose.rightArm.elbow.x,
    pose.rightArm.elbow.y,
  );
  setLineAttrs(
    refs.rightForearm.current,
    pose.rightArm.elbow.x,
    pose.rightArm.elbow.y,
    pose.rightArm.hand.x,
    pose.rightArm.hand.y,
  );
  if (refs.rightElbow.current) {
    refs.rightElbow.current.setAttribute('cx', pose.rightArm.elbow.x.toFixed(1));
    refs.rightElbow.current.setAttribute('cy', pose.rightArm.elbow.y.toFixed(1));
  }
  if (refs.dumbbellRight.current) {
    refs.dumbbellRight.current.style.display = includeDumbbells ? 'inline' : 'none';
    if (includeDumbbells) {
      setDumbbellTransform(
        refs.dumbbellRight.current,
        pose.rightArm.hand.x,
        pose.rightArm.hand.y,
        pose.rightArm.dumbbellAngleDeg,
        pose.rightArm.dumbbellScaleX,
      );
    }
  }
}
