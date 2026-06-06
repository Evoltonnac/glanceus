import { test as base } from '@playwright/test';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

/**
 * Midscene AI-powered Playwright test fixture.
 * Provides agentForPage() for AI-driven browser automation.
 *
 * Cost control settings:
 * - replanningCycleLimit: 5 - stop early when Midscene cannot find a stable plan
 * - screenshotShrinkFactor: 1 - no shrinking to ensure UI elements are clearly visible
 * - waitForNetworkIdleTimeout: 1000 - faster timeout to avoid unnecessary waits
 */
export const test = base.extend(
  PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 1000,
    replanningCycleLimit: 5,
    screenshotShrinkFactor: 1,
  }),
);

export { PlaywrightAiFixture };
