/**
 * Pure dynamic muscle-group highlighting resolver (zero DOM/WebGL/Preact imports).
 *
 * Maps any exercise's `animationType` + `muscleGroup` label to anatomical `BodyRegion`
 * highlight intensities (`primary` | `secondary` | `neutral`) so both the single 3D
 * procedural mannequin and the 2D SVG demonstrator dynamically color targeted muscle
 * areas without duplicating geometry or models.
 */

import type { AnimationId } from '../domain/schema';

export const BODY_REGIONS = [
  'shoulders',
  'upperArms',
  'forearms',
  'chestBack',
  'core',
  'glutes',
  'thighs',
  'calves',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export type HighlightLevel = 'primary' | 'secondary' | 'neutral';

export type MuscleHighlightMap = Record<BodyRegion, HighlightLevel>;

export interface RegionColorSpec {
  /** Base hex color string for 2D SVG and CSS. */
  hex: string;
  /** Peak-contraction hex color string for subtle 2D SVG emphasis. */
  peakHex: string;
  /** Base 24-bit numeric color for Three.js materials. */
  colorInt: number;
  /** Emissive 24-bit numeric tint for Three.js materials (0 for neutral). */
  emissiveInt: number;
  /** Resting emissive intensity in Three.js. */
  baseEmissive: number;
  /** Peak contraction emissive intensity in Three.js. */
  peakEmissive: number;
}

export const HIGHLIGHT_COLORS: Record<'primary' | 'secondary', RegionColorSpec> = {
  primary: {
    hex: '#10b981',
    peakHex: '#34d399',
    colorInt: 0x10b981,
    emissiveInt: 0x059669,
    baseEmissive: 0.16,
    peakEmissive: 0.52,
  },
  secondary: {
    hex: '#f59e0b',
    peakHex: '#fbbf24',
    colorInt: 0xf59e0b,
    emissiveInt: 0xb45309,
    baseEmissive: 0.06,
    peakEmissive: 0.22,
  },
};

export const NEUTRAL_REGION_COLORS: Record<BodyRegion, RegionColorSpec> = {
  shoulders: {
    hex: '#cbd5e1',
    peakHex: '#cbd5e1',
    colorInt: 0xcbd5e1,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  upperArms: {
    hex: '#94a3b8',
    peakHex: '#94a3b8',
    colorInt: 0x94a3b8,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  forearms: {
    hex: '#64748b',
    peakHex: '#64748b',
    colorInt: 0x64748b,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  chestBack: {
    hex: '#cbd5e1',
    peakHex: '#cbd5e1',
    colorInt: 0xdbe4ef,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  core: {
    hex: '#64748b',
    peakHex: '#64748b',
    colorInt: 0x475569,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  glutes: {
    hex: '#475569',
    peakHex: '#475569',
    colorInt: 0x334155,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  thighs: {
    hex: '#64748b',
    peakHex: '#64748b',
    colorInt: 0x64748b,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
  calves: {
    hex: '#94a3b8',
    peakHex: '#94a3b8',
    colorInt: 0x94a3b8,
    emissiveInt: 0x000000,
    baseEmissive: 0,
    peakEmissive: 0,
  },
};

export interface AnimationMuscleSpec {
  primary: readonly BodyRegion[];
  secondary: readonly BodyRegion[];
}

/**
 * Biomechanical default muscle map for every built-in `AnimationId`.
 */
export const ANIMATION_MUSCLE_HIGHLIGHTS: Record<AnimationId, AnimationMuscleSpec> = {
  'overhead-press': { primary: ['shoulders'], secondary: ['upperArms', 'core'] },
  'bent-row': { primary: ['chestBack'], secondary: ['upperArms', 'shoulders'] },
  'floor-press': { primary: ['chestBack'], secondary: ['upperArms', 'shoulders'] },
  'bicep-curl': { primary: ['upperArms'], secondary: ['forearms'] },
  'lateral-raise': { primary: ['shoulders'], secondary: ['upperArms'] },
  'front-raise': { primary: ['shoulders'], secondary: ['chestBack', 'upperArms'] },
  'tricep-extension': { primary: ['upperArms'], secondary: ['shoulders', 'core'] },
  squat: { primary: ['thighs', 'glutes'], secondary: ['core', 'calves'] },
  rdl: { primary: ['thighs', 'glutes'], secondary: ['core'] },
  'reverse-lunge': { primary: ['thighs', 'glutes'], secondary: ['calves', 'core'] },
  'glute-bridge': { primary: ['glutes'], secondary: ['thighs', 'core'] },
  crunch: { primary: ['core'], secondary: [] },
  'leg-raise': { primary: ['core'], secondary: ['thighs'] },
  'russian-twist': { primary: ['core'], secondary: ['shoulders'] },
  'plank-tap': { primary: ['core'], secondary: ['shoulders', 'chestBack'] },
  'band-pull-apart': { primary: ['shoulders', 'chestBack'], secondary: ['upperArms'] },
  'band-row': { primary: ['chestBack'], secondary: ['upperArms', 'shoulders'] },
  'band-bicep-curl': { primary: ['upperArms'], secondary: ['forearms'] },
  'band-kickback': { primary: ['glutes'], secondary: ['thighs', 'core'] },
  'wall-sit': { primary: ['thighs'], secondary: ['glutes', 'calves'] },
  'wall-pushup': { primary: ['chestBack'], secondary: ['shoulders', 'upperArms'] },
  'wall-angels': { primary: ['chestBack', 'shoulders'], secondary: ['upperArms'] },
  'push-up': { primary: ['chestBack'], secondary: ['upperArms', 'core'] },
  'bird-dog': { primary: ['core', 'glutes'], secondary: ['chestBack', 'shoulders'] },
  'dead-bug': { primary: ['core'], secondary: ['thighs', 'shoulders'] },
  superman: { primary: ['core', 'glutes'], secondary: ['chestBack'] },
  'roller-thoracic': { primary: ['chestBack'], secondary: ['shoulders'] },
  'roller-quad': { primary: ['thighs'], secondary: ['glutes'] },
  'roller-glute': { primary: ['glutes'], secondary: ['thighs'] },
  'pilates-hundred': { primary: ['core'], secondary: ['shoulders', 'thighs'] },
  'single-leg-stretch': { primary: ['core'], secondary: ['thighs'] },
  'swan-prep': { primary: ['chestBack'], secondary: ['core', 'shoulders'] },
  'side-leg-lift': { primary: ['glutes'], secondary: ['thighs', 'core'] },
  'spine-twist': { primary: ['core'], secondary: ['chestBack', 'shoulders'] },
  'clam-shell': { primary: ['glutes'], secondary: ['thighs'] },
  swimming: { primary: ['chestBack', 'glutes'], secondary: ['core', 'shoulders'] },
  'cat-cow': { primary: ['core', 'chestBack'], secondary: ['shoulders'] },
  'worlds-greatest-stretch': { primary: ['glutes', 'thighs'], secondary: ['chestBack', 'core'] },
  'childs-pose': { primary: ['chestBack', 'core'], secondary: ['glutes', 'shoulders'] },
};

const KEYWORD_MATCHERS: readonly { pattern: RegExp; region: BodyRegion }[] = [
  {
    pattern: /\b(lower\s*back|lumbar|abs?|abdominals?|core|obliques?|transverse|waist|spinal)\b/i,
    region: 'core',
  },
  { pattern: /\b(shoulders?|deltoids?|delts?|traps?|rotator)\b/i, region: 'shoulders' },
  { pattern: /\b(biceps?|triceps?|upper\s*arms?|arms?)\b/i, region: 'upperArms' },
  { pattern: /\b(forearms?|wrists?|grip)\b/i, region: 'forearms' },
  {
    pattern: /\b(chest|pectorals?|pecs?|lats?|upper\s*back|mid[- ]?back|rhomboids?|thoracic)\b/i,
    region: 'chestBack',
  },
  { pattern: /\b(glutes?|piriformis|hips?|hip\s*flexors?|butt)\b/i, region: 'glutes' },
  { pattern: /\b(quads?|quadriceps|hamstrings?|thighs?|it[- ]?band|legs?)\b/i, region: 'thighs' },
  { pattern: /\b(calves|calf|shins?|ankles?)\b/i, region: 'calves' },
];

function matchRegionsForTerm(term: string): BodyRegion[] {
  const matched: BodyRegion[] = [];
  for (const matcher of KEYWORD_MATCHERS) {
    if (matcher.pattern.test(term) && !matched.includes(matcher.region)) {
      matched.push(matcher.region);
    }
  }
  return matched;
}

function buildMap(
  primary: readonly BodyRegion[],
  secondary: readonly BodyRegion[],
): MuscleHighlightMap {
  const map: MuscleHighlightMap = {
    shoulders: 'neutral',
    upperArms: 'neutral',
    forearms: 'neutral',
    chestBack: 'neutral',
    core: 'neutral',
    glutes: 'neutral',
    thighs: 'neutral',
    calves: 'neutral',
  };
  for (const region of secondary) {
    map[region] = 'secondary';
  }
  for (const region of primary) {
    map[region] = 'primary';
  }
  return map;
}

/**
 * Resolve anatomical region highlights for an exercise.
 *
 * Uses ordered terms from `muscleGroupText` (e.g. `"Quadriceps • Glutes • Core"`) when
 * recognized so both built-in and user-created custom exercises color accurately, falling
 * back cleanly to the curated `ANIMATION_MUSCLE_HIGHLIGHTS[animationType]` map.
 */
export function resolveMuscleHighlights(
  animationType: AnimationId,
  muscleGroupText?: string,
): MuscleHighlightMap {
  if (muscleGroupText && muscleGroupText.trim().length > 0) {
    const terms = muscleGroupText
      .split(/[•,/+&]/g)
      .map((t) => t.trim())
      .filter(Boolean);

    const primary: BodyRegion[] = [];
    const secondary: BodyRegion[] = [];

    for (const term of terms) {
      const regions = matchRegionsForTerm(term);
      if (regions.length === 0) continue;
      if (primary.length === 0) {
        for (const r of regions) {
          if (!primary.includes(r)) primary.push(r);
        }
      } else {
        for (const r of regions) {
          if (!primary.includes(r) && !secondary.includes(r)) {
            secondary.push(r);
          }
        }
      }
    }

    if (primary.length > 0) {
      return buildMap(primary, secondary);
    }
  }

  const fallback =
    ANIMATION_MUSCLE_HIGHLIGHTS[animationType] ?? ANIMATION_MUSCLE_HIGHLIGHTS['overhead-press'];
  return buildMap(fallback.primary, fallback.secondary);
}

/**
 * Resolve color spec for a given region and highlight level.
 */
export function getRegionColorSpec(region: BodyRegion, level: HighlightLevel): RegionColorSpec {
  if (level === 'primary') return HIGHLIGHT_COLORS.primary;
  if (level === 'secondary') return HIGHLIGHT_COLORS.secondary;
  return NEUTRAL_REGION_COLORS[region];
}

/**
 * Serialize a highlight map into a stable key for cheap equality checks.
 */
export function serializeMuscleHighlights(map: MuscleHighlightMap): string {
  return BODY_REGIONS.map((r) => `${r}:${map[r]}`).join('|');
}
