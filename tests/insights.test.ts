import { describe, expect, it } from 'vitest';
import {
  computeHistoryInsights,
  computeWeightProgressionNudge,
  getNextDumbbellWeightKg,
} from '../src/domain/insights';
import type { SessionRecord, WorkoutSpace } from '../src/domain/schema';

const HOME_GYM: WorkoutSpace = {
  id: 'space-home-gym',
  name: 'Home Gym',
  availableEquipment: ['dumbbells', 'bands', 'wall', 'floor', 'foam-roller'],
  dumbbellWeightKg: 5,
};

const TRAVEL_SPACE: WorkoutSpace = {
  id: 'space-travel',
  name: 'Travel',
  availableEquipment: ['wall', 'floor'],
  dumbbellWeightKg: 5,
};

function makeSession(
  id: string,
  completedAt: string,
  routineName = '15 min • Upper Body',
  durationSec = 900,
): SessionRecord {
  return {
    id,
    routineId: 'r-1',
    routineName,
    completedAt,
    durationSec,
    rounds: 3,
    exerciseCount: 4,
    source: 'completed',
  };
}

describe('Phase 6 pure history insights & weight progression nudges', () => {
  const nowMs = Date.parse('2026-11-28T12:00:00.000Z'); // Saturday

  it('computes weekly streaks, minutes trained, 28-day heatmap, and focus breakdown', () => {
    const history: SessionRecord[] = [
      makeSession('s1', '2026-11-28T09:00:00.000Z', '15 min • Upper Body', 900),
      makeSession('s2', '2026-11-28T10:30:00.000Z', '10 min • Pilates • Abs & Core', 600),
      makeSession('s3', '2026-11-20T08:00:00.000Z', '20 min • Full Body', 1200),
      makeSession('s4', '2026-11-12T08:00:00.000Z', '15 min • Mobility • Full Body', 900),
    ];

    const insights = computeHistoryInsights(history, nowMs);
    expect(insights.totalSessions).toBe(4);
    expect(insights.totalMinutes).toBe(60);
    expect(insights.sessionsThisWeek).toBe(2);
    expect(insights.minutesThisWeek).toBe(25);
    expect(insights.weeklyStreak).toBe(3);
    expect(insights.heatmap).toHaveLength(28);

    const todayCell = insights.heatmap[27]!;
    expect(todayCell.dateKey).toBe('2026-11-28');
    expect(todayCell.count).toBe(2);
    expect(todayCell.level).toBe(2);

    expect(insights.focusBreakdown.map((f) => f.label)).toEqual(
      expect.arrayContaining(['Upper Body', 'Pilates', 'Full Body', 'Mobility']),
    );
  });

  it('preserves streak from previous week when current week has not started yet', () => {
    const history: SessionRecord[] = [
      makeSession('s1', '2026-11-21T09:00:00.000Z'),
      makeSession('s2', '2026-11-14T09:00:00.000Z'),
    ];
    const insights = computeHistoryInsights(history, nowMs);
    expect(insights.sessionsThisWeek).toBe(0);
    expect(insights.weeklyStreak).toBe(2);
  });

  it('suggests gentle dumbbell weight progression after 4+ recent strength sessions', () => {
    const history: SessionRecord[] = [
      makeSession('s1', '2026-11-27T09:00:00.000Z', '15 min • Upper Body'),
      makeSession('s2', '2026-11-24T09:00:00.000Z', '15 min • Lower Body'),
      makeSession('s3', '2026-11-20T09:00:00.000Z', '20 min • Full Body'),
      makeSession('s4', '2026-11-15T09:00:00.000Z', '10 min • Abs & Core'),
    ];

    const nudge = computeWeightProgressionNudge(history, HOME_GYM, nowMs);
    expect(nudge).not.toBeNull();
    expect(nudge?.currentKg).toBe(5);
    expect(nudge?.suggestedKg).toBe(6);
    expect(nudge?.recentSessionCount).toBe(4);

    // Spaces without dumbbells never get a dumbbell weight nudge
    expect(computeWeightProgressionNudge(history, TRAVEL_SPACE, nowMs)).toBeNull();

    // Fewer than 4 recent strength sessions -> no nudge yet
    expect(computeWeightProgressionNudge(history.slice(0, 3), HOME_GYM, nowMs)).toBeNull();
  });

  it('steps through sensible dumbbell weight increments', () => {
    expect(getNextDumbbellWeightKg(5)).toBe(6);
    expect(getNextDumbbellWeightKg(6)).toBe(7.5);
    expect(getNextDumbbellWeightKg(7.5)).toBe(10);
    expect(getNextDumbbellWeightKg(10)).toBe(12.5);
  });
});
