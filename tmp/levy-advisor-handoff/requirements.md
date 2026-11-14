# Levy Advisor changes to preserve after the user's Git pull

Scope: change ONLY the Levy Advisor and its directly required bridge fields/tests.
Do not alter Commodity Tracker markup, styles, forecasting logic, or behavior.
Do not pull Git changes on the user's behalf; they are doing the pull.
Inspect the incoming code before reapplying. The adjacent patch is a reference,
not permission to overwrite incoming files or apply conflicting hunks blindly.

## Requested appearance and behavior

- Remove levy bands from the UI, including associated rendering and styles.
- Remove pump price buildup and the old historical reference cards.
- Replace buildup with these formulas:
  - Required levy = Revenue target / Levied volume.
    The user explicitly confirmed division, correcting their original plus sign.
  - Recommended levy = Required levy * Multiplier.
- Preserve the desktop golden split: left:right = 1:1.618, excluding the gap.
- Left: recommendation, run button, and formula panel.
- Right: one integrated details panel grouped into calculation, comparison,
  and forecast input/target period. Stack appropriately on small screens.
- Show required levy, multiplier, current levy, signed difference
  (recommended minus current), forecast crude price actually used,
  target period start, and target period end, with clear units.
- Read required levy, multiplier, and current levy from actual advisor output.
  Do not invent inputs or change the model formulas.
- Period end follows the advisor's half-month convention: first through 15th,
  or 16th through last day of the month; handle month lengths/leap years.
- Clear old values on rerun and show explicit errors on failure.
- Before revealing the recommendation, show this ordered checklist:
  1. Load latest fortnight data
  2. Calculate required levy
  3. Walk the decision tree
  4. Apply the multiplier
- Show Waiting/Running/Done states; show Failed on error. Keep the completed
  checklist visible after the result. Do not add artificial timed delays.
- The current C++ API performs calculation/tree/multiplier in one worker call;
  these three steps run together, then complete before rendering the levy.

## Verification to preserve

- WASM checks: recommendation data, current levy, formula consistency, dates.
- Browser checks: displayed fields, signed difference, golden split, no mobile
  overflow, checklist completion before result, both model buttons still work.
- Preserve the incoming Commodity Tracker exactly; review its diff boundaries.

Saved implementation reference: levy-advisor.patch in this directory.
