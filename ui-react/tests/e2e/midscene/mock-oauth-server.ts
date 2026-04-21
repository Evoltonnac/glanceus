// Mock OAuth server for E2E testing
// Provides: token, auth, refresh, get data endpoints
// All operations are in-memory mock - no real OAuth provider calls

import { Page } from '@playwright/test';

export interface MockOAuthConfig {
  clientId: string;
  clientSecret?: string;
  tokenEndpoint: string;
  authorizationEndpoint: string;
}

export interface MockUser {
  id: string;
  login: string;
  email: string;
  name: string;
}

const mockUsers: Map<string, MockUser> = new Map([
  ['test-token-gh', { id: '1', login: 'testuser', email: 'test@example.com', name: 'Test User' }],
  ['test-token-google', { id: '2', login: 'googleuser', email: 'google@example.com', name: 'Google User' }],
]);

const mockTokens: Map<string, { userId: string; expiresAt: number; refreshToken?: string }> = new Map();

// In-memory mock server using Node.js http module
// For use with page.route() interception in Playwright tests

export interface MockServerEndpoints {
  deviceCode: string;
  accessToken: string;
  userInfo: string;
  data: string;
}

const DEFAULT_PORTS = {
  github: 3001,
  google: 3002,
};

// Start mock OAuth server on a specific port
// Returns cleanup function
export function startMockOAuthServer(port: number = DEFAULT_PORTS.github): { close: () => void } {
  // This is a placeholder - actual server implementation uses page.route() interception
  // See setupOAuthMocks() for the actual mocking approach
  return {
    close: () => {
      // cleanup handled by Playwright
    },
  };
}

// Setup OAuth mocks for a Playwright page
// Intercepts OAuth calls and routes to mock responses
export function setupOAuthMocks(page: Page, baseUrl: string = 'http://localhost:3001') {
  // Mock GitHub device flow endpoints
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

// Token management helpers for mock server state
export function createMockToken(userId: string, expiresInSeconds: number = 3600): string {
  const token = `mock-token-${Date.now()}`;
  mockTokens.set(token, {
    userId,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    refreshToken: `mock-refresh-${token}`,
  });
  return token;
}

export function validateMockToken(token: string): boolean {
  const tokenData = mockTokens.get(token);
  if (!tokenData) return false;
  return tokenData.expiresAt > Date.now();
}

export function refreshMockToken(refreshToken: string): string | null {
  for (const [token, data] of mockTokens.entries()) {
    if (data.refreshToken === refreshToken) {
      const newToken = createMockToken(data.userId);
      mockTokens.delete(token);
      return newToken;
    }
  }
  return null;
}

export function getMockUserByToken(token: string): MockUser | undefined {
  const userId = mockTokens.get(token)?.userId;
  if (!userId) return undefined;

  for (const user of mockUsers.values()) {
    if (user.id === userId) return user;
  }
  return undefined;
}
