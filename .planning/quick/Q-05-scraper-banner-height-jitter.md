# Q-05: Fix Scraper Status Banner Height Jitter

## Objective
Fix the height difference between collapsed and expanded states of the Scraper Status Banner to prevent UI jitter when toggling.

## Research
- Collapsed height: `p-1.5` (12px) + `py-0.5` (4px) + `Activity` icon (16px) = 32px.
- Expanded height: `p-1.5` (12px) + `h-7` buttons (28px) = 40px.
- Height difference: 8px.

## Strategy
- Apply a fixed height of `h-10` (40px) to the Status Bar container.
- Use `items-center` to ensure vertical centering for both states.
- Remove redundant vertical padding (`py-0.5`) in the collapsed state.

## Tasks
- [ ] Modify `ui-react/src/components/ScraperStatusBanner.tsx` to add `h-10` and adjust padding.
- [ ] Verify vertical alignment of all elements.

## Verification
- Toggle between collapsed and expanded states.
- Ensure the height remains constant at 40px.
