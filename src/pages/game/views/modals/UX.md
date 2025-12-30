# Modal UX & Flow — Phase 1

## Overview
This document contains the copy, user flows, state diagram, and acceptance criteria for the in-game modal notification system (first-play guidance and event-driven notifications).

## Modal Messages (keys and copy)
- `intro_find_rome`:
  "Welcome, Commander. Rome awaits — you must find Rome before you can send Food. Explore the map to locate Rome's city center."

- `farm_before_rome_warning`:
  "Warning: You've built a Farm but Rome hasn't been found. Your Food has nowhere to go until you find Rome. Consider exploring to locate Rome first."

- `post_rome_build_guidance`:
  "Well done — you've found Rome! Start building Farms within 5 tiles of Rome so Food arrives fresh. Farms farther away risk spoilage during transport."

- `distance_spoil_warning`:
  "Warning: This Farm is more than 5 tiles from Rome. Food from here will spoil after 5 rounds in transit. Place Farms closer to Rome to avoid spoilage."

- `first_food_arrival`:
  "Congratulations! The first Food shipment has reached Rome — your supply lines are working. Keep producing to meet demand."

- `rome_demand_increase`:
  "Rome's demand for Food has increased. Produce more Farms near Rome to meet growing needs."

- `food_spoiled`:
  "Alert: Some Food spoiled in transit. Consider building Farms closer to Rome or improving transport routes."

- `first_enemy_army`:
  "Enemy army sighted nearby! Prepare your defenses and secure supply lines for the legions."

- `legion_tribute_warning`:
  "Warning: Roman legionaries marching to the front need tribute and supplies. Ensure nearby Farms and stockpiles to support campaigns."

## UX Notes
- Modal priority: critical warnings (spoilage, enemy sighting) appear immediately; informational messages can queue.
- Each "first occurrence" modal should show only once by default (e.g., `first_enemy_army`, `first_food_arrival`, `rome_demand_increase`).
- Warnings tied to repeated/continuous states (e.g., farm distance) should be shown when the condition first becomes true, with a cooldown (e.g., do not repeat more than once per 60 seconds) or until player resolves it.
- Provide a clear action button (primary) and an optional "Don't show again" checkbox for some tips.

## Flows
1) First-play flow
   - On new game start, show `intro_find_rome` modal.
   - If player builds a Farm (`farm-built` event) before `rome-found`, immediately show `farm_before_rome_warning`.
   - When `rome-found` triggers:
     - Show `post_rome_build_guidance` (unless user previously dismissed permanently).
     - Evaluate existing Farms: for any Farm >5 tiles from Rome, show `distance_spoil_warning` (once per Farm or aggregated message).
   - When `food-delivered` occurs first time, show `first_food_arrival`.

2) Distance / spoilage
   - Trigger: `farm-placed` or on `rome-found` evaluation
   - Condition: distance(FarmTile, RomeTile) > 5
   - Action: show `distance_spoil_warning` for that Farm (or aggregated if multiple), include distance and spoil rounds (5 rounds) in message payload.
   - If Food actually spoils later, show `food_spoiled` with details (which Farm, how much).

3) Demand / spoil / enemy / legions (event-driven)
   - On `rome-demand-increase` (first time), show `rome_demand_increase`.
   - On Food spoil event, show `food_spoiled` with summary.
   - On `unit-spotted` where unit.isEnemy and playerHasNotSeenEnemyBefore, show `first_enemy_army`.
   - On `legion-entering-front` or `legion-march` events, show `legion_tribute_warning` (first time per campaign/march).

## State Diagram (compact)

Start -> [Show `intro_find_rome`] -> Player acts
  - If `farm-built` before `rome-found` -> Show `farm_before_rome_warning` -> Continue
  - If `rome-found` -> Show `post_rome_build_guidance` -> For each Farm: if distance>5 -> Show `distance_spoil_warning`
  - If `food-delivered` (first) -> Show `first_food_arrival`

Event nodes (can occur anytime after Start):
  - `rome-demand-increase` -> Show `rome_demand_increase` (once)
  - `food-spoiled` -> Show `food_spoiled` (each occurrence, but can be aggregated)
  - `first_enemy_army` -> Show `first_enemy_army` (once)
  - `legion_march` -> Show `legion_tribute_warning` (first per march/campaign)

## Acceptance Criteria
- AC1: On a fresh game, `intro_find_rome` displays once within the first 10 seconds of play or when the player first opens the game UI.
- AC2: If a `farm-built` event occurs before `rome-found`, `farm_before_rome_warning` is shown immediately and blocks further identical warnings for 30 seconds.
- AC3: When `rome-found` fires, `post_rome_build_guidance` displays immediately and explains the 5-tile spoil rule.
- AC4: Any Farm placed (or existing) >5 tiles from Rome after `rome-found` causes a `distance_spoil_warning` for that Farm (or a single aggregated modal), with correct spoil-round info (5 rounds).
- AC5: On the first successful `food-delivered` event, `first_food_arrival` is shown exactly once.
- AC6: On the first `rome-demand-increase` event, `rome_demand_increase` shows once.
- AC7: `food_spoiled` alerts when spoil events occur, including which Farm(s) and amount if available.
- AC8: On the first sighting of an enemy army, `first_enemy_army` shows once.
- AC9: On the first legion march that requires supply/tribute, `legion_tribute_warning` shows once per campaign with an option to re-notify.
- AC10: All modals are queueable (no UI overlap), closable, and have a primary action that maps to a meaningful next step (e.g., "Locate Rome", "Build closer Farms", "Open Map").

## Payloads and data fields (for implementers)
Each modal open call should accept:
- `type` (one of the message keys above)
- `title` (optional override)
- `body` (optional override)
- `payload` (object) — e.g., `{ farmId, distance, amountSpoiled, roundsToSpoil, romeTileId }`
- `once` (boolean) — whether modal is a one-time notification
- `priority` (int) — higher = show immediately

## Next steps (Phase 2 prep)
- Create a small modal component API: `Modal.open({type, payload, once, priority})`.
- Add locale key mapping file `src/pages/game/locales/en.json` and move strings there for i18n.

---
Created for Phase 1: UX copy, flows, diagram, and testable acceptance criteria.
