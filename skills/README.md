# Glanceus Skills

This directory stores the canonical AI skill assets used by Glanceus.

## Contents

- `integration-editor/`
  - Full skill package (`SKILL.md`, references, validation script)
  - Source of truth for integration YAML authoring behavior
- `PROMPT.md`
  - Single-file prompt derived from `integration-editor`
  - Used by the client-side "AI Prompt" helper in the Integrations create dialog

## How to use

1. Open **Integrations** in the Glanceus UI.
2. Click **New** to open the integration creation dialog.
3. Click the AI sparkles button in the dialog header.
4. Choose one of the two actions:
   - **Copy full prompt**
   - **Open GitHub skills folder**

GitHub folder URL:
- <https://github.com/Evoltonnac/glanceus/tree/main/skills>

## Maintenance notes

- Keep `integration-editor/` as the canonical skill source.
- Update `PROMPT.md` when skill behavior or references change.
- Keep client prompt bundle (`ui-react/src/constants/integrationSkillPrompt.ts`) synchronized with `PROMPT.md`.
