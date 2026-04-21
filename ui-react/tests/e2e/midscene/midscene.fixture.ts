import { test as base } from '@playwright/test';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

/**
 * Midscene AI-powered Playwright test fixture.
 * Provides agentForPage() for AI-driven browser automation.
 */
export const test = base.extend(
  PlaywrightAiFixture({ waitForNetworkIdleTimeout: 1000 }),
);

export { PlaywrightAiFixture };
