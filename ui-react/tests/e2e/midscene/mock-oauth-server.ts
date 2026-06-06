import { Page } from '@playwright/test';
import {
  buildMockOAuthOpenApiContentTemplate,
  createMockOAuthDataFlowState,
  handleMockOAuthOpenApiRequest,
  MOCK_OAUTH_ACCOUNT_NAME,
  MOCK_OAUTH_INTEGRATION_ID,
  MOCK_OAUTH_PRESET_ID,
  MOCK_OAUTH_REVENUE_TITLE,
  MOCK_OAUTH_REVENUE_VALUE,
  MOCK_OAUTH_SOURCE_ID,
  type MockOAuthDataFlowSnapshot,
} from './mock-oauth-openapi';

export {
  MOCK_OAUTH_ACCOUNT_NAME,
  MOCK_OAUTH_INTEGRATION_ID,
  MOCK_OAUTH_REVENUE_TITLE,
  MOCK_OAUTH_REVENUE_VALUE,
  MOCK_OAUTH_SOURCE_ID,
  type MockOAuthDataFlowSnapshot,
};

export interface MockOAuthDataFlowController {
  baseUrl: string;
  port: number;
  presetId: string;
  snapshot: () => MockOAuthDataFlowSnapshot;
  close: () => Promise<void>;
}

export function setupOAuthMocks(page: Page) {
  page.route('https://github.com/login/device/code', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        device_code: 'test-device-code-12345',
        user_code: 'TEST-1234-ABCD',
        verification_uri: 'https://github.com/login/device',
        interval: 5,
        expires_in: 300,
      }),
    });
  });

  page.route('https://github.com/login/oauth/access_token', async (route) => {
    const body = new URLSearchParams(await route.request().postData() || '');
    const deviceCode = body.get('device_code');

    if (deviceCode === 'test-device-code-12345') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token-gh',
          token_type: 'bearer',
          scope: 'read:user public_repo',
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'authorization_pending',
          error_description: 'Device code not yet verified',
        }),
      });
    }
  });

  page.route('https://api.github.com/user', async (route) => {
    const auth = route.request().headers()['authorization'];
    if (auth === 'token test-token-gh') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          login: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: 'https://github.com/avatars/testuser',
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Bad credentials',
        }),
      });
    }
  });

  // Mock Google OAuth endpoints
  page.route('https://accounts.google.com/o/oauth2/v2/auth', async (route) => {
    await route.fulfill({
      status: 302,
      headers: {
        location: 'http://localhost:4173/oauth/callback?code=test-auth-code-google',
      },
    });
  });

  page.route('https://oauth2.googleapis.com/token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-token-google',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token-google',
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      }),
    });
  });

  page.route('https://www.googleapis.com/oauth2/v2/userinfo', async (route) => {
    const auth = route.request().headers()['authorization'];
    if (auth === 'Bearer test-token-google') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '2',
          login: 'googleuser',
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://lh3.googleusercontent.com/test',
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Invalid credentials',
          },
        }),
      });
    }
  });

  // Mock generic data endpoint for SQL/webview scenarios
  page.route('**/api/data', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Test Data',
        status: 'active',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock example.com for webview scraping tests
  page.route('https://example.com/test-page', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `
        <!DOCTYPE html>
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Title</h1>
            <div class="content">Test content for webview scraping</div>
          </body>
        </html>
      `,
    });
  });
}

export async function setupOAuthOpenApiDataFlowMocks(
  page: Page,
  integrationId = MOCK_OAUTH_INTEGRATION_ID,
  port = 0,
): Promise<MockOAuthDataFlowController> {
  const { createServer } = await import('node:http');
  const routeTarget = page.context();
  const state = createMockOAuthDataFlowState();

  const server = createServer((req, res) => {
    handleMockOAuthOpenApiRequest(req, res, state);
  });

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start mock OAuth/OpenAPI server');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const presetId = MOCK_OAUTH_PRESET_ID;
  const contentTemplate = buildMockOAuthOpenApiContentTemplate(baseUrl);

  await routeTarget.route('**/api/integrations/presets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: presetId,
          label: 'OAuth Mock OpenAPI',
          description: 'OAuth authorization-code flow backed by a local mock provider and OpenAPI endpoint.',
          filename_hint: integrationId,
          content_template: contentTemplate,
        },
      ]),
    });
  });

  return {
    baseUrl,
    port: address.port,
    presetId,
    snapshot: () => ({ ...state }),
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
  };
}
