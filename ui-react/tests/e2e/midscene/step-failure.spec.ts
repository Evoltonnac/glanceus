import { test } from './midscene.fixture';

/**
 * AI-driven Step Failure and Rollback tests.
 * Tests AI can detect step failures, verify rollback behavior, and attempt recovery.
 */
test.describe('Step Failure and Rollback', () => {
    test.beforeEach(async ({ page }) => {
        // Mock APIs with base responses
        await page.route('**/*', async (route) => {
            const request = route.request();
            const method = request.method();
            const url = new URL(request.url());
            const { pathname } = url;

            if (!pathname.startsWith('/api/')) {
                return route.continue();
            }

            // GET - return mock data
            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({}),
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

    test('detects step failure state', async ({ agentForPage, page }) => {
        // Mock API to return error status
        await page.route('**/api/sources**', async (route) => {
            const request = route.request();
            const method = request.method();

            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'fail-source',
                            name: 'Failing Source',
                            integration_id: 'int-1',
                            status: 'error',
                            error: 'Step failed: network timeout',
                            error_details: 'Connection timed out after 30000ms',
                        },
                    ]),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });

        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('refresh the source list');
        await agent.aiWaitFor('an error indicator appears on the failed source');
        await agent.aiAssert('the error message is displayed');
    });

    test('verifies step rollback behavior', async ({ agentForPage, page }) => {
        // Mock API to show step rollback state
        await page.route('**/api/sources**', async (route) => {
            const request = route.request();
            const method = request.method();

            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'rollback-source',
                            name: 'Rollback Source',
                            integration_id: 'int-1',
                            status: 'error',
                            error: 'Step 3 failed, rewinding to step 2',
                            previous_step: 2,
                            current_step: 2,
                        },
                    ]),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });

        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('check the step execution status');
        await agent.aiWaitFor('the rollback indicator is visible');
        await agent.aiAssert('the system rewound to the previous successful step');
    });

    test('attempts error recovery', async ({ agentForPage, page }) => {
        await page.goto('/sources');
        const agent = await agentForPage(page);
        await agent.aiAct('click on the failed source to view details');
        await agent.aiWaitFor('the error details panel appears');
        await agent.aiAct('click the retry button');
        await agent.aiWaitFor('the retry is initiated');
        await agent.aiAssert('the source status changes to pending or running');
    });
});
