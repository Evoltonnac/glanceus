import { test } from './midscene.fixture';
import { setupOAuthMocks } from './mock-oauth-server';

/**
 * D-01 Critical Path E2E Test
 *
 * Tests the complete flow: create integration -> create source ->
 * switch to dashboard -> complete auth/form -> add widget -> render UI.
 *
 * Uses AI-driven browser automation via Midscene agentForPage.
 * Mocks OAuth (D-05), SQL responses (D-06), and webview scrape (D-07).
 */
test.describe('Critical Path Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Setup OAuth mocks for GitHub and Google OAuth flows (D-05)
        setupOAuthMocks(page);

        // Mock SQL response endpoints (D-06)
        await page.route('**/api/sources*', async (route) => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'test-source',
                        name: 'Test Source',
                        status: 'success',
                        integration_id: 'test-integration',
                        source_type: 'sql',
                        last_fetch: new Date().toISOString(),
                    },
                ]),
            });
        });

        // Mock views/dashboard endpoints for widget rendering
        await page.route('**/api/views**', async (route) => {
            const request = route.request();
            const method = request.method();

            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'dashboard-1',
                            name: 'Test Dashboard',
                            layout_columns: 12,
                            items: [],
                        },
                    ]),
                });
            }

            if (method === 'POST' || method === 'PUT') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ok: true, id: 'dashboard-1' }),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({}),
            });
        });

        // Mock integration endpoints
        await page.route('**/api/integrations**', async (route) => {
            const request = route.request();
            const method = request.method();

            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'integration-1',
                            name: 'Test Integration',
                            type: 'github',
                            status: 'active',
                        },
                    ]),
                });
            }

            if (method === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        ok: true,
                        id: 'new-integration-id',
                        name: 'New Integration',
                    }),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({}),
            });
        });

        // Mock webview scrape response (D-07)
        await page.route('**/api/scrape**', async (route) => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    content: '<html><body><h1>Mocked Scrape Result</h1></body></html>',
                    status: 'success',
                    url: 'https://example.com',
                }),
            });
        });

        // Mock API data endpoint for widgets
        await page.route('**/api/data**', async (route) => {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 1,
                    name: 'Test Data',
                    status: 'active',
                    metrics: {
                        value: 42,
                        trend: 'up',
                    },
                    timestamp: new Date().toISOString(),
                }),
            });
        });
    });

    test('full critical path: create integration -> create source -> dashboard -> auth -> add widget', async ({
        agentForPage,
        page,
    }) => {
        // Step 1: Navigate to app
        await page.goto('/');
        const agent = await agentForPage(page);

        // Step 2: Navigate to integrations page
        await agent.aiAct('click the "Integrations" link in the navigation');
        await agent.aiWaitFor('the integrations list page is visible');

        // Step 3: Create new integration via AI driving the UI
        await agent.aiAct('click the "New Integration" or "Add Integration" button');
        await agent.aiWaitFor('the integration creation dialog or form appears');

        // Step 4: Select OAuth preset and fill form (mocked)
        await agent.aiAct('select the GitHub OAuth preset for authentication');
        await agent.aiWaitFor('the OAuth configuration form is visible');

        // Step 5: Fill integration form details (mocked)
        await agent.aiAct('fill in the integration name with "GitHub Test"');
        await agent.aiAct('fill in the OAuth client ID field');

        // Step 6: Submit the integration creation (mocked OAuth flow)
        await agent.aiAct('submit the integration form');
        await agent.aiWaitFor('the integration is created and appears in the list');

        // Step 7: Create a source from the integration
        await agent.aiAct('click on "Create Source" or "Add Source" from the integration');
        await agent.aiWaitFor('the source creation form appears');

        // Step 8: Configure source (mocked SQL response)
        await agent.aiAct('select the SQL data source type');
        await agent.aiAct('fill in the source name with "Test SQL Source"');
        await agent.aiAct('configure the SQL query or connection details');

        // Step 9: Submit source creation (mocked)
        await agent.aiAct('submit the source form');
        await agent.aiWaitFor('the source is created and shows in the sources list');

        // Step 10: Switch to dashboard page
        await agent.aiAct('navigate to the Dashboard or Views section');
        await agent.aiWaitFor('the dashboard page is visible');

        // Step 11: Complete any required auth/form interactions on dashboard
        await agent.aiAct('if prompted, complete any authentication or setup forms for the dashboard');
        await agent.aiWaitFor('the dashboard is ready for widget configuration');

        // Step 12: Add a widget to the dashboard
        await agent.aiAct('click on "Add Widget" or "Add Card" button');
        await agent.aiWaitFor('the widget selection or configuration dialog appears');

        // Step 13: Configure and add the widget
        await agent.aiAct('select a widget type to add');
        await agent.aiAct('configure the widget with a name and data source');
        await agent.aiAct('confirm or save the widget configuration');

        // Step 14: Verify widget renders correctly
        await agent.aiWaitFor('the widget appears on the dashboard');
        await agent.aiAssert('the widget renders with data or appropriate empty state');
    });

    test('critical path - OAuth integration creation with mock', async ({
        agentForPage,
        page,
    }) => {
        await page.goto('/');
        const agent = await agentForPage(page);

        // Navigate to integrations
        await agent.aiAct('click the "Integrations" link in the navigation');
        await agent.aiWaitFor('the integrations page is visible');

        // Start creating new integration
        await agent.aiAct('click "New Integration" button');
        await agent.aiWaitFor('the integration creation dialog appears');

        // Select OAuth-based integration type
        await agent.aiAct('choose the OAuth authentication method');
        await agent.aiWaitFor('the OAuth setup form is displayed');

        // Verify mock OAuth flow works (mock server handles the actual OAuth)
        await agent.aiAct('initiate the OAuth authentication flow');
        await agent.aiWaitFor('the OAuth authorization completes');
        await agent.aiAssert('the integration is connected and status shows active');
    });

    test('critical path - source creation from integration', async ({
        agentForPage,
        page,
    }) => {
        await page.goto('/');
        const agent = await agentForPage(page);

        // Navigate to integrations
        await agent.aiAct('go to the integrations section');
        await agent.aiWaitFor('the integrations list is visible');

        // Select an existing integration
        await agent.aiAct('click on the first integration in the list');
        await agent.aiWaitFor('the integration detail view is displayed');

        // Create source from integration
        await agent.aiAct('click on "Add Source" or "Create Source"');
        await agent.aiWaitFor('the source creation form appears');

        // Configure source (mocked)
        await agent.aiAct('select a source type (SQL, API, or webview)');
        await agent.aiAct('fill in source configuration details');
        await agent.aiAct('submit the source creation form');
        await agent.aiWaitFor('the source is created successfully');

        // Verify source appears
        await agent.aiAssert('the new source appears in the sources list');
    });

    test('critical path - dashboard widget addition', async ({
        agentForPage,
        page,
    }) => {
        await page.goto('/');
        const agent = await agentForPage(page);

        // Navigate to dashboard
        await agent.aiAct('navigate to the dashboard or views section');
        await agent.aiWaitFor('the dashboard is displayed');

        // Add widget
        await agent.aiAct('click the "Add Widget" button');
        await agent.aiWaitFor('the widget picker or configuration dialog opens');

        // Select widget type
        await agent.aiAct('select a widget type from the available options');
        await agent.aiWaitFor('the widget configuration form is visible');

        // Configure widget
        await agent.aiAct('give the widget a name');
        await agent.aiAct('assign a data source to the widget');

        // Save widget
        await agent.aiAct('save or confirm the widget configuration');
        await agent.aiWaitFor('the widget is added to the dashboard');

        // Verify widget rendered
        await agent.aiAssert('the widget is visible on the dashboard');
        await agent.aiAssert('the widget displays data or shows an appropriate state');
    });
});
