import { test } from './midscene.fixture';
import { setupOAuthMocks } from './mock-oauth-server';

/**
 * Smoke Test: Source Management
 *
 * Tests source management within the Integrations page context.
 * Sources are managed in the Source Management Section at the bottom
 * of the Integrations page, tied to the selected integration file.
 *
 * Flow: Create integration -> select it -> manage sources in bottom section
 *
 * Only OAuth is mocked (infrastructure). All business APIs use the real backend.
 */
test.describe('Smoke: Source Management', () => {
    test.beforeEach(async ({ page }) => {
        setupOAuthMocks(page);
    });

    test('create source via integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is visible');

        await agent.aiAct(
            'click the "New Integration" button with a plus icon, in the top-right area of the page header',
        );
        await agent.aiWaitFor('the integration creation dialog or form appears');

        await agent.aiAct(
            'in the integration type list, click the option with "API Key" label or key icon',
        );
        await agent.aiWaitFor('the integration configuration form is visible');

        await agent.aiAct('fill in the integration name field with "Test Integration for Sources"');

        await agent.aiAct('click the "Create" or "Submit" button in the form');
        await agent.aiWaitFor('the new integration appears in the sidebar list');

        await agent.aiAct('click on the integration file "Test Integration for Sources" in the sidebar list');
        await agent.aiWaitFor('the integration is selected and its content is shown in the editor');

        await agent.aiAct(
            'click the "Create Source" or "New Source" button in the Source Management Section at the bottom of the page',
        );
        await agent.aiWaitFor('the source creation dialog appears');

        await agent.aiAct('fill in the source name field with "Test Source"');

        await agent.aiAct('click the "Create" or "Submit" button in the dialog');

        await agent.aiAssert('the new source "Test Source" appears in the Source Management Section');
    });

    test('read sources for selected integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is visible');

        await agent.aiAct('click on the first integration file in the sidebar list');
        await agent.aiWaitFor('the integration is selected');

        await agent.aiAssert('the Source Management Section is visible at the bottom');
    });

    test('delete source from integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is visible');

        await agent.aiAct('click on the first integration file in the sidebar list');
        await agent.aiWaitFor('the integration is selected');

        await agent.aiAssert('the Source Management Section is visible at the bottom');

        await agent.aiAct(
            'click the delete button (trash icon) on the first source card in the Source Management Section',
        );
        await agent.aiWaitFor('the confirmation dialog appears');

        await agent.aiAct('click the "Delete" or "Confirm" button in the confirmation dialog');

        await agent.aiAssert('the source is removed from the list');
    });
});
