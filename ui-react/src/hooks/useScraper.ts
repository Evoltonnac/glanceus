import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "../store";
import { api } from "../api/client";
import type { SourceSummary } from "../types/config";
import { isTauri } from "../lib/utils";

const DEFAULT_SCRAPER_TIMEOUT_SECONDS = 10;
const MIN_SCRAPER_TIMEOUT_SECONDS = 1;
const MAX_SCRAPER_TIMEOUT_SECONDS = 300;
const SCRAPER_LOG_LIMIT = 300;

function normalizeScraperTimeoutSeconds(value: number | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return DEFAULT_SCRAPER_TIMEOUT_SECONDS;
    }
    return Math.min(
        MAX_SCRAPER_TIMEOUT_SECONDS,
        Math.max(MIN_SCRAPER_TIMEOUT_SECONDS, Math.floor(value)),
    );
}

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
    if (deduped.length > SCRAPER_LOG_LIMIT) {
        return deduped.slice(-SCRAPER_LOG_LIMIT);
    }
    return deduped;
}

export function useScraper() {
    const scraperEnabled = isTauri();
    const sources = useStore((state) => state.sources);
    const setSources = useStore((state) => state.setSources);
    const setDataMap = useStore((state) => state.setDataMap);
    const activeScraper = useStore((state) => state.activeScraper);
    const setActiveScraper = useStore((state) => state.setActiveScraper);
    const skippedScrapers = useStore((state) => state.skippedScrapers);
    const addSkippedScraper = useStore((state) => state.addSkippedScraper);
    const setSkippedScrapers = useStore((state) => state.setSkippedScrapers);
    const [queueNonce, setQueueNonce] = useState(0);
    const [scraperLogs, setScraperLogs] = useState<ScraperLifecycleLog[]>([]);

    const activeScraperRef = useRef<string | null>(null);
    const activeTaskIdRef = useRef<string | null>(null);
    const manualQueuedRef = useRef<Set<string>>(new Set());
    const foregroundOverridesRef = useRef<Set<string>>(new Set());
    const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [scraperTimeoutMs, setScraperTimeoutMs] = useState(
        DEFAULT_SCRAPER_TIMEOUT_SECONDS * 1000,
    );

    const syncErrorLogsFromMemory = useCallback(async (sourceId?: string | null) => {
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
            console.error("Failed to sync scraper error logs from Rust memory:", error);
        }
    }, [scraperEnabled]);

    useEffect(() => {
        activeScraperRef.current = activeScraper;
    }, [activeScraper]);

    const bumpQueueNonce = useCallback(() => {
        setQueueNonce((prev) => prev + 1);
    }, []);

    useEffect(() => {
        if (!scraperEnabled) {
            setScraperTimeoutMs(DEFAULT_SCRAPER_TIMEOUT_SECONDS * 1000);
            return;
        }

        let cancelled = false;
        void api
            .getSettings()
            .then((settings) => {
                if (cancelled) {
                    return;
                }
                const timeoutSeconds = normalizeScraperTimeoutSeconds(
                    settings.scraper_timeout_seconds,
                );
                setScraperTimeoutMs(timeoutSeconds * 1000);
            })
            .catch((error) => {
                console.warn(
                    "Failed to load scraper timeout settings, fallback to default:",
                    error,
                );
                if (!cancelled) {
                    setScraperTimeoutMs(DEFAULT_SCRAPER_TIMEOUT_SECONDS * 1000);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [scraperEnabled]);

    // Compute the current queue of webview scrapers
    const webviewQueue = sources.filter(
        (source) => {
            if (!scraperEnabled) {
                return false;
            }
            const isWebviewInteraction =
                source.status === "suspended" &&
                source.interaction?.type === "webview_scrape";
            if (!isWebviewInteraction || skippedScrapers.has(source.id)) {
                return false;
            }

            const manualOnly = Boolean(source.interaction?.data?.manual_only);
            if (!manualOnly) {
                return true;
            }
            return manualQueuedRef.current.has(source.id);
        },
    );

    const startScraperTask = useCallback((
        source: SourceSummary,
        forceForeground: boolean,
    ) => {
        if (!scraperEnabled) {
            return;
        }
        const { url, script, intercept_api, secret_key } =
            source.interaction?.data || {};

        console.log(
            `Starting scraper for ${source.name} (${source.id}), foreground=${forceForeground}`,
        );
        setActiveScraper(source.id);
        activeTaskIdRef.current = null;
        manualQueuedRef.current.delete(source.id);

        invoke("push_scraper_task", {
            sourceId: source.id,
            url: url,
            injectScript: script,
            interceptApi: intercept_api,
            secretKey: secret_key,
            foreground: forceForeground,
        }).catch((err) => {
            console.error("Failed to push scraper task to Tauri:", err);
            void syncErrorLogsFromMemory(source.id);
            manualQueuedRef.current.delete(source.id);
            foregroundOverridesRef.current.delete(source.id);
            activeTaskIdRef.current = null;
            addSkippedScraper(source.id);
            setActiveScraper(null);
            bumpQueueNonce();
        });
    }, [addSkippedScraper, bumpQueueNonce, scraperEnabled, setActiveScraper, syncErrorLogsFromMemory]);

    const queueManualTaskIfNeeded = useCallback((sourceId: string) => {
        const source = useStore.getState().sources.find((s) => s.id === sourceId);
        if (source?.interaction?.data?.manual_only) {
            manualQueuedRef.current.add(sourceId);
        }
    }, []);

    const promoteToForeground = useCallback((source: SourceSummary) => {
        void (async () => {
            const currentActive = useStore.getState().activeScraper;
            if (currentActive && currentActive !== source.id) {
                try {
                    await invoke("cancel_scraper_task");
                } catch (error) {
                    console.error("Failed to cancel active scraper task:", error);
                }
                activeTaskIdRef.current = null;
                queueManualTaskIfNeeded(currentActive);
                foregroundOverridesRef.current.delete(currentActive);
            }

            foregroundOverridesRef.current.add(source.id);
            startScraperTask(source, true);
            bumpQueueNonce();
        })();
    }, [startScraperTask, queueManualTaskIfNeeded, bumpQueueNonce]);

    // Actions
    const handleSkipScraper = useCallback(async () => {
        if (!scraperEnabled) return;
        if (!activeScraper) return;

        try {
            await invoke("cancel_scraper_task");
            await syncErrorLogsFromMemory(activeScraper);
        } catch (error) {
            console.error("Failed to cancel scraper task:", error);
        }

        manualQueuedRef.current.delete(activeScraper);
        foregroundOverridesRef.current.delete(activeScraper);
        activeTaskIdRef.current = null;
        addSkippedScraper(activeScraper);
        setActiveScraper(null);
        bumpQueueNonce();
    }, [activeScraper, addSkippedScraper, scraperEnabled, setActiveScraper, bumpQueueNonce, syncErrorLogsFromMemory]);

    const handleClearScraperQueue = useCallback(async () => {
        if (!scraperEnabled) return;
        if (activeScraper) {
            try {
                await invoke("cancel_scraper_task");
            } catch (error) {
                console.error("Failed to cancel active scraper task:", error);
            }
        }

        const newSkipped = new Set(skippedScrapers);
        if (activeScraper) newSkipped.add(activeScraper);
        webviewQueue.forEach((s) => newSkipped.add(s.id));
        setSkippedScrapers(newSkipped);
        setActiveScraper(null);
        activeTaskIdRef.current = null;
        manualQueuedRef.current.clear();
        foregroundOverridesRef.current.clear();
        // Keep recent error logs for troubleshooting; drop noisy non-error logs.
        setScraperLogs((prev) =>
            prev.filter((log) => log.level === "error").slice(-SCRAPER_LOG_LIMIT)
        );
        bumpQueueNonce();
    }, [activeScraper, skippedScrapers, webviewQueue, scraperEnabled, setSkippedScrapers, setActiveScraper, bumpQueueNonce]);

    const handlePushToQueue = useCallback((
        source: SourceSummary,
        options?: { foreground?: boolean },
    ): boolean => {
        if (!scraperEnabled) {
            alert("Web 抓取仅在 Tauri 客户端环境生效。");
            return false;
        }
        const forceForeground =
            Boolean(options?.foreground) ||
            Boolean(source.interaction?.data?.force_foreground);

        if (forceForeground) {
            foregroundOverridesRef.current.add(source.id);
        }
        if (source.interaction?.data?.manual_only) {
            manualQueuedRef.current.add(source.id);
        }

        const next = new Set(skippedScrapers);
        next.delete(source.id);
        setSkippedScrapers(next);

        if (activeScraper === source.id) {
            if (forceForeground) {
                void (async () => {
                    try {
                        await invoke("show_scraper_window");
                    } catch (error) {
                        console.error("Failed to show scraper window:", error);
                    }
                    // User takes over in foreground: remove from queue and continue next task.
                    manualQueuedRef.current.delete(source.id);
                    foregroundOverridesRef.current.delete(source.id);
                    activeTaskIdRef.current = null;
                    addSkippedScraper(source.id);
                    setActiveScraper(null);
                    bumpQueueNonce();
                })();
                return true;
            }
            alert(`"${source.name}" 的抓取任务已在运行中。`);
            return false;
        }
        const alreadyInQueue = webviewQueue.some((s) => s.id === source.id);
        if (forceForeground) {
            if (alreadyInQueue) {
                promoteToForeground(source);
                return true;
            }
            console.log(`手动将 ${source.name} (${source.id}) 加入抓取队列并切换到前台`);
            promoteToForeground(source);
            return true;
        }

        if (alreadyInQueue) {
            alert(`"${source.name}" 已在抓取队列中，请勿重复添加。`);
            return false;
        }

        console.log(`手动将 ${source.name} (${source.id}) 加入抓取队列`);
        bumpQueueNonce();
        return true;
    }, [activeScraper, webviewQueue, skippedScrapers, scraperEnabled, setSkippedScrapers, bumpQueueNonce, promoteToForeground, addSkippedScraper, setActiveScraper]);

    const handleShowScraperWindow = useCallback(async () => {
        if (!scraperEnabled) return;
        const currentActive = useStore.getState().activeScraper;
        if (!currentActive) {
            return;
        }

        try {
            await invoke("show_scraper_window");
        } catch (error) {
            console.error("Failed to show scraper window:", error);
            return;
        }
        // User takes over in foreground: remove from queue and continue next task.
        manualQueuedRef.current.delete(currentActive);
        foregroundOverridesRef.current.delete(currentActive);
        activeTaskIdRef.current = null;
        addSkippedScraper(currentActive);
        setActiveScraper(null);
        bumpQueueNonce();
    }, [addSkippedScraper, scraperEnabled, setActiveScraper, bumpQueueNonce]);

    // 1. Dynamic Polling for refreshing sources
    useEffect(() => {
        const refreshingSources = sources.filter(
            (s) => s.status === "refreshing",
        );
        if (refreshingSources.length === 0) return;

        const interval = setInterval(async () => {
            try {
                const updatedSources = await api.getSources();
                const finishedIds = refreshingSources
                    .filter((oldS) => {
                        const newS = updatedSources.find(
                            (s) => s.id === oldS.id,
                        );
                        return newS && newS.status !== "refreshing";
                    })
                    .map((s) => s.id);

                if (finishedIds.length > 0) {
                    setSources(updatedSources);
                    const dataPromises = finishedIds.map(async (id) => {
                        const data = await api.getSourceData(id);
                        setDataMap((prev) => ({ ...prev, [id]: data }));
                    });
                    await Promise.all(dataPromises);
                } else {
                    setSources(updatedSources);
                }
            } catch (error) {
                console.error("Polling failed:", error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [sources, setSources, setDataMap]);

    // 2. Cleanup zombie active scraper
    useEffect(() => {
        if (!scraperEnabled) {
            return;
        }
        if (activeScraper) {
            const activeSource = sources.find((s) => s.id === activeScraper);
            if (!activeSource || activeSource.status !== "suspended") {
                console.log("Cleaning up zombie active scraper:", activeScraper);
                activeTaskIdRef.current = null;
                setActiveScraper(null);
                invoke("cancel_scraper_task").catch(console.error);
            }
        }
    }, [sources, activeScraper, scraperEnabled, setActiveScraper]);

    // 3. Monitor for background scraper tasks
    useEffect(() => {
        if (!scraperEnabled) return;
        if (activeScraper) return;

        const nextSource = webviewQueue.length > 0 ? webviewQueue[0] : null;

        if (nextSource) {
            const forceForeground =
                foregroundOverridesRef.current.has(nextSource.id) ||
                Boolean(nextSource.interaction?.data?.force_foreground);

            startScraperTask(nextSource, forceForeground);
        }
    }, [webviewQueue, activeScraper, queueNonce, scraperEnabled, startScraperTask]);

    // 4. Enforce per-task timeout and skip expired task to continue queue.
    useEffect(() => {
        if (!scraperEnabled || !activeScraper) {
            if (timeoutTimerRef.current) {
                clearTimeout(timeoutTimerRef.current);
                timeoutTimerRef.current = null;
            }
            return;
        }

        const timeoutSourceId = activeScraper;
        timeoutTimerRef.current = setTimeout(() => {
            const currentActive = useStore.getState().activeScraper;
            if (!currentActive || currentActive !== timeoutSourceId) {
                return;
            }

            console.warn(
                `[Scraper] ${currentActive} timed out after ${Math.floor(scraperTimeoutMs / 1000)}s, skipping task.`,
            );

            void (async () => {
                try {
                    await invoke("cancel_scraper_task");
                    await syncErrorLogsFromMemory(currentActive);
                } catch (error) {
                    console.error(
                        "Failed to cancel timed-out scraper task:",
                        error,
                    );
                }

                manualQueuedRef.current.delete(currentActive);
                foregroundOverridesRef.current.delete(currentActive);
                activeTaskIdRef.current = null;
                useStore.getState().addSkippedScraper(currentActive);
                useStore.getState().setActiveScraper(null);
                bumpQueueNonce();
            })();
        }, scraperTimeoutMs);

        return () => {
            if (timeoutTimerRef.current) {
                clearTimeout(timeoutTimerRef.current);
                timeoutTimerRef.current = null;
            }
        };
    }, [activeScraper, bumpQueueNonce, scraperEnabled, scraperTimeoutMs, syncErrorLogsFromMemory]);

    // 5. Global listeners from Tauri
    useEffect(() => {
        if (!scraperEnabled) {
            return;
        }
        let unlistenScraperResult: (() => void) | undefined;
        let unlistenAuthRequired: (() => void) | undefined;
        let unlistenLifecycleLog: (() => void) | undefined;

        const setupListeners = async () => {
            // Listen for lifecycle logs
            unlistenLifecycleLog = await listen<ScraperLifecycleLog>(
                "scraper_lifecycle_log",
                (event) => {
                    const log = event.payload;
                    setScraperLogs((prev) => mergeScraperLogs(prev, [log]));
                    if (
                        log.stage === "task_start" &&
                        activeScraperRef.current === log.source_id
                    ) {
                        activeTaskIdRef.current = log.task_id;
                    }

                    if (
                        log.stage === "task_cancelled" ||
                        log.stage === "task_killed_log_burst"
                    ) {
                        void syncErrorLogsFromMemory(log.source_id);
                    }
                }
            );

            unlistenScraperResult = await listen<{
                sourceId: string;
                taskId?: string;
                data: any;
                error?: string;
                secretKey: string;
            }>("scraper_result", async (event) => {
                const { sourceId, taskId, data, error, secretKey } = event.payload;

                if (activeScraperRef.current !== sourceId) {
                    console.warn(
                        `[Scraper] Discarding stale result for ${sourceId} (active=${activeScraperRef.current ?? "none"})`,
                    );
                    return;
                }

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
                if (taskId && !activeTaskIdRef.current) {
                    activeTaskIdRef.current = taskId;
                }

                // Add to skipped list and clear active
                useStore.getState().addSkippedScraper(sourceId);
                useStore.getState().setActiveScraper(null);
                activeTaskIdRef.current = null;
                manualQueuedRef.current.delete(sourceId);
                foregroundOverridesRef.current.delete(sourceId);
                bumpQueueNonce();

                if (error) {
                    console.error(`Scraper error for ${sourceId}:`, error);
                    void syncErrorLogsFromMemory(sourceId);
                    return;
                }
                try {
                    await api.interact(sourceId, { [secretKey]: data });
                    // Optimistically mark as refreshing
                    const currentSources = useStore.getState().sources;
                    useStore.getState().setSources(
                        currentSources.map(s => s.id === sourceId ? { ...s, status: "refreshing" } : s)
                    );
                } catch (err) {
                    console.error(`Failed to post scraped data for ${sourceId}:`, err);
                }
            });

            unlistenAuthRequired = await listen<{ sourceId: string; taskId?: string; targetUrl: string }>(
                "scraper_auth_required",
                (event) => {
                    console.log(`Manual auth required for source ${event.payload.sourceId}`);
                    const sourceId = event.payload.sourceId;
                    useStore.getState().addSkippedScraper(sourceId);
                    useStore.getState().setActiveScraper(null);
                    activeTaskIdRef.current = null;
                    foregroundOverridesRef.current.add(sourceId);
                    manualQueuedRef.current.delete(sourceId);
                    bumpQueueNonce();

                    const currentSources = useStore.getState().sources;
                    useStore.getState().setSources(
                        currentSources.map((source) => {
                            if (source.id !== sourceId) {
                                return source;
                            }
                            return {
                                ...source,
                                status: "suspended",
                                message: "Web scraper blocked by login wall/captcha. Resume in foreground mode.",
                                interaction: {
                                    type: "webview_scrape",
                                    step_id: source.interaction?.step_id || "webview",
                                    message: "Web scraper blocked. Resume in foreground mode.",
                                    fields: source.interaction?.fields || [],
                                    warning_message: source.interaction?.warning_message,
                                    data: {
                                        ...(source.interaction?.data || {}),
                                        force_foreground: true,
                                        manual_only: true,
                                        blocked_target_url: event.payload.targetUrl,
                                    },
                                },
                            };
                        }),
                    );
                },
            );
        };

        setupListeners();

        return () => {
            if (unlistenScraperResult) unlistenScraperResult();
            if (unlistenAuthRequired) unlistenAuthRequired();
            if (unlistenLifecycleLog) unlistenLifecycleLog();
        };
    }, [bumpQueueNonce, scraperEnabled, syncErrorLogsFromMemory]);

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
