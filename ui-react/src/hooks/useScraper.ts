import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { api } from "../api/client";
import { isTauri } from "../lib/utils";
import { useStore } from "../store";
import { useI18n } from "../i18n";
import type { SourceSummary } from "../types/config";

const SCRAPER_LOG_LIMIT = 300;
const ACTIVE_STAGES = new Set(["task_claimed", "task_start", "window_ready"]);
const TERMINAL_STAGES = new Set([
    "task_complete",
    "task_cancelled",
    "task_killed_log_burst",
]);

export interface ScraperLifecycleLog {
    source_id: string;
    task_id: string;
    stage: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    timestamp: number;
    details?: Record<string, any>;
}

function scraperLogKey(log: ScraperLifecycleLog): string {
    return [
        log.source_id,
        log.task_id,
        log.stage,
        log.level,
        log.timestamp,
        log.message,
    ].join("|");
}

function mergeScraperLogs(
    current: ScraperLifecycleLog[],
    incoming: ScraperLifecycleLog[],
): ScraperLifecycleLog[] {
    if (incoming.length === 0) {
        return current.slice(-SCRAPER_LOG_LIMIT);
    }

    const merged = [...current, ...incoming];
    const seen = new Set<string>();
    const deduped: ScraperLifecycleLog[] = [];
    for (const log of merged) {
        const key = scraperLogKey(log);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        deduped.push(log);
    }

    deduped.sort((a, b) => a.timestamp - b.timestamp);
    return deduped.length > SCRAPER_LOG_LIMIT
        ? deduped.slice(-SCRAPER_LOG_LIMIT)
        : deduped;
}

export function useScraper() {
    const { t } = useI18n();
    const scraperEnabled = isTauri();
    const sources = useStore((state) => state.sources);
    const setSources = useStore((state) => state.setSources);
    const activeScraper = useStore((state) => state.activeScraper);
    const setActiveScraper = useStore((state) => state.setActiveScraper);
    const skippedScrapers = useStore((state) => state.skippedScrapers);
    const addSkippedScraper = useStore((state) => state.addSkippedScraper);
    const setSkippedScrapers = useStore((state) => state.setSkippedScrapers);
    const showToast = useStore((state) => state.showToast);
    const [scraperLogs, setScraperLogs] = useState<ScraperLifecycleLog[]>([]);

    const activeScraperRef = useRef<string | null>(null);
    const activeTaskIdRef = useRef<string | null>(null);

    useEffect(() => {
        activeScraperRef.current = activeScraper;
    }, [activeScraper]);

    const syncErrorLogsFromMemory = useCallback(
        async (sourceId?: string | null) => {
            if (!scraperEnabled) {
                return;
            }

            try {
                const logs = await invoke<ScraperLifecycleLog[]>(
                    "get_scraper_error_logs",
                    { sourceId: sourceId ?? null },
                );
                if (!Array.isArray(logs) || logs.length === 0) {
                    return;
                }
                const errorLogs = logs.filter((log) => log.level === "error");
                if (errorLogs.length === 0) {
                    return;
                }
                setScraperLogs((prev) => mergeScraperLogs(prev, errorLogs));
            } catch (error) {
                console.error(
                    "Failed to sync scraper error logs from Rust memory:",
                    error,
                );
            }
        },
        [scraperEnabled],
    );

    const webviewQueue = sources.filter(
        (source) =>
            scraperEnabled &&
            source.status === "suspended" &&
            source.interaction?.type === "webview_scrape" &&
            !skippedScrapers.has(source.id),
    );

    const handleSkipScraper = useCallback(async () => {
        if (!scraperEnabled || !activeScraper) {
            return;
        }

        try {
            await invoke("cancel_scraper_task");
            await syncErrorLogsFromMemory(activeScraper);
        } catch (error) {
            console.error("Failed to cancel scraper task:", error);
        }

        addSkippedScraper(activeScraper);
        activeTaskIdRef.current = null;
        setActiveScraper(null);
    }, [
        activeScraper,
        addSkippedScraper,
        scraperEnabled,
        setActiveScraper,
        syncErrorLogsFromMemory,
    ]);

    const handleClearScraperQueue = useCallback(async () => {
        if (!scraperEnabled) {
            return;
        }

        if (activeScraper) {
            try {
                await invoke("cancel_scraper_task");
            } catch (error) {
                console.error("Failed to cancel active scraper task:", error);
            }
        }

        const newSkipped = new Set(skippedScrapers);
        if (activeScraper) {
            newSkipped.add(activeScraper);
        }
        webviewQueue.forEach((source) => newSkipped.add(source.id));
        setSkippedScrapers(newSkipped);
        activeTaskIdRef.current = null;
        setActiveScraper(null);

        // Keep recent error logs for troubleshooting; drop noisy non-error logs.
        setScraperLogs((prev) =>
            prev.filter((log) => log.level === "error").slice(-SCRAPER_LOG_LIMIT),
        );
    }, [
        activeScraper,
        scraperEnabled,
        setActiveScraper,
        setSkippedScrapers,
        skippedScrapers,
        webviewQueue,
    ]);

    const handlePushToQueue = useCallback(
        (source: SourceSummary, options?: { foreground?: boolean }): boolean => {
            if (!scraperEnabled) {
                showToast(t("scraper.toast.unavailable"), "error");
                return false;
            }

            const nextSkipped = new Set(useStore.getState().skippedScrapers);
            nextSkipped.delete(source.id);
            setSkippedScrapers(nextSkipped);

            const forceForeground =
                Boolean(options?.foreground) ||
                Boolean(source.interaction?.data?.force_foreground);

            if (forceForeground) {
                const currentActive = useStore.getState().activeScraper;
                if (currentActive === source.id) {
                    void invoke("show_scraper_window").catch((error) => {
                        console.error("Failed to show scraper window:", error);
                    });
                    return true;
                }
                showToast(
                    t("scraper.toast.retryQueued"),
                    "info",
                );
            }

            void api.refreshSource(source.id).catch((error) => {
                console.error(`Failed to request scraper retry for ${source.id}:`, error);
                showToast(t("scraper.toast.retryFailed"), "error");
            });
            return true;
        },
        [scraperEnabled, setSkippedScrapers, showToast],
    );

    const handleShowScraperWindow = useCallback(async () => {
        if (!scraperEnabled) {
            return;
        }
        try {
            await invoke("show_scraper_window");
        } catch (error) {
            console.error("Failed to show scraper window:", error);
        }
    }, [scraperEnabled]);

    // Frontend observer mode: keep status/log visibility,
    // while Rust daemon owns automatic claim + execution.
    useEffect(() => {
        if (!scraperEnabled) {
            return;
        }

        let unlistenScraperResult: (() => void) | undefined;
        let unlistenAuthRequired: (() => void) | undefined;
        let unlistenLifecycleLog: (() => void) | undefined;

        const setupListeners = async () => {
            unlistenLifecycleLog = await listen<ScraperLifecycleLog>(
                "scraper_lifecycle_log",
                (event) => {
                    const log = event.payload;
                    setScraperLogs((prev) => mergeScraperLogs(prev, [log]));

                    if (ACTIVE_STAGES.has(log.stage)) {
                        if (log.task_id) {
                            activeTaskIdRef.current = log.task_id;
                        }
                        if (log.source_id && activeScraperRef.current !== log.source_id) {
                            useStore.getState().setActiveScraper(log.source_id);
                        }
                    }

                    if (TERMINAL_STAGES.has(log.stage)) {
                        const currentTaskId = activeTaskIdRef.current;
                        if (log.task_id && currentTaskId && log.task_id !== currentTaskId) {
                            return;
                        }
                        activeTaskIdRef.current = null;
                        if (activeScraperRef.current) {
                            useStore.getState().setActiveScraper(null);
                        }
                    }

                    if (
                        log.stage === "task_cancelled" ||
                        log.stage === "task_killed_log_burst"
                    ) {
                        void syncErrorLogsFromMemory(log.source_id);
                    }
                },
            );

            unlistenScraperResult = await listen<{
                sourceId: string;
                taskId?: string;
                data: any;
                error?: string;
                secretKey: string;
            }>("scraper_result", async (event) => {
                const { sourceId, taskId, data, error, secretKey } = event.payload;

                if (
                    taskId &&
                    activeTaskIdRef.current &&
                    activeTaskIdRef.current !== taskId
                ) {
                    console.warn(
                        `[Scraper] Discarding stale task result for ${sourceId}: ${taskId} != ${activeTaskIdRef.current}`,
                    );
                    return;
                }
                if (taskId) {
                    activeTaskIdRef.current = taskId;
                }

                useStore.getState().setActiveScraper(null);
                activeTaskIdRef.current = null;

                if (error) {
                    console.error(`Scraper error for ${sourceId}:`, error);
                    useStore.getState().addSkippedScraper(sourceId);
                    void syncErrorLogsFromMemory(sourceId);
                    return;
                }

                try {
                    const refreshedSources = await api.getSources();
                    setSources(refreshedSources);
                    const latest = refreshedSources.find((source) => source.id === sourceId);
                    if (latest && latest.status !== "suspended") {
                        return;
                    }
                    // Fallback for legacy/manual paths that haven't resumed from backend yet.
                    await api.interact(sourceId, { [secretKey]: data });
                    const fallbackSources = await api.getSources();
                    setSources(fallbackSources);
                } catch (err) {
                    console.error(`Failed to post scraped data for ${sourceId}:`, err);
                }
            });

            unlistenAuthRequired = await listen<{
                sourceId: string;
                taskId?: string;
                targetUrl: string;
            }>("scraper_auth_required", (event) => {
                console.log(
                    `Manual auth required for source ${event.payload.sourceId}`,
                );
                const { sourceId, taskId, targetUrl } = event.payload;
                if (taskId) {
                    activeTaskIdRef.current = taskId;
                }
                useStore.getState().setActiveScraper(sourceId);

                const currentSources = useStore.getState().sources;
                useStore.getState().setSources(
                    currentSources.map((source) => {
                        if (source.id !== sourceId) {
                            return source;
                        }
                        return {
                            ...source,
                            status: "suspended",
                            message:
                                "Web scraper blocked by login wall/captcha. Resume in foreground mode.",
                            interaction: {
                                type: "webview_scrape",
                                step_id: source.interaction?.step_id || "webview",
                                message:
                                    "Web scraper blocked. Resume in foreground mode.",
                                fields: source.interaction?.fields || [],
                                warning_message: source.interaction?.warning_message,
                                data: {
                                    ...(source.interaction?.data || {}),
                                    force_foreground: true,
                                    manual_only: true,
                                    blocked_target_url: targetUrl,
                                },
                            },
                        };
                    }),
                );
            });
        };

        setupListeners();

        return () => {
            if (unlistenScraperResult) {
                unlistenScraperResult();
            }
            if (unlistenAuthRequired) {
                unlistenAuthRequired();
            }
            if (unlistenLifecycleLog) {
                unlistenLifecycleLog();
            }
        };
    }, [scraperEnabled, setSources, syncErrorLogsFromMemory]);

    return {
        activeScraper,
        webviewQueue,
        scraperLogs,
        handleSkipScraper,
        handleClearScraperQueue,
        handlePushToQueue,
        handleShowScraperWindow,
    };
}
