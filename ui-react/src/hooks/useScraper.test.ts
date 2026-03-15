import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStore } from "../store";
import { mockInvoke, mockListen, mockUnlisten } from "../test/mocks/tauri";
import type { SourceSummary } from "../types/config";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        getSources: vi.fn(),
        interact: vi.fn(),
        refreshSource: vi.fn(),
    },
}));

vi.mock("../api/client", () => ({
    api: apiMock,
}));

vi.mock("../lib/utils", () => ({
    isTauri: () => true,
}));

import { useScraper } from "./useScraper";

function buildWebviewSource(id: string, name: string): SourceSummary {
    return {
        id,
        name,
        description: `${name} source`,
        enabled: true,
        auth_type: "oauth",
        has_data: false,
        status: "suspended",
        interaction: {
            type: "webview_scrape",
            step_id: "webview",
            message: "Need webview scraping",
            fields: [],
            data: {
                url: "https://example.com/dashboard",
                script: "console.log('scrape')",
                intercept_api: "/api/dashboard",
                secret_key: "webview_data",
            },
        },
    };
}

describe("useScraper observer mode", () => {
    const initialState = useStore.getState();

    beforeEach(() => {
        useStore.setState(initialState, true);
        mockInvoke.mockReset();
        mockListen.mockReset();
        mockUnlisten.mockReset();
        mockListen.mockResolvedValue(mockUnlisten);

        apiMock.getSources.mockReset();
        apiMock.interact.mockReset();
        apiMock.refreshSource.mockReset();
        apiMock.getSources.mockResolvedValue([]);
        apiMock.interact.mockResolvedValue(undefined);
        apiMock.refreshSource.mockResolvedValue(undefined);
    });

    it("manual foreground action delegates to backend refresh and never pushes task from frontend", () => {
        const source = buildWebviewSource("manual-fg", "Manual FG");
        useStore.setState({
            sources: [source],
            activeScraper: null,
            skippedScrapers: new Set(),
        });

        const { result } = renderHook(() => useScraper());
        let started = false;
        act(() => {
            started = result.current.handlePushToQueue(source, { foreground: true });
        });

        expect(started).toBe(true);
        expect(apiMock.refreshSource).toHaveBeenCalledWith(source.id);
        expect(
            mockInvoke.mock.calls.some(([cmd]) => cmd === "push_scraper_task"),
        ).toBe(false);
    });

    it("show_scraper_window keeps active task state for status banner", async () => {
        const source = buildWebviewSource("active-bg", "Active BG");
        useStore.setState({
            sources: [source],
            activeScraper: source.id,
            skippedScrapers: new Set(),
        });
        mockInvoke.mockResolvedValue(undefined);

        const { result } = renderHook(() => useScraper());
        await act(async () => {
            await result.current.handleShowScraperWindow();
        });

        expect(mockInvoke).toHaveBeenCalledWith("show_scraper_window");
        expect(useStore.getState().activeScraper).toBe(source.id);
    });

    it("lifecycle logs drive active scraper status updates", async () => {
        const source = buildWebviewSource("source-1", "Source 1");
        useStore.setState({
            sources: [source],
            activeScraper: null,
            skippedScrapers: new Set(),
        });

        let lifecycleListener:
            | ((event: { payload: any }) => void | Promise<void>)
            | undefined;
        mockListen.mockImplementation((eventName: string, callback: any) => {
            if (eventName === "scraper_lifecycle_log") {
                lifecycleListener = callback;
            }
            return Promise.resolve(mockUnlisten);
        });

        renderHook(() => useScraper());
        await act(async () => {
            await Promise.resolve();
        });

        expect(lifecycleListener).toBeDefined();

        act(() => {
            lifecycleListener?.({
                payload: {
                    source_id: source.id,
                    task_id: "task-1",
                    stage: "task_claimed",
                    level: "info",
                    message: "Claimed backend scraper task",
                    timestamp: 1,
                },
            });
        });
        expect(useStore.getState().activeScraper).toBe(source.id);

        act(() => {
            lifecycleListener?.({
                payload: {
                    source_id: source.id,
                    task_id: "task-1",
                    stage: "task_complete",
                    level: "info",
                    message: "Scraper completed",
                    timestamp: 2,
                },
            });
        });
        expect(useStore.getState().activeScraper).toBeNull();
    });

    it("scraper_result error clears active state and marks source skipped", async () => {
        const source = buildWebviewSource("source-err", "Source Err");
        useStore.setState({
            sources: [source],
            activeScraper: source.id,
            skippedScrapers: new Set(),
        });

        let resultListener:
            | ((event: { payload: any }) => void | Promise<void>)
            | undefined;
        mockListen.mockImplementation((eventName: string, callback: any) => {
            if (eventName === "scraper_result") {
                resultListener = callback;
            }
            return Promise.resolve(mockUnlisten);
        });
        mockInvoke.mockImplementation((command: string) => {
            if (command === "get_scraper_error_logs") {
                return Promise.resolve([]);
            }
            return Promise.resolve(undefined);
        });

        renderHook(() => useScraper());
        await act(async () => {
            await Promise.resolve();
        });

        expect(resultListener).toBeDefined();

        await act(async () => {
            await resultListener?.({
                payload: {
                    sourceId: source.id,
                    taskId: "task-err-1",
                    data: null,
                    error: "boom",
                    secretKey: "webview_data",
                },
            });
        });

        expect(useStore.getState().activeScraper).toBeNull();
        expect(useStore.getState().skippedScrapers.has(source.id)).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith("get_scraper_error_logs", {
            sourceId: source.id,
        });
    });
});
