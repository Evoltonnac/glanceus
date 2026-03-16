---
phase: quick-03
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ui-react/src/index.css
autonomous: true
requirements:
  - quick-03
user_setup: []
must_haves:
  truths:
    - CSS spacing variables use REM units for consistent scaling
    - Widgets automatically use REM-based spacing through qb-gap-* classes
  artifacts:
    - path: ui-react/src/index.css
      provides: CSS spacing variables converted from px to rem
      contains: "--qb-gap-1: calc(0.125rem * var(--qb-density))"
  key_links:
    - from: ui-react/src/components/widgets/shared/commonProps.ts
      to: ui-react/src/index.css
      via: "spacingClassMap uses qb-gap-* classes"
---

<objective>
Convert CSS spacing variables from PX to REM units, ensuring widgets use consistent REM-based spacing.

Purpose: Use REM units for layout density so spacing scales properly when users adjust their browser's font-size preference (accessibility best practice).

Output: Updated CSS variables in index.css using REM units.
</objective>

<context>
@ui-react/src/index.css

# Current spacing variables (lines 50-55, 92-97):
--qb-gap-1: calc(2px * var(--qb-density));
--qb-gap-2: calc(4px * var(--qb-density));
--qb-gap-3: calc(8px * var(--qb-density));
--qb-gap-4: calc(12px * var(--qb-density));
--qb-gap-5: calc(16px * var(--qb-density));
--qb-gap-6: calc(20px * var(--qb-density));

# Also need to convert:
- --qb-grid-gap: 12px -> 0.75rem
- --qb-grid-margin: 8px -> 0.5rem
- --qb-card-header-height: 40px -> 2.5rem
- --qb-card-padding: 12px -> 0.75rem
- --qb-card-pad-x: 12px -> 0.75rem
- --qb-card-pad-y: 8px -> 0.5rem
- GridStack margin: 4px -> 0.25rem
- qb-delete-btn: top: 6px, right: 6px -> 0.375rem
</context>

<tasks>

<task type="auto">
  <name>Convert CSS spacing variables from PX to REM</name>
  <files>ui-react/src/index.css</files>
  <action>
    Convert all PX-based spacing variables to REM in index.css. Use 16px = 1rem base:
    - --qb-gap-1: calc(0.125rem * var(--qb-density))  [2px]
    - --qb-gap-2: calc(0.25rem * var(--qb-density))   [4px]
    - --qb-gap-3: calc(0.5rem * var(--qb-density))    [8px]
    - --qb-gap-4: calc(0.75rem * var(--qb-density))   [12px]
    - --qb-gap-5: calc(1rem * var(--qb-density))      [16px]
    - --qb-gap-6: calc(1.25rem * var(--qb-density))  [20px]

    Also convert in :root, .dark, and density selector blocks:
    - --qb-grid-gap: 0.75rem (was 12px)
    - --qb-grid-margin: 0.5rem (was 8px)
    - --qb-card-header-height: 2.5rem (was 40px)
    - --qb-card-padding: 0.75rem (was 12px)
    - --qb-card-pad-x: 0.75rem (was 12px)
    - --qb-card-pad-y: 0.5rem (was 8px)

    And convert:
    - GridStack margin: 0.25rem (was 4px)
    - qb-delete-btn: top: 0.375rem, right: 0.375rem (was 6px)

    Make changes in BOTH :root (lines 36-60) and .dark (lines 90-101) blocks.
  </action>
  <verify>
    <automated>grep -c "rem" /Users/xingminghua/Coding/evoltonnac/Glanceus/ui-react/src/index.css | head -1</automated>
  </verify>
  <done>All spacing variables use REM units; widgets automatically get REM-based spacing through qb-gap-* classes</done>
</task>

</tasks>

<verification>
- [ ] CSS file contains no px-based spacing values (except potentially in comments)
- [ ] All --qb-gap-* variables use REM
- [ ] GridStack spacing uses REM
- [ ] Card padding uses REM
</verification>

<success_criteria>
CSS spacing variables in index.css use REM units instead of PX. Widgets automatically benefit as they use qb-gap-* classes.
</success_criteria>

<output>
After completion, create .planning/quick/3-css-px-rem-widgets-rem/3-01-SUMMARY.md
</output>
