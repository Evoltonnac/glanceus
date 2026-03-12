import type { ComponentType } from "react";
import { Globe, Key, Lock, Terminal } from "lucide-react";

export type IntegrationPresetId = "api_key" | "oauth2" | "curl" | "webscraper";

export type IntegrationPreset = {
    id: IntegrationPresetId;
    label: string;
    description: string;
    filenameHint: string;
    icon: ComponentType<{ className?: string }>;
    buildContent: (displayName: string) => string;
};

function toYamlSingleQuoted(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

export const integrationPresets: IntegrationPreset[] = [
    {
        id: "api_key",
        label: "API Key",
        description: "HTTP API with bearer token authentication.",
        filenameHint: "api_key_example",
        icon: Key,
        buildContent: (displayName: string) => {
            const integrationName = displayName || "API Key Integration";
            return `name: ${toYamlSingleQuoted(integrationName)}
description: "Preset for API key authenticated HTTP APIs."
flow:
  - id: auth
    use: api_key
    args:
      label: "API Key"
      description: "Enter your API bearer token"
    outputs:
      api_key: "api_key"
    secrets:
      api_key: "api_key"
  - id: fetch_data
    use: http
    args:
      url: "https://api.example.com/v1/metrics"
      method: "GET"
      headers:
        Authorization: "Bearer {api_key}"
    outputs:
      http_response: "payload"
  - id: parse_value
    use: extract
    args:
      source: "{payload}"
      type: "jsonpath"
      expr: "$.value"
    outputs:
      value: "value"
templates:
  - label: "Overview"
    type: "source_card"
    ui:
      title: "API Key Metrics"
      icon: "🔐"
    widgets:
      - type: "TextBlock"
        text: "{value}"
        size: "hero"
        weight: "bold"
      - type: "TextBlock"
        text: "Current Value"
        color: "muted"
        size: "small"
`;
        },
    },
    {
        id: "oauth2",
        label: "OAuth2",
        description: "Authorization-code OAuth2 flow with API request.",
        filenameHint: "oauth2_example",
        icon: Lock,
        buildContent: (displayName: string) => {
            const integrationName = displayName || "OAuth2 Integration";
            return `name: ${toYamlSingleQuoted(integrationName)}
description: "Preset for OAuth2-based integrations."
flow:
  - id: authorize
    use: oauth
    args:
      auth_url: "https://provider.example.com/oauth/authorize"
      token_url: "https://provider.example.com/oauth/token"
      scopes: ["read"]
      doc_url: "https://provider.example.com/docs/oauth"
    outputs:
      access_token: "access_token"
    secrets:
      access_token: "access_token"
  - id: fetch_profile
    use: http
    args:
      url: "https://provider.example.com/api/profile"
      method: "GET"
      headers:
        Authorization: "Bearer {access_token}"
    outputs:
      http_response: "profile_payload"
  - id: parse_username
    use: extract
    args:
      source: "{profile_payload}"
      type: "jsonpath"
      expr: "$.name"
    outputs:
      username: "username"
templates:
  - label: "OAuth Profile"
    type: "source_card"
    ui:
      title: "OAuth Profile"
      icon: "🔓"
    widgets:
      - type: "FactSet"
        facts:
          - label: "User"
            value: "{username}"
`;
        },
    },
    {
        id: "curl",
        label: "cURL",
        description: "Collect request details from a user-provided cURL.",
        filenameHint: "curl_example",
        icon: Terminal,
        buildContent: (displayName: string) => {
            const integrationName = displayName || "cURL Integration";
            return `name: ${toYamlSingleQuoted(integrationName)}
description: "Preset for cURL-based session workflows."
flow:
  - id: paste_curl
    use: curl
    args:
      label: "Session cURL Command"
      description: "Paste a complete cURL command copied from browser devtools."
      message: "Please paste your cURL command."
    outputs:
      headers: "request_headers"
  # cURL tutorial notes:
  # 1) Replace the URL with your target endpoint.
  # 2) Keep only required headers (for example: Authorization, Accept, X-Trace-Id).
  # 3) Add query params directly in the URL or via your pasted cURL command.
  # 4) Use JSONPath filters below to keep only the fields your dashboard needs.
  - id: fetch_data
    use: http
    args:
      url: "https://api.example.com/v1/usage?status=active"
      method: "GET"
      headers: "{request_headers}"
    outputs:
      http_response: "usage_payload"
  - id: parse_result_count
    use: extract
    args:
      source: "{usage_payload}"
      type: "jsonpath"
      expr: "$.results.length()"
    outputs:
      result_count: "result_count"
templates:
  - label: "cURL Usage"
    type: "source_card"
    ui:
      title: "cURL Session"
      icon: "🧪"
    widgets:
      - type: "FactSet"
        facts:
          - label: "Filtered Results"
            value: "{result_count}"
          - label: "Tips"
            value: "Edit JSONPath in parse_result_count to filter your payload."
`;
        },
    },
    {
        id: "webscraper",
        label: "Web Scraper",
        description: "WebView scraping flow with extracted fields.",
        filenameHint: "webscraper_example",
        icon: Globe,
        buildContent: (displayName: string) => {
            const integrationName = displayName || "Web Scraper Integration";
            return `name: ${toYamlSingleQuoted(integrationName)}
description: "Preset for WebView-based data scraping."
flow:
  - id: collect_page_data
    use: webview
    args:
      url: "https://example.com/dashboard"
      intercept_api: "/api/"
      script: ""
    outputs:
      webview_data: "page_payload"
  - id: parse_title
    use: extract
    args:
      source: "{page_payload}"
      type: "jsonpath"
      expr: "$.title"
    outputs:
      title: "title"
templates:
  - label: "Web Scraper Snapshot"
    type: "source_card"
    ui:
      title: "Web Scraper"
      icon: "🕸️"
    widgets:
      - type: "FactSet"
        facts:
          - label: "Title"
            value: "{title}"
`;
        },
    },
];
