import { defineConfig } from "playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// playwright.config.ts is at <root>/ui-react/playwright.config.ts
// __dirname resolves to the directory containing the compiled/executed config
// Since this file is at ui-react/playwright.config.ts, go up one level to get project root
const configFilePath = fileURLToPath(import.meta.url);
const uiReactDir = path.dirname(configFilePath); // e.g. .../glanceus/ui-react
const projectRoot = path.resolve(uiReactDir, ".."); // e.g. .../glanceus

const scriptPath = path.join(projectRoot, "scripts", "dev_server_for_e2e_with_mocks.sh");
const e2eTempDir = path.join(projectRoot, "ui-react", "tests-e2e-temp");

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 90_000,
    expect: {
        timeout: 5_000,
    },
    use: {
        baseURL: "http://127.0.0.1:3000",
        headless: true,
    },
    webServer: {
        command: `bash ${scriptPath}`,
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
            GLANCEUS_DATA_DIR: e2eTempDir,
        },
    },
    reporter: [
        ['list'],
        ['@midscene/web/playwright-reporter', { type: 'merged' }],
    ],
});
