import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SourceSummary } from "../types/config";
import { useStore } from "../store";
import { mockInvoke } from "../test/mocks/tauri";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        getSettings: vi.fn(),
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

describe("useScraper foreground behavior", () => {
    const initialState = useStore.getState();

    beforeEach(() => {
        useStore.setState(initialState, true);
        mockInvoke.mockReset();
        apiMock.getSettings.mockReset();
        apiMock.getSettings.mockImplementation(
            () => new Promise(() => undefined),
        );
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("does not preempt active background scraper when manually opening foreground task", () => {
        const active = buildWebviewSource("active-bg", "Active BG");
        const manual = buildWebviewSource("manual-fg", "Manual FG");
        useStore.setState({
            sources: [active, manual],
            activeScraper: active.id,
            skippedScrapers: new Set(),
        });

        const { result } = renderHook(() => useScraper());
        const added = result.current.handlePushToQueue(manual, { foreground: true });

        expect(added).toBe(false);
        expect(useStore.getState().activeScraper).toBe(active.id);
        expect(
            mockInvoke.mock.calls.some(([cmd]) => cmd === "cancel_scraper_task"),
        ).toBe(false);
        expect(
            mockInvoke.mock.calls.some(([cmd]) => cmd === "push_scraper_task"),
        ).toBe(false);
    });

    it("showing scraper window detaches current active task from background queue", async () => {
        const active = buildWebviewSource("active-bg", "Active BG");
        useStore.setState({
            sources: [active],
            activeScraper: active.id,
            skippedScrapers: new Set(),
        });
        mockInvoke.mockResolvedValue(undefined);

        const { result } = renderHook(() => useScraper());
        await act(async () => {
            await result.current.handleShowScraperWindow();
        });

        expect(mockInvoke).toHaveBeenCalledWith("show_scraper_window");
        expect(useStore.getState().activeScraper).toBeNull();
        expect(useStore.getState().skippedScrapers.has(active.id)).toBe(true);
    });

    it("detached foreground task is not cancelled by queue timeout", async () => {
        vi.useFakeTimers();
        const active = buildWebviewSource("active-bg", "Active BG");
        useStore.setState({
            sources: [active],
            activeScraper: active.id,
            skippedScrapers: new Set(),
        });
        mockInvoke.mockResolvedValue(undefined);

        const { result } = renderHook(() => useScraper());
        await act(async () => {
            await result.current.handleShowScraperWindow();
        });

        const queueIds = result.current.webviewQueue.map((s) => s.id);
        expect(queueIds).not.toContain(active.id);
        expect(useStore.getState().activeScraper).toBeNull();

        await act(async () => {
            vi.advanceTimersByTime(11_000);
            await Promise.resolve();
        });

        expect(
            mockInvoke.mock.calls.some(([cmd]) => cmd === "cancel_scraper_task"),
        ).toBe(false);
    });

    it("detached foreground task does not trigger next background queue task immediately", async () => {
        const active = buildWebviewSource("active-bg", "Active BG");
        const queued = buildWebviewSource("queued-bg", "Queued BG");
        useStore.setState({
            sources: [active, queued],
            activeScraper: active.id,
            skippedScrapers: new Set(),
        });
        mockInvoke.mockResolvedValue(undefined);

        const { result } = renderHook(() => useScraper());
        await act(async () => {
            await result.current.handleShowScraperWindow();
            await Promise.resolve();
        });

        expect(useStore.getState().activeScraper).toBeNull();
        expect(useStore.getState().skippedScrapers.has(active.id)).toBe(true);
        expect(
            mockInvoke.mock.calls.some(
                ([cmd, payload]) =>
                    cmd === "push_scraper_task" &&
                    (payload as { sourceId?: string })?.sourceId === queued.id,
            ),
        ).toBe(false);
    });

    it("manual foreground task is not added to background queue", async () => {
        const manual = buildWebviewSource("manual-fg", "Manual FG");
        if (manual.interaction?.data) {
            manual.interaction.data.manual_only = true;
        }
        useStore.setState({
            sources: [manual],
            activeScraper: null,
            skippedScrapers: new Set(),
        });
        mockInvoke.mockResolvedValue(undefined);

        const { result } = renderHook(() => useScraper());
        let started = false;
        act(() => {
            started = result.current.handlePushToQueue(manual, { foreground: true });
        });

        expect(started).toBe(true);
        expect(useStore.getState().activeScraper).toBeNull();
        expect(useStore.getState().skippedScrapers.has(manual.id)).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
            "push_scraper_task",
            expect.objectContaining({
                sourceId: manual.id,
                foreground: true,
            }),
        );

        const queueIds = result.current.webviewQueue.map((s) => s.id);
        expect(queueIds).not.toContain(manual.id);
    });
});
