import { test } from './midscene.fixture';

/**
 * AI-driven Source CRUD and Rerun tests.
 * Tests AI can perform source create, read, update, delete and rerun sync operations.
 */
test.describe('Source CRUD and Rerun', () => {
    test.beforeEach(async ({ page }) => {
        // Mock sources API
        await page.route('**/api/sources**', async (route) => {
            const request = route.request();
            const method = request.method();
            const url = new URL(request.url());
            const { pathname } = url;

            // GET - return mock sources
            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'source-1',
                            name: 'Test Source',
                            integration_id: 'int-1',
                            status: 'success',
                            has_data: true,
                        },
                    ]),
                });
            }

            // POST/PUT/DELETE - return success
            if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ok: true }),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({}),
            });
        });
    });

    test('create source', async ({ agentForPage, page }) => {
        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('click the add new source button');
        await agent.aiWaitFor('the source creation form appears');
        await agent.aiAssert('the source can be created with configuration');
    });

    test('read source', async ({ agentForPage, page }) => {
        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('navigate to the sources list');
        await agent.aiWaitFor('the source appears in the list');
        await agent.aiAssert('the source shows correct status and configuration');
    });

    test('update source', async ({ agentForPage, page }) => {
        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('click on the first source to edit');
        await agent.aiWaitFor('the source edit form appears');
        await agent.aiAct('modify the source configuration');
        await agent.aiAssert('the source configuration is updated');
    });

    test('delete source', async ({ agentForPage, page }) => {
        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('click delete on the first source');
        await agent.aiWaitFor('the confirmation dialog appears');
        await agent.aiAct('confirm the deletion');
        await agent.aiAssert('the source is removed from the list');
    });

    test('rerun source sync', async ({ agentForPage, page }) => {
        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('click the refresh button on the first source card');
        await agent.aiWaitFor('the source status updates');
        await agent.aiAssert('the source shows success or pending status');
    });
});
