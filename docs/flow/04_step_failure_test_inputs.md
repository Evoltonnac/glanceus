# Step Failure Test Input Examples

These inputs are for fast regression on recoverability after auth failures.

## 1. `test_fail_step_api_key.yaml`

- Goal: validate invalid-credential handling for `api_key` (`ERROR` + `input_text` retry)
- Input: `test_api_key: sk-test-invalid`
- Expected:
  - `fetch_unauthorized` returns 401
  - source status becomes `error`
  - interaction type is `input_text`

## 2. `test_fail_step_oauth.yaml`

- Goal: validate missing/invalid credential handling for `oauth`
- Input:
  - initial interaction with invalid `client_id` / `client_secret`
  - optional direct-failure seed: `oauth_secrets: {"access_token":"test-token-invalid"}`
- Expected:
  - when token exists, `fetch_unauthorized` returns 401
  - source status becomes `error`
  - interaction type is `oauth_start`

## 3. `test_fail_step_curl.yaml`

- Goal: validate expired session handling for `curl` (`ERROR` + cURL re-entry)
- Input: `test_curl_command: curl 'https://example.com' -H 'Authorization: Bearer invalid-token'`
- Expected:
  - `fetch_unauthorized` returns 401
  - source status becomes `error`
  - interaction type is `input_text`

## 4. `test_fail_step_webview.yaml`

- Goal: validate blocked WebView recovery (`SUSPENDED` + `webview_scrape`)
- Input: `test_webview_data: {"session":"invalid","note":"failure-test"}`
- Expected:
  - `fetch_blocked` returns 403
  - source status becomes `suspended`
  - interaction type is `webview_scrape`
  - interaction payload includes `manual_only=true`
  - interaction payload does not require `force_foreground=true` default

## 5. `test_fail_step_webview_uncertain.yaml`

- Goal: validate uncertain WebView runtime failure retries (`ERROR` + retry budget)
- Input: `test_webview_data: {"mode":"uncertain","note":"retry-test"}`
- Expected:
  - source `error_code` becomes `runtime.retry_required` (or `runtime.network_timeout` for timeout-class uncertainty)
  - refresh scheduler retries with bounded backoff (`60s`, `180s`, `600s`)
  - retry cap is `3` attempts before terminal failure handling
  - status churn (`error` <-> `suspended`) does not restart retry budget for the same runtime signature
  - `updated_at` mutations alone do not reset the backoff window

### 5.1 Churn Regression Notes

- Reproduce loop-risk path by updating source status and `updated_at` between retries.
- Confirm second retry still waits for the `180s` window from first enqueue.
- Confirm third retry still waits for the `600s` window from second enqueue.
- Confirm no fourth automatic retry is enqueued without success/signature reset.

WebView runtime details: [../webview-scraper/02_runtime_and_fallback.md](../webview-scraper/02_runtime_and_fallback.md)
Refresh scheduler retry architecture: [05_refresh_scheduler_and_retry.md](05_refresh_scheduler_and_retry.md)
