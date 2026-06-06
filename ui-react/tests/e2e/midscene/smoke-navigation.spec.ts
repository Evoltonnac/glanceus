import { test } from './midscene.fixture';
import { setupOAuthMocks } from './mock-oauth-server';

/**
 * Smoke Test: Page Navigation
 *
 * Tests that the app starts up correctly and basic navigation works:
 * - App loads and shows the startup gate
 * - Backend becomes ready and app renders
 * - Navigate to Integrations page
 * - Navigate to Settings page
 * - Return to Dashboard (home)
 *
 * This is a basic sanity check that the Midscene E2E environment
 * and the app itself are functioning correctly.
 */
test.describe('Smoke: Page Navigation', () => {
    test.beforeEach(async ({ page }) => {
        setupOAuthMocks(page);
    });

    test('app starts, navigate to integrations, settings, then back to dashboard', async ({
        agentForPage,
        page,
    }) => {
        await page.goto('/');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the main dashboard content is visible');

        // Navigate to Integrations — the center nav pill has two tabs side by side:
        // - Dashboard (left): has a chart/dashboard icon, inactive when on home page
        // - Integrations (right): has a grid/blocks icon
        // When on Dashboard page, the Dashboard tab is active (dark background, white text)
        // and the Integrations tab is inactive (gray, icon-only, no visible text)
        await agent.aiAct(
            'click the Integrations tab in the center navigation — it is the right tab in the pill-shaped nav container, it has a grid/blocks icon (left icon is a chart), the inactive state shows only an icon without text',
        );
        await agent.aiAssert('the integrations page is visible');

        // Navigate to Settings — click the gear icon in the top-right header
        // It is a circular button (not pill-shaped like the nav tabs)
        await agent.aiAct(
            'click the gear/cog icon button in the top-right corner of the header — it is a circular button separate from the navigation tabs, tooltip shows "Settings" on hover',
        );
        await agent.aiAssert('the settings page is visible');

        // Return to Dashboard — click the left-pointing chevron back button in the top-left
        // or use the center nav to switch back to Dashboard
        await agent.aiAct(
            'click the left-pointing chevron "<" button in the top-left of the Settings page header to go back',
        );
        await agent.aiAssert('the dashboard is visible');
    });
});
