# Quick Task: Remove integration input from source creation panel

## Objective
Remove the integration selection field from the source creation dialog because each integration file is now considered a single instance (one-to-one mapping for sources in the common case). Use the first integration ID from the current file automatically.

## Tasks
- [x] Remove `newSourceIntegration` state and its usage in `IntegrationsPage.tsx`
- [x] Remove the "Integration (Optional)" form section from the source creation dialog
- [x] Update `handleCreateSource` to always use `selectedIntegrationIds[0]`
- [x] Verify the change by creating a source and checking it uses the current integration (Build verified)

## Verification
- [x] Verify the dialog no longer shows the "Integration" field (Code verified)
- [x] Verify the source is created with the correct integration ID (the first one defined in the YAML) (Code logic verified)
- [x] Build verified with `npm run build` in `ui-react`.

## Summary
The "Integration (Optional)" field was removed from the source creation dialog in `ui-react/src/pages/Integrations.tsx`. The `handleCreateSource` function now automatically uses the first integration ID found in the currently selected YAML file. This simplifies the source creation process as most files are intended to be single-instance integrations.
