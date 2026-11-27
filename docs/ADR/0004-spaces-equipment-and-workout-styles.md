# ADR-0004: Named Workout Spaces, Equipment Tags, and Workout Styles (Pilates Ready)

- **Status**: Accepted (Spaces & Equipment implemented in Phase 3; Workout Styles UI planned for Phase 5)
- **Date**: 2026-11-26

## Context

Users work out in different physical locations with different available gear (e.g., dumbbells + mat at home, elastic bands + wall in another room, bodyweight-only while traveling) and want to expand from dumbbell strength circuits into mobility/foam rolling and Pilates (for partner onboarding on their own phone).

## Decision

1. **Named Workout Spaces (`WorkoutSpace`)**:
   - Store named spaces in `AppDataV4` (`spaces[]`, `activeSpaceId`), each specifying `availableEquipment: EquipmentTag[]` (`dumbbells`, `bands`, `wall`, `floor`, `foam-roller`, `kettlebell`) and `dumbbellWeightKg`.
   - Default spaces ship out of the box (`Home Gym`, `Living Room`, `Travel`) and are selectable directly in the 1-screen **New Workout** overlay.
2. **Exercise Tagging Contract**:
   - Every exercise declares `muscleGroups`, `durations`, `requiredEquipment`, and `styles` (`strength`, `pilates`, `mobility`).
   - An exercise is eligible for a Space if and only if every tag in `exercise.requiredEquipment` is present in `space.availableEquipment` (empty array `[]` = standing bodyweight, eligible everywhere).
3. **Workout Style Filter Without Multi-Profile Complexity**:
   - Support partner onboarding via a **Workout Style** switcher (`Strength`, `Pilates`, `Mobility`) remembered per device rather than adding multi-user account/profile switching, since each partner uses their own phone.
   - Pilates & Mobility styles configure slower breath-paced animation tempos and gentle breathing cues (`Inhale / Exhale`).

## Consequences

- Adding `styles[]` in the Phase 3 schema migration (`schemaVersion: 4`) means Phase 5 (Pilates) requires no additional breaking storage migration.
- New equipment types or workout styles can be added declaratively by extending union types and catalog entries, automatically validated by contract tests.
