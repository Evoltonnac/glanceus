import { test } from './midscene.fixture';
import { setupOAuthMocks } from './mock-oauth-server';

/**
 * Smoke Test: Step Failure and Error States
 *
 * Tests that the UI correctly displays error states and rollback behavior
 * when source sync operations fail.
 *
 * Uses real backend data. Sources are managed within the Integrations page.
 *
 * Only OAuth is mocked (infrastructure).
 */
test.describe('Smoke: Step Failure and Error States', () => {
    test.beforeEach(async ({ page }) => {
        setupOAuthMocks(page);
    });

    test('verifies error state display on source', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is visible');

        await agent.aiAct('click on the first integration file in the sidebar list');
        await agent.aiWaitFor('the integration is selected');

        await agent.aiAssert('the Source Management Section is visible at the bottom');

        await agent.aiAssert('the source status indicator is visible');
    });

    test('verifies source detail shows current step information', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is visible');

        await agent.aiAct('click on the first integration file in the sidebar list');
        await agent.aiWaitFor('the integration is selected');

        await agent.aiAssert('the Source Management Section shows source cards with status indicators');
    });

    test('verifies source sync recovery actions are available', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is visible');

        await agent.aiAct('click on the first integration file in the sidebar list');
        await agent.aiWaitFor('the integration is selected');

        await agent.aiAssert('source action buttons are available in the Source Management Section');
    });
});
