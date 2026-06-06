import { expect, type BrowserContext, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from './midscene.fixture';
import {
    MOCK_OAUTH_ACCOUNT_NAME,
    MOCK_OAUTH_INTEGRATION_ID,
    MOCK_OAUTH_REVENUE_TITLE,
    MOCK_OAUTH_REVENUE_VALUE,
    setupOAuthMocks,
    setupOAuthOpenApiDataFlowMocks,
} from './mock-oauth-server';

interface CriticalPathCheckpoint {
    version: 3;
    integrationId: string;
    sourceName: string;
    dashboardName: string;
    thirdPartyPort: number;
    setupComplete?: boolean;
    oauthComplete?: boolean;
    dataVerified?: boolean;
}

const CHECKPOINT_VERSION = 3;

const checkpointPath = path.resolve(
    process.cwd(),
    'tests-e2e-temp',
    'midscene-critical-path-checkpoint.json',
);

async function readCheckpoint(): Promise<CriticalPathCheckpoint | null> {
    try {
        const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8')) as Partial<CriticalPathCheckpoint>;
        return checkpoint.version === CHECKPOINT_VERSION ? checkpoint as CriticalPathCheckpoint : null;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
    }
}

async function writeCheckpoint(checkpoint: CriticalPathCheckpoint): Promise<void> {
    await mkdir(path.dirname(checkpointPath), { recursive: true });
    await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensureDashboardSelected(page: Page, dashboardName: string) {
    const dashboardNamePattern = new RegExp(escapeRegExp(dashboardName));
    const heading = page.getByRole('heading', { name: dashboardName });
    if (await heading.count() > 0) return;

    const dashboardTab = page.getByRole('tab', { name: dashboardNamePattern });
    if (await dashboardTab.count() > 0) {
        await dashboardTab.click();
        await expect(heading).toBeVisible();
        return;
    }

    await page.getByRole('button', { name: /All Dashboards|全部看板/ }).click();
    await expect(page.getByRole('heading', { name: /Manage Dashboards|管理看板/ })).toBeVisible();
    const dashboardCard = page.getByText(dashboardName, { exact: true }).first();
    if (await dashboardCard.count() > 0) {
        await dashboardCard.click();
        await expect(heading).toBeVisible();
        return;
    }

    await page.getByRole('button', { name: /Create Dashboard|添加看板/ }).click();
    await page.getByPlaceholder(/Dashboard name|看板名称/).fill(dashboardName);
    await page.getByRole('button', { name: /Create|创建/ }).click();
    await expect(heading).toBeVisible();
}

function getAppPage(context: BrowserContext, page: Page) {
    return context.pages().find((candidate) => {
        if (candidate.isClosed()) return false;
        const url = candidate.url();
        return (url.includes('127.0.0.1:3000') || url.includes('localhost:3000')) && !url.includes('/oauth/callback');
    }) ?? (!page.isClosed() ? page : null);
}

function getSourceStatusSidebar(page: Page) {
    return page.getByRole('complementary').filter({ hasText: /Source Status|数据源状态/ });
}

function getSourceStatusRows(page: Page, sourceName: string) {
    return getSourceStatusSidebar(page).locator('div').filter({ hasText: sourceName });
}

async function sourceHealthyCount(page: Page, sourceName: string) {
    return await getSourceStatusRows(page, sourceName).filter({ hasText: /Healthy|正常/ }).count();
}

/**
 * Smoke Test: Critical Path Flow
 *
 * AI drives the user-visible browser flow through setup and source authorization while the
 * backend executes the full OAuth/OpenAPI integration YAML against a local mock provider.
 */
test.describe('Smoke: Critical Path Flow', () => {
    test.describe.configure({ mode: 'serial', timeout: 600_000 });

    test.beforeEach(async ({ page }) => {
        setupOAuthMocks(page);
    });

    test('creates OAuth OpenAPI integration and source', async ({ agentForPage, page }) => {
        const existingCheckpoint = await readCheckpoint();
        test.skip(
            !!existingCheckpoint?.setupComplete,
            'Critical-path setup already completed in this persistent E2E environment.',
        );

        const integrationId = `${MOCK_OAUTH_INTEGRATION_ID}-${Date.now()}`;
        const sourceName = `${MOCK_OAUTH_ACCOUNT_NAME} ${Date.now()}`;
        const dashboardName = `OAuth Critical Path ${Date.now()}`;
        const dataFlow = await setupOAuthOpenApiDataFlowMocks(page, integrationId);

        try {
            await page.goto('/integrations');
            const agent = await agentForPage(page);

            await agent.aiAct('verify the Integrations page is visible');
            await agent.aiAct('click the New button in the Integrations sidebar to open the New Integration dialog');
            await agent.aiAct('click the OAuth Mock OpenAPI preset button in the Process section of the New Integration dialog');
            await agent.aiAct(`fill the ID field, labeled "ID (file name)", with exactly "${integrationId}"`);
            await agent.aiAct(`fill the Name field with exactly "${MOCK_OAUTH_ACCOUNT_NAME}"`);
            await agent.aiAct('click the Create button in the New Integration dialog');

            await agent.aiAct('click the Create Source button in the Sources using this integration section');
            try {
                await agent.aiAct(`in the Create Source dialog, fill the Source Name textbox with exactly "${sourceName}", then click the Create Source button in that dialog`);
            } catch (error) {
                const sourceVisible = await page.getByText(sourceName, { exact: true }).count();
                if (sourceVisible === 0) throw error;
            }
            await agent.aiAct(`verify the integration page shows a source named "${sourceName}"`);

            await page.goto('/');
            await agent.aiAct('verify the app dashboard is visible after startup');
            await ensureDashboardSelected(page, dashboardName);

            await writeCheckpoint({
                version: CHECKPOINT_VERSION,
                integrationId,
                sourceName,
                dashboardName,
                thirdPartyPort: dataFlow.port,
                setupComplete: true,
            });
        } finally {
            await dataFlow.close();
        }
    });

    test('handles source action flow and renders OAuth OpenAPI data', async ({
        agentForPage,
        context,
        page,
    }) => {
        const checkpoint = await readCheckpoint();
        test.skip(
            !checkpoint?.setupComplete,
            'Critical-path setup checkpoint is missing. Run the setup test or reset the clean E2E environment.',
        );
        if (!checkpoint?.setupComplete) {
            throw new Error('Critical-path setup checkpoint is missing.');
        }
        let activeCheckpoint = checkpoint;
        test.skip(
            !!checkpoint.dataVerified,
            'Critical-path OAuth/OpenAPI data was already verified in this persistent E2E environment.',
        );

        const dataFlow = await setupOAuthOpenApiDataFlowMocks(
            page,
            checkpoint.integrationId,
            checkpoint.thirdPartyPort,
        );

        try {
            await page.goto('/');
            const agent = await agentForPage(page);

            await agent.aiAct('verify the app dashboard is visible after startup');
            const sourceStatusSidebar = getSourceStatusSidebar(page);
            const targetSourceName = sourceStatusSidebar.getByText(checkpoint.sourceName, { exact: true });
            await expect(targetSourceName).toBeVisible();
            const alreadyHealthy = await sourceHealthyCount(page, checkpoint.sourceName) > 0;
            if (alreadyHealthy) {
                activeCheckpoint = { ...checkpoint, oauthComplete: true };
                if (!checkpoint.oauthComplete) {
                    await writeCheckpoint(activeCheckpoint);
                }
            } else {
                activeCheckpoint = { ...checkpoint, oauthComplete: false };
            }
            let appPage = page;
            let appAgent = agent;
            let resolvedOAuthPromptInThisTest = false;

            const resolveTrustPrompt = async () => {
                const trustPromptVisible = await appPage.getByText(/Rule scope|规则作用范围|Allow Always|始终允许/).count();
                if (trustPromptVisible === 0) return false;
                await appAgent.aiAct(
                    'in the visible network trust or risk confirmation dialog, choose the Global or 全局 rule scope when that option is available, then click Allow Always or 始终允许; do not click Disallow, Allow Once, 不允许, or 仅允许本次 for this smoke test',
                );
                return true;
            };

            const resolveOAuthPrompt = async () => {
                const oauthConnectVisible = await appPage.getByRole('button', {
                    name: new RegExp(`Connect ${escapeRegExp(MOCK_OAUTH_ACCOUNT_NAME)}|连接 ${escapeRegExp(MOCK_OAUTH_ACCOUNT_NAME)}`),
                }).count();
                if (oauthConnectVisible === 0) return false;

                const originalAppPage = appPage;
                const oauthPopupPromise = context.waitForEvent('page', { timeout: 15_000 }).catch(() => null);
                await appAgent.aiAct(
                    `click the visible OAuth connect button labeled "Connect ${MOCK_OAUTH_ACCOUNT_NAME}" or "连接 ${MOCK_OAUTH_ACCOUNT_NAME}" to open the third-party OAuth provider window`,
                );
                const oauthPopup = await oauthPopupPromise;
                const oauthPage = !oauthPopup || oauthPopup.isClosed()
                    ? context.pages().find((candidate) => candidate.url().startsWith(dataFlow.baseUrl))
                    : oauthPopup;
                if (!oauthPage) {
                    throw new Error('Mock OAuth popup was not available after clicking Connect');
                }
                await oauthPage.waitForLoadState('domcontentloaded').catch(() => undefined);
                const oauthAgent = await agentForPage(oauthPage);
                await oauthAgent.aiAct('verify the mock OAuth provider page is visible');
                await oauthAgent.aiAct('click Approve access on the mock OAuth provider page');
                await expect(oauthPage.getByText(/Authorization successful|授权成功/)).toBeVisible();
                await oauthPage.getByRole('button', { name: /Close Window|关闭窗口/ }).click();
                await oauthPage.close().catch(() => undefined);

                const resolvedAppPage = getAppPage(context, originalAppPage);
                if (!resolvedAppPage) {
                    const pageStates = context.pages().map((candidate, index) => ({
                        index,
                        closed: candidate.isClosed(),
                        url: candidate.isClosed() ? '<closed>' : candidate.url(),
                    }));
                    throw new Error(`Original app page was not available after OAuth callback: ${JSON.stringify(pageStates)}`);
                }
                appPage = resolvedAppPage;
                await appPage.bringToFront();
                appAgent = appPage === page ? agent : await agentForPage(appPage);
                resolvedOAuthPromptInThisTest = true;
                return true;
            };

            const resolveVisibleSourceBlocker = async () => {
                if (await resolveTrustPrompt()) return true;
                if (await resolveOAuthPrompt()) return true;
                return false;
            };

            const sourceStateAttempts = new Map<string, number>();
            const maxSourceActionAttempts = 6;

            if (!activeCheckpoint.oauthComplete) {
                for (let attempt = 1; attempt <= maxSourceActionAttempts; attempt += 1) {
                    await appAgent.aiAct(
                        `look only at the Source Status sidebar. Find the source named exactly "${checkpoint.sourceName}" even if its position changed. Read the current status badge for this exact source row only; do not inspect dashboard widgets or other source rows.`,
                    );
                    if (await sourceHealthyCount(appPage, checkpoint.sourceName) > 0) break;

                    const sourceStateText = (await getSourceStatusRows(appPage, checkpoint.sourceName).first().innerText().catch(() => 'source row missing'))
                        .replace(/\s+/g, ' ')
                        .trim();
                    const repeatedStateCount = (sourceStateAttempts.get(sourceStateText) ?? 0) + 1;
                    sourceStateAttempts.set(sourceStateText, repeatedStateCount);
                    if (repeatedStateCount >= 3) {
                        throw new Error(`Source "${checkpoint.sourceName}" repeated the same non-healthy state ${repeatedStateCount} times: ${sourceStateText}`);
                    }

                    await appAgent.aiAct(
                        `in the Source Status sidebar, use only the row named exactly "${checkpoint.sourceName}". If its status badge indicates Action Needed, 需操作, Error, 错误, Failed, 失败, or another blocking state, click that status badge or the visible action control for this exact row to open the next required interaction. If it is Refreshing, Syncing, Loading, 刷新中, 同步中, or 加载中, wait briefly for the row to change. Do not click any status badge for another source.`,
                    );
                    await resolveVisibleSourceBlocker();
                    await appPage.waitForTimeout(1_000);
                }

                if (await sourceHealthyCount(appPage, checkpoint.sourceName) === 0) {
                    throw new Error(`Source "${checkpoint.sourceName}" did not become Healthy after ${maxSourceActionAttempts} status-action attempts.`);
                }
            }

            await appPage.goto('/');
            await appAgent.aiAct(
                `look at the Source Status sidebar on the left and find only the row named "${checkpoint.sourceName}". Confirm that this exact source row is visible and read its status badge; ignore all dashboard widgets and all other source rows.`,
            );
            await expect.poll(() => sourceHealthyCount(appPage, checkpoint.sourceName)).toBeGreaterThan(0);
            activeCheckpoint = { ...activeCheckpoint, oauthComplete: true };
            await writeCheckpoint(activeCheckpoint);

            await ensureDashboardSelected(appPage, checkpoint.dashboardName);
            const mockWidgetVisible = await appPage.getByText(MOCK_OAUTH_REVENUE_TITLE, { exact: true }).count() > 0;
            const mockDataVisible = mockWidgetVisible
                && await appPage.getByText(MOCK_OAUTH_REVENUE_VALUE, { exact: true }).count() > 0;
            if (!mockWidgetVisible) {
                await appAgent.aiAct(
                    `while viewing the "${checkpoint.dashboardName}" dashboard, add one widget only if the "${MOCK_OAUTH_REVENUE_TITLE}" widget is not already present. Click Add Widget, choose exactly the source "${checkpoint.sourceName}", choose exactly the template "${MOCK_OAUTH_REVENUE_TITLE}", then click Add to Dashboard. Do not add a duplicate if that widget already exists.`,
                );
            }
            if (!mockDataVisible) {
                await appAgent.aiAct(
                    `the "${MOCK_OAUTH_REVENUE_TITLE}" widget is present on "${checkpoint.dashboardName}". If it still shows No data available, first re-check the left Source Status sidebar for "${checkpoint.sourceName}" and resolve or refresh that exact source until it is Healthy, then verify the widget updates. Do not add another widget.`,
                );
            }
            await appAgent.aiAct(`verify the active "${checkpoint.dashboardName}" dashboard shows the existing "${MOCK_OAUTH_REVENUE_TITLE}" widget with value "${MOCK_OAUTH_REVENUE_VALUE}" and status "Status: active"`);

            if (resolvedOAuthPromptInThisTest) {
                await expect.poll(() => dataFlow.snapshot()).toMatchObject({
                    authorizationStarted: true,
                    tokenExchanged: true,
                    openApiDataRequested: true,
                });
            }

            await writeCheckpoint({
                ...activeCheckpoint,
                oauthComplete: true,
                dataVerified: true,
            });
        } finally {
            await dataFlow.close();
        }
    });
});
