# Glancier Flow Step Reference

## 1. Auth and Blocking Steps

### `api_key`
- Purpose: ask the user for API key/token input.
- Common `args`: `label`, `description`
- Common `secrets`: `api_key`
- Notes: credential-focused step; preferred for API authentication and invalid-credential recovery UX.

### `form`
- Purpose: collect generic user input fields for runtime flow.
- Common `args`:
  - `fields` (list): each item supports `key`, `label`, `type`, `description`, `required`, `default`
  - single-field shorthand: `key`, `label`, `type`, `description`, `required`, `default`
  - `defaults` (dict): fallback defaults by field key
  - `message`, `warning_message`
- Notes: `form` does not define persistence policy by itself. Persist values via `secrets`, `outputs`, or `context` mapping as needed.

### `oauth`
- Purpose: run OAuth and persist tokens.
- Typical output: `oauth_secrets` (token bundle, for example `oauth_secrets.access_token`)

### `curl`
- Purpose: ask the user to paste a browser-captured cURL command.
- Common `secrets`: `curl_command`

### `webview`
- Purpose: open a background page in desktop runtime and intercept target API responses.
- Common `args`: `url`, `intercept_api`
- Common `secrets`: `webview_data`
- Runtime details: [../webview-scraper/01_architecture_and_dataflow.md](../webview-scraper/01_architecture_and_dataflow.md)

## 2. Data Processing Steps

### Output Mapping Format
- `outputs` uses the unified format: `target_var: source_path`
- Supported source paths:
  - direct key (for example `http_response`)
  - dotted path (for example `headers.Authorization`)
  - JSONPath (for example `$.data[0].id`)

### `http`
- Purpose: execute a standard HTTP request.
- Typical outputs: `http_response`, `raw_data`, `headers`

### `extract`
- Purpose: extract fields from structured data.
- Common `args`: `source`, `type` (`jsonpath` / `key`)
- Multi-output supported via multiple mappings in `outputs`

### `script`
- Purpose: run lightweight script-based transformation (subject to runtime policy)

## 3. Adding a New Step

- Add the new `StepType` in [core/config_loader.py](/Users/xingminghua/Coding/evoltonnac/glancier/core/config_loader.py).
- Declare its `args` JSON schema in the colocated `STEP_ARGS_SCHEMAS_BY_USE` map (same file).
- Run `make gen-schemas` to regenerate `config/schemas/integration.python.schema.json` and `config/schemas/integration.schema.json`.
- The schema generator fails if a `StepType` has no matching `STEP_ARGS_SCHEMAS_BY_USE` declaration, preventing silent drift.

## 4. Example (WebView + Extract)

```yaml
flow:
  - id: webview_fetch
    use: webview
    args:
      url: "https://console.soniox.com/"
      intercept_api: "/dashboard/"
    outputs:
      dashboard_response: "webview_data"

  - id: parse_balance
    use: extract
    args:
      source: "{dashboard_response}"
      type: "jsonpath"
    outputs:
      available_balance: "$.billing.available_balance_usd"
      currency: "$.billing.currency"
```
