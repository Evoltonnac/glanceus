import { test } from './midscene.fixture';
import { setupOAuthMocks } from './mock-oauth-server';

/**
 * Smoke Test: Integration CRUD
 *
 * Tests that the AI can perform integration create, read, update, delete
 * operations using the real backend.
 *
 * Only OAuth is mocked (infrastructure). All business APIs use the real backend.
 */
test.describe('Smoke: Integration CRUD', () => {
    test.beforeEach(async ({ page }) => {
        setupOAuthMocks(page);
    });

    test('create integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor(
            'the integrations page header is visible with a "New Integration" button that has a plus icon in the top-right area',
        );

        await agent.aiAct(
            'click the "New Integration" button — it has a plus icon, in the top-right area of the Integrations page header',
        );
        await agent.aiWaitFor('the integration creation form is visible');

        await agent.aiAssert('the form has fields for integration name and type selection');
    });

    test('read integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is fully loaded');

        await agent.aiAssert('the integrations list is visible');
    });

    test('update integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is fully loaded');

        await agent.aiAct('click on the first integration card in the list');
        await agent.aiWaitFor('the integration detail view is displayed');

        await agent.aiAct(
            'click the edit button (pencil icon) on the integration detail header — hover to see tooltip "Edit" if needed',
        );
        await agent.aiWaitFor('the integration edit form appears');

        await agent.aiAssert('the edit form is visible with editable fields');
    });

    test('delete integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);

        await agent.aiWaitFor('the integrations page is fully loaded');

        await agent.aiAct('click on the first integration card in the list');
        await agent.aiWaitFor('the integration detail view is displayed');

        await agent.aiAct(
            'click the delete button (trash icon) in the integration detail header — hover to see tooltip "Delete" if needed',
        );
        await agent.aiWaitFor('the confirmation dialog appears');

        await agent.aiAct(
            'click the "Delete" or "Confirm" button in the confirmation dialog to proceed with deletion',
        );

        await agent.aiAssert('the integration is removed from the list');
    });
});
