import type { IncomingMessage, ServerResponse } from 'node:http';

export const MOCK_OAUTH_SOURCE_ID = 'mock-oauth-openapi-source';
export const MOCK_OAUTH_INTEGRATION_ID = 'mock-oauth-openapi';
export const MOCK_OAUTH_ACCOUNT_NAME = 'Glanceus Mock Account';
export const MOCK_OAUTH_REVENUE_TITLE = 'Mock OAuth Revenue';
export const MOCK_OAUTH_REVENUE_VALUE = '$42,750';
export const MOCK_OAUTH_PRESET_ID = 'mock_oauth_openapi';

export interface MockOAuthDataFlowSnapshot {
  authorizationStarted: boolean;
  tokenExchanged: boolean;
  openApiDataRequested: boolean;
}

export function createMockOAuthDataFlowState(): MockOAuthDataFlowSnapshot {
  return {
    authorizationStarted: false,
    tokenExchanged: false,
    openApiDataRequested: false,
  };
}

export function buildMockOAuthOpenApiContentTemplate(baseUrl: string): string {
  return `name: {{display_name_single_quoted}}
description: "Mock OAuth OpenAPI integration for Midscene critical-path E2E."
flow:
  - id: authorize
    use: oauth
    args:
      oauth_flow: "code"
      auth_url: "${baseUrl}/oauth/authorize"
      token_url: "${baseUrl}/oauth/token"
      scopes: ["revenue.read"]
      client_id: "mock-client-id"
      client_secret: "mock-client-secret"
      token_request_type: "json"
    secrets:
      oauth_secrets: "oauth_secrets"

  - id: fetch_revenue
    use: http
    args:
      url: "${baseUrl}/openapi/revenue"
      method: "GET"
      headers:
        Authorization: "Bearer {oauth_secrets.access_token}"
    outputs:
      revenue_payload: "http_response"

templates:
  - id: "mock_oauth_revenue_card"
    type: "source_card"
    ui:
      title: "${MOCK_OAUTH_REVENUE_TITLE}"
      icon: "💳"
    widgets:
      - type: "TextBlock"
        text: "{revenue_payload.account.name}"
        weight: "bold"
      - type: "TextBlock"
        text: "{revenue_payload.metrics.revenue_label}: {revenue_payload.metrics.revenue_display}"
      - type: "TextBlock"
        text: "Status: {revenue_payload.status}"
`;
}

export function buildMockOAuthOpenApiPreset(baseUrl: string, filenameHint = MOCK_OAUTH_INTEGRATION_ID): string {
  const indentedTemplate = buildMockOAuthOpenApiContentTemplate(baseUrl)
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
    .trimEnd();

  return `id: "${MOCK_OAUTH_PRESET_ID}"
label: "OAuth Mock OpenAPI"
description: "OAuth authorization-code flow backed by a local mock provider and OpenAPI endpoint."
filename_hint: "${filenameHint}"
content_template: |
${indentedTemplate}
`;
}

export function handleMockOAuthOpenApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  state: MockOAuthDataFlowSnapshot,
): void {
  const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');

  if (requestUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, state }));
    return;
  }

  if (requestUrl.pathname === '/oauth/authorize') {
    state.authorizationStarted = true;
    const redirectUri = requestUrl.searchParams.get('redirect_uri') || 'http://127.0.0.1:3000/oauth/callback';
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', 'mock-oauth-code');
    callbackUrl.searchParams.set('state', requestUrl.searchParams.get('state') || 'mock-oauth-state');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html>
<html>
  <head><title>Mock OAuth Provider</title></head>
  <body>
    <h1>Mock OAuth Provider</h1>
    <p>Grant access to ${MOCK_OAUTH_ACCOUNT_NAME}</p>
    <button id="approve">Approve access</button>
    <script>
      document.getElementById('approve').addEventListener('click', () => {
        window.location.href = ${JSON.stringify(callbackUrl.toString())};
      });
    </script>
  </body>
</html>`);
    return;
  }

  if (requestUrl.pathname === '/oauth/token') {
    state.tokenExchanged = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      access_token: 'mock-openapi-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-openapi-refresh-token',
      scope: 'revenue.read',
    }));
    return;
  }

  if (requestUrl.pathname === '/openapi/revenue') {
    const authorized = req.headers.authorization === 'Bearer mock-openapi-access-token';
    state.openApiDataRequested = authorized;
    res.writeHead(authorized ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(authorized
      ? {
          account: { name: MOCK_OAUTH_ACCOUNT_NAME },
          metrics: {
            revenue_label: MOCK_OAUTH_REVENUE_TITLE,
            revenue_display: MOCK_OAUTH_REVENUE_VALUE,
            revenue: 42750,
          },
          status: 'active',
        }
      : { error: 'invalid_token' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}
