# Quick Task: UI Refinement for Suspended Badge and Interaction Button

## Problem
1. When a source is in 'suspended' status, the Badge in the sidebar uses the "secondary" variant (plain text style), making it less noticeable.
2. The interaction button for suspended sources is a full-width text button, which takes up too much vertical space and is inconsistent with the refresh/delete icons.

## Goal
1. Change the 'suspended' Badge variant to something more colorful.
2. Convert the interaction button into an icon button (using the `Wrench` icon) and place it to the left of the refresh button.

## Proposed Changes
- **File:** `ui-react/src/App.tsx`
- **Badge:** Update the variant logic to use a color for "suspended".
- **Button:**
    - Remove the full-width button.
    - Add a new icon button in the top-right button group, to the left of the Refresh button.

## Verification
- Visual inspection of the sidebar for suspended sources.
