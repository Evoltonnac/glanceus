import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOCK_OAUTH_ACCOUNT_NAME = 'Glanceus Mock Account';
const MOCK_OAUTH_INTEGRATION_ID = 'mock-oauth-openapi';
const MOCK_OAUTH_PRESET_ID = 'mock_oauth_openapi';
const MOCK_OAUTH_REVENUE_TITLE = 'Mock OAuth Revenue';
const MOCK_OAUTH_REVENUE_VALUE = '$42,750';
const DEFAULT_PORT = 61873;

const port = Number(process.env.MIDSCENE_MOCK_OAUTH_PORT || DEFAULT_PORT);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(scriptDir, '../ui-react');
const defaultDataDir = path.join(uiRoot, 'tests-e2e-temp');
const dataDir = path.resolve(process.env.GLANCEUS_DATA_DIR || defaultDataDir);
const presetDir = path.join(dataDir, 'config', 'presets');
const presetPath = path.join(presetDir, 'mock_oauth_openapi.yaml');
const baseUrl = `http://127.0.0.1:${port}`;
const state = {
  authorizationStarted: false,
  tokenExchanged: false,
  openApiDataRequested: false,
};

function buildContentTemplate() {
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

function buildPreset() {
  const indentedTemplate = buildContentTemplate()
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
    .trimEnd();

  return `id: "${MOCK_OAUTH_PRESET_ID}"
label: "OAuth Mock OpenAPI"
description: "OAuth authorization-code flow backed by a local mock provider and OpenAPI endpoint."
filename_hint: "${MOCK_OAUTH_INTEGRATION_ID}"
content_template: |
${indentedTemplate}
`;
}

function handleRequest(req, res) {
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

await mkdir(presetDir, { recursive: true });
await writeFile(presetPath, buildPreset(), 'utf8');

const server = createServer(handleRequest);

server.listen(port, '127.0.0.1', () => {
  console.log('[e2e:mocks] E2E mock services are running');
  console.log(`[e2e:mocks]   Data dir: ${dataDir}`);
  console.log(`[e2e:mocks]   Preset: ${presetPath}`);
  console.log('[e2e:mocks] Services:');
  console.log(`  - OAuth/OpenAPI mock provider: ${baseUrl}`);
  console.log(`    health: ${baseUrl}/health`);
  console.log(`    authorize: ${baseUrl}/oauth/authorize`);
  console.log(`    token: ${baseUrl}/oauth/token`);
  console.log(`    revenue API: ${baseUrl}/openapi/revenue`);
  console.log('[e2e:mocks] Workspace presets:');
  console.log(`  - OAuth Mock OpenAPI (${MOCK_OAUTH_PRESET_ID})`);
});

const shutdown = () => {
  server.close(() => {
    console.log('\n[e2e:mocks] Mock OAuth/OpenAPI server stopped');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
