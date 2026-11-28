/**
 * Pure workout history insights, 28-day consistency calendar, and gentle
 * per-Space dumbbell weight progression nudges (Phase 6).
 * Zero DOM, UI, or storage dependencies — accepts injectable `nowMs` for deterministic tests.
 */

import { clampDumbbellWeight, type SessionRecord, type WorkoutSpace } from './schema';

export interface HeatmapDay {
  dateKey: string;
  label: string;
  count: number;
  level: 0 | 1 | 2;
}

export interface FocusSummaryItem {
  label: string;
  count: number;
}

export interface HistoryInsights {
  totalSessions: number;
  totalMinutes: number;
  sessionsThisWeek: number;
  minutesThisWeek: number;
  weeklyStreak: number;
  heatmap: HeatmapDay[];
  focusBreakdown: FocusSummaryItem[];
}

export interface WeightProgressionNudge {
  spaceId: string;
  spaceName: string;
  currentKg: number;
  suggestedKg: number;
  recentSessionCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday-anchored UTC week start timestamp (00:00:00 UTC). */
function toUtcWeekStartMs(ms: number): number {
  const d = new Date(ms);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const weekday = (d.getUTCDay() + 6) % 7; // Mon = 0 .. Sun = 6
  return dayStart - weekday * DAY_MS;
}

function classifyRoutineFocus(routineName: string): string {
  const lower = routineName.toLowerCase();
  if (lower.includes('pilates')) return 'Pilates';
  if (lower.includes('mobility') || lower.includes('stretch') || lower.includes('recovery')) {
    return 'Mobility';
  }
  if (lower.includes('full body')) return 'Full Body';
  if (lower.includes('lower')) return 'Lower Body';
  if (lower.includes('abs') || lower.includes('core')) return 'Abs & Core';
  return 'Upper Body';
}

export function computeHistoryInsights(
  history: readonly SessionRecord[],
  nowMs: number = Date.now(),
): HistoryInsights {
  const todayUtcStart = Date.UTC(
    new Date(nowMs).getUTCFullYear(),
    new Date(nowMs).getUTCMonth(),
    new Date(nowMs).getUTCDate(),
  );
  const currentWeekStart = toUtcWeekStartMs(nowMs);

  let totalSeconds = 0;
  let sessionsThisWeek = 0;
  let secondsThisWeek = 0;
  const countsByDate = new Map<string, number>();
  const activeWeeks = new Set<number>();
  const focusCounts = new Map<string, number>();

  for (const record of history) {
    const duration = Math.max(0, record.durationSec);
    totalSeconds += duration;

    const parsed = Date.parse(record.completedAt);
    if (!Number.isNaN(parsed)) {
      const dateKey = toUtcDateKey(parsed);
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);

      const weekStart = toUtcWeekStartMs(parsed);
      activeWeeks.add(weekStart);

      if (weekStart === currentWeekStart) {
        sessionsThisWeek += 1;
        secondsThisWeek += duration;
      }
    }

    const focus = classifyRoutineFocus(record.routineName);
    focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1);
  }

  // Consecutive active weeks (allow continuing streak from last week if current week just started)
  let weeklyStreak = 0;
  let cursorWeek = activeWeeks.has(currentWeekStart)
    ? currentWeekStart
    : currentWeekStart - 7 * DAY_MS;
  while (activeWeeks.has(cursorWeek)) {
    weeklyStreak += 1;
    cursorWeek -= 7 * DAY_MS;
  }

  // 28-day consistency calendar ending today
  const heatmap: HeatmapDay[] = [];
  for (let offset = 27; offset >= 0; offset -= 1) {
    const dayMs = todayUtcStart - offset * DAY_MS;
    const dateKey = toUtcDateKey(dayMs);
    const count = countsByDate.get(dateKey) ?? 0;
    const level: 0 | 1 | 2 = count === 0 ? 0 : count === 1 ? 1 : 2;
    heatmap.push({
      dateKey,
      label: dateKey.slice(5), // MM-DD
      count,
      level,
    });
  }

  const focusBreakdown = Array.from(focusCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    totalSessions: history.length,
    totalMinutes: Math.round(totalSeconds / 60),
    sessionsThisWeek,
    minutesThisWeek: Math.round(secondsThisWeek / 60),
    weeklyStreak,
    heatmap,
    focusBreakdown,
  };
}

export function getNextDumbbellWeightKg(currentKg: number): number {
  const clamped = clampDumbbellWeight(currentKg, 5);
  if (clamped < 6) return clampDumbbellWeight(clamped + 1);
  if (clamped < 7.5) return 7.5;
  if (clamped < 10) return 10;
  return clampDumbbellWeight(clamped + 2.5);
}

/**
 * Suggest a gentle dumbbell weight bump after >= 4 recent strength sessions in a dumbbell Space.
 */
export function computeWeightProgressionNudge(
  history: readonly SessionRecord[],
  space: WorkoutSpace,
  nowMs: number = Date.now(),
): WeightProgressionNudge | null {
  if (!space.availableEquipment.includes('dumbbells')) return null;
  const currentKg = clampDumbbellWeight(space.dumbbellWeightKg, 5);
  if (currentKg >= 50) return null;

  const cutoffMs = nowMs - 30 * DAY_MS;
  let recentStrengthSessions = 0;

  for (const record of history) {
    const parsed = Date.parse(record.completedAt);
    if (Number.isNaN(parsed) || parsed < cutoffMs) continue;
    const focus = classifyRoutineFocus(record.routineName);
    if (focus !== 'Pilates' && focus !== 'Mobility') {
      recentStrengthSessions += 1;
    }
  }

  if (recentStrengthSessions < 4) return null;

  const suggestedKg = getNextDumbbellWeightKg(currentKg);
  if (suggestedKg <= currentKg) return null;

  return {
    spaceId: space.id,
    spaceName: space.name,
    currentKg,
    suggestedKg,
    recentSessionCount: recentStrengthSessions,
  };
}
