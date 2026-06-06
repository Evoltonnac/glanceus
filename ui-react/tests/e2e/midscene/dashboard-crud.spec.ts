import { test } from './midscene.fixture';
import { setupOAuthMocks } from './mock-oauth-server';

/**
 * Smoke Test: Dashboard CRUD
 *
 * Tests that the AI can perform dashboard create, read, update, delete
 * operations using the real backend.
 *
 * Only OAuth is mocked (infrastructure). All business APIs use the real backend.
 *
 * Note: Dashboard page has two modes:
 * - Single View (default): shows dashboard content and "Add Widget" button
 * - Management Mode: shows dashboard cards with edit/delete buttons, accessed via "All Dashboards"
 */
test.describe('Smoke: Dashboard CRUD', () => {
    test.beforeEach(async ({ page }) => {
        setupOAuthMocks(page);
    });

    test('read dashboard in default single view', async ({ agentForPage, page }) => {
        await page.goto('/');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the main dashboard content is visible');

        await agent.aiAssert('the dashboard content is visible with widgets or data');
    });

    test('switch to management mode and see all dashboards', async ({ agentForPage, page }) => {
        await page.goto('/');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the main dashboard content is visible');

        await agent.aiAct(
            'click the "All Dashboards" button in the top-right area of the Dashboard page header',
        );
        await agent.aiWaitFor('the page shows "Manage Dashboards" heading');

        await agent.aiAssert('the Manage Dashboards view is visible with dashboard cards');
    });
});
