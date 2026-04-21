import { test } from './midscene.fixture';

/**
 * AI-driven Dashboard CRUD tests.
 * Tests AI can perform dashboard create, read, update, delete operations.
 */
test.describe('Dashboard CRUD', () => {
    test.beforeEach(async ({ page }) => {
        // Mock views API for dashboard CRUD operations
        await page.route('**/api/views**', async (route) => {
            const request = route.request();
            const method = request.method();
            const url = new URL(request.url());
            const { pathname } = url;

            // GET - return mock dashboards
            if (method === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'view-1',
                            name: 'Main Dashboard',
                            layout_columns: 12,
                            items: [],
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

    test('create dashboard', async ({ agentForPage, page }) => {
        await page.goto('/');
        const agent = await agentForPage(page);
        await agent.aiAct('navigate to create a new dashboard view');
        await agent.aiWaitFor('the dashboard creation form is visible');
        await agent.aiAssert('the dashboard can be created with a name');
    });

    test('read dashboard', async ({ agentForPage, page }) => {
        await page.goto('/');
        const agent = await agentForPage(page);
        await agent.aiAct('navigate to the main dashboard');
        await agent.aiWaitFor('the dashboard renders with expected widgets');
        await agent.aiAssert('the dashboard shows correct name and layout');
    });

    test('update dashboard', async ({ agentForPage, page }) => {
        await page.goto('/');
        const agent = await agentForPage(page);
        await agent.aiAct('click on the dashboard edit button');
        await agent.aiWaitFor('the dashboard edit form appears');
        await agent.aiAct('modify the dashboard name or layout');
        await agent.aiAssert('the dashboard changes are saved');
    });

    test('delete dashboard', async ({ agentForPage, page }) => {
        await page.goto('/');
        const agent = await agentForPage(page);
        await agent.aiAct('click delete on the first dashboard');
        await agent.aiWaitFor('the confirmation dialog appears');
        await agent.aiAct('confirm the deletion');
        await agent.aiAssert('the dashboard is removed from the list');
    });
});
