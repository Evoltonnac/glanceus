import { test } from './midscene.fixture';

/**
 * AI-driven Integration CRUD tests.
 * Tests AI can perform integration create, read, update, delete operations.
 */
test.describe('Integration CRUD', () => {
    test.beforeEach(async ({ page }) => {
        // Mock integrations API
        await page.route('**/api/integrations**', async (route) => {
            const request = route.request();
            const method = request.method();
            const url = new URL(request.url());
            const { pathname } = url;

            // GET - return mock integrations
            if (method === 'GET' && pathname === '/api/integrations') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                });
            }

            // GET presets
            if (pathname === '/api/integrations/presets' && method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'api_key',
                            label: 'API Key',
                            description: 'HTTP API with bearer token authentication.',
                            filename_hint: 'api_key_example',
                            content_template: 'name: {{display_name_single_quoted}}\n',
                        },
                        {
                            id: 'oauth2',
                            label: 'OAuth',
                            description: 'Authorization-code OAuth2 flow with API request.',
                            filename_hint: 'oauth2_example',
                            content_template: 'name: {{display_name_single_quoted}}\n',
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

    test('create integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);
        await agent.aiAct('click "New Integration" button');
        await agent.aiWaitFor('the integration creation form is visible');
        await agent.aiAssert('the integration can be created with a name and type');
    });

    test('read integration', async ({ agentForPage, page }) => {
        // Mock existing integration
        await page.route('**/api/integrations', async (route) => {
            const request = route.request();
            const method = request.method();

            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{ id: 'int-1', name: 'Test Integration', type: 'oauth' }]),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });

        await page.goto('/integrations');
        const agent = await agentForPage(page);
        await agent.aiAct('refresh the integrations list');
        await agent.aiWaitFor('the integration appears in the list');
        await agent.aiAssert('the integration shows correct name and type');
    });

    test('update integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);
        await agent.aiAct('click on the first integration to edit');
        await agent.aiWaitFor('the integration edit form appears');
        await agent.aiAct('change the integration name');
        await agent.aiAssert('the integration name is updated');
    });

    test('delete integration', async ({ agentForPage, page }) => {
        await page.goto('/integrations');
        const agent = await agentForPage(page);
        await agent.aiAct('click delete on the first integration');
        await agent.aiWaitFor('the confirmation dialog appears');
        await agent.aiAct('confirm the deletion');
        await agent.aiAssert('the integration is removed from the list');
    });
});
