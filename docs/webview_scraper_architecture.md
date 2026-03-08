# WebView Scraper Architecture & Implementation Guide

This document outlines the architecture and implementation details of **Glancier's** WebView scraping engine.

## 1. Overview & Core Philosophy

Traditional data fetching relies on simple HTTP requests (`requests`/`httpx`). However, modern platforms frequently employ complex Client-Side Rendering (CSR), CAPTCHAs, or dynamic cookies that are difficult to bypass programmatically. 

Instead of embedding a heavy, brittle headless browser like Playwright or Selenium into the backend, Glancier leverages its desktop nature. It utilizes Tauri's native, lightweight `WebviewWindow` capabilities to silently scrape data in the background. It is highly efficient, uses the user's native OS web engine (WKWebView on Mac, Edge WebView2 on Windows), and effortlessly handles modern JavaScript execution.

## 2. Architecture & Data Flow

The scraping process spans across the entire technology stack (Python -> React -> Rust -> JavaScript) in a synchronized event loop:

1. **Python Core (Suspension):** The Python executor encounters a `webview` step in the flow configuration. If the data is not found in the `SecretsController`, Python suspends execution, registers a `NeedsInteraction` state (`type="webview_scrape"`), and waits.
2. **React View (Delegation):** The Frontend `FlowHandler` spots the `webview_scrape` state. It renders a background loading spinner and triggers the native Tauri IPC command `push_scraper_task`.
3. **Rust Core (Execution):** The Tauri backend spins up an invisible `scraper_worker` WebView. It injects a powerful network interceptor and resource blocker into the target URL.
4. **JavaScript (Extraction):** The target page executes normally. The injected script intercepts `fetch` or `XHR` calls matching the configured `intercept_api` target.
5. **Rust Core (Relay):** The JS script invokes Tauri's `handle_scraped_data` command with the intercepted JSON. Rust closes the WebView and emits a `scraper_result` event to React.
6. **React View (Submission):** React catches the event and POSTs the extracted JSON back to the Python backend via the interaction API.
7. **Python Core (Resumption):** The flow resumes, passing the raw JSON downstream to `extract` steps.

## 3. Technical Implementation Details

### 3.1 State Machine Suspension (Python Core)

Handled in `core/executor.py` and `core/auth/`. The flow engine acts as a state machine. It does not run any browser process; it structurally treats WebView scraping the same as an API Key prompt—an asynchronous block requiring client input. Once the payload arrives, it is cached securely against the configured `secret_key` alias.

### 3.2 IPC Dispatch Tracking (React View)

React's role is strictly as an event relayer. It sits idle, listening to `window.__TAURI__.event.listen("scraper_result", ...)` and `scraper_auth_required`. It bridges the gap between the Rust desktop environment and the Python REST backend.

Scraper UI/hook logic is **Tauri-only** by design:
- In plain browser runtime, scraper queue actions must be no-op and never invoke Tauri commands.
- In Tauri runtime, each scraper task uses a configurable timeout (default `10s` from Settings). Timed-out tasks are removed from queue and scheduler proceeds to next task.

### 3.3 Singleton WebView & Resource Blocking (Rust Core)

Implemented in `ui-react/src-tauri/src/scraper.rs`.
- **Singleton Pattern:** Only one `scraper_worker` can exist. A new task forcibly purges any existing worker window to prevent memory leaks and state cross-contamination.
- **Resource Blocker:** To keep scraping blazing fast and silent, the injected script heavily mocks network calls. It blocks the loading of static assets (`.png`, `.woff`, etc.) by returning empty `Response` mocks in the `fetch` override.
- **DOM Blocker:** A `MutationObserver` actively swaps `<img>` sources to 1x1 transparent Base64 GIFs as soon as the DOM generates them, preventing image asset bandwidth usage.

## 4. Exception Handling & Edge Cases

The most critical edge case in background scraping is Authentication (e.g., Session Expired, Cloudflare Check).

### 4.2 Non-Tauri Environment (Web Fallback)

Since the WebView scraper relies on Tauri's native window capabilities and IPC commands, it cannot function in a standard browser environment.

1.  **Detection:** The frontend uses `isTauri()` (detecting `window.__TAURI_INTERNALS__`) to determine the current runtime.
2.  **Interaction Blocking:** When a flow reaches a `webview_scrape` interaction state in a browser:
    -   The `FlowHandler` dialog displays a fallback UI explaining that the feature is desktop-only.
    -   It provides a direct link to the GitHub Releases page for users to download the desktop client.
    -   The "Manual Start" button is hidden/replaced by the download CTA.
3.  **Status Banner:** The `ScraperStatusBanner` in the dashboard detects the environment:
    -   **Tauri:** Shows full controls, task queue length, and real-time logs.
    -   **Web:** Shows a subtle "Web 端无法进行网页抓取" (Web scraping unavailable) message and a "Get Client" button.

This ensures users are never stuck without knowing why a data source isn't refreshing, while maintaining a clear upgrade path to the full desktop experience.

## 5. Integration Developer Guide


To utilize the WebView scraper, define a `webview` step in your `flow` array.

```yaml
- id: fetch_dashboard
  use: webview
  args:
    url: "https://console.platform.com/billing"
    intercept_api: "/api/v1/dashboard/metrics" # Triggers when the page makes a fetch matching this string
  secrets:
    webview_data: "my_raw_dashboard_json"
```

The captured HTTP response JSON will be output to the flow context as `my_raw_dashboard_json`, ready to be surgically parsed by subsequent `extract` steps utilizing JSONPath.
