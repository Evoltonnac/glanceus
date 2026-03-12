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
    const showToast = useStore((state) => state.showToast);
    const [queueNonce, setQueueNonce] = useState(0);
    const [scraperLogs, setScraperLogs] = useState<ScraperLifecycleLog[]>([]);

    const activeScraperRef = useRef<string | null>(null);
    const activeTaskIdRef = useRef<string | null>(null);
    const manualQueuedRef = useRef<Set<string>>(new Set());
    const foregroundOverridesRef = useRef<Set<string>>(new Set());
    const detachedForegroundTasksRef = useRef<Set<string>>(new Set());
    const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track when scraper was intentionally started by user action
    // This prevents the cleanup effect from incorrectly canceling scrapers that were just started
    const intentionallyStartedRef = useRef<Set<string>>(new Set());
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

    // Dynamic Polling for refreshing sources
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

        detachedForegroundTasksRef.current.delete(source.id);
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
            intentionallyStartedRef.current.delete(source.id);
            detachedForegroundTasksRef.current.delete(source.id);
            activeTaskIdRef.current = null;
            addSkippedScraper(source.id);
            setActiveScraper(null);
            bumpQueueNonce();
        });
    }, [addSkippedScraper, bumpQueueNonce, scraperEnabled, setActiveScraper, syncErrorLogsFromMemory]);

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
        intentionallyStartedRef.current.delete(activeScraper);
        detachedForegroundTasksRef.current.delete(activeScraper);
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
        intentionallyStartedRef.current.clear();
        detachedForegroundTasksRef.current.clear();
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
            showToast("Web 抓取仅在 Tauri 客户端环境生效。", "error");
            return false;
        }
        const forceForeground =
            Boolean(options?.foreground) ||
            Boolean(source.interaction?.data?.force_foreground);
        const currentActive = useStore.getState().activeScraper;
        const alreadyInQueue = webviewQueue.some((s) => s.id === source.id);

        const detachForegroundFromQueue = (sourceId: string) => {
            manualQueuedRef.current.delete(sourceId);
            foregroundOverridesRef.current.delete(sourceId);
            intentionallyStartedRef.current.delete(sourceId);
            activeTaskIdRef.current = null;
            detachedForegroundTasksRef.current.add(sourceId);
            addSkippedScraper(sourceId);
            setActiveScraper(null);
            bumpQueueNonce();
        };

        if (forceForeground) {
            if (currentActive === source.id) {
                void (async () => {
                    try {
                        await invoke("show_scraper_window");
                    } catch (error) {
                        console.error("Failed to show scraper window:", error);
                    }
                    detachForegroundFromQueue(source.id);
                })();
                return true;
            }
            if (currentActive && currentActive !== source.id) {
                const activeSourceName =
                    sources.find((s) => s.id === currentActive)?.name || currentActive;
                showToast(
                    `后台任务 "${activeSourceName}" 正在运行，当前前台任务不会加入队列，请稍后再试。`,
                    "info",
                );
                return false;
            }

            const next = new Set(skippedScrapers);
            next.delete(source.id);
            setSkippedScrapers(next);
            manualQueuedRef.current.delete(source.id);
            foregroundOverridesRef.current.delete(source.id);
            intentionallyStartedRef.current.add(source.id);
            startScraperTask(source, true);
            // Foreground mode is detached from background queue.
            detachForegroundFromQueue(source.id);
            return true;
        }

        if (source.interaction?.data?.manual_only) {
            manualQueuedRef.current.add(source.id);
        }

        const next = new Set(skippedScrapers);
        next.delete(source.id);
        setSkippedScrapers(next);

        if (currentActive === source.id) {
            showToast(`"${source.name}" 的抓取任务已在运行中。`, "info");
            return false;
        }

        if (alreadyInQueue) {
            showToast(`"${source.name}" 已在抓取队列中，请勿重复添加。`, "info");
            return false;
        }

        console.log(`手动将 ${source.name} (${source.id}) 加入抓取队列`);
        bumpQueueNonce();
        return true;
    }, [activeScraper, webviewQueue, skippedScrapers, scraperEnabled, setSkippedScrapers, bumpQueueNonce, showToast, sources, startScraperTask, addSkippedScraper, setActiveScraper]);

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
        // Foreground mode is detached from background queue.
        manualQueuedRef.current.delete(currentActive);
        foregroundOverridesRef.current.delete(currentActive);
        intentionallyStartedRef.current.delete(currentActive);
        activeTaskIdRef.current = null;
        detachedForegroundTasksRef.current.add(currentActive);
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
                    // Refresh completed - trigger queue check for background scrapers
                    bumpQueueNonce();
                } else {
                    setSources(updatedSources);
                }
            } catch (error) {
                console.error("Polling failed:", error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [sources, setSources, setDataMap, bumpQueueNonce]);

    // 2. Cleanup zombie active scraper
    // Only clean up if the source was deleted (no longer exists in sources list)
    // Don't cancel based on status check - status changes are async and may not
    // reflect the actual scraper state when task is just started
    useEffect(() => {
        if (!scraperEnabled) {
            return;
        }
        if (activeScraper) {
            // Skip cleanup if scraper was intentionally started by a user action.
            // This prevents false positives where the source exists but cleanup effect runs
            // before the sources array is fully updated or due to render timing
            if (intentionallyStartedRef.current.has(activeScraper)) {
                intentionallyStartedRef.current.delete(activeScraper);
                return;
            }

            const activeSource = sources.find((s) => s.id === activeScraper);
            // Only cancel if source no longer exists (was deleted)
            if (!activeSource) {
                console.log("Cleaning up zombie active scraper: source no longer exists", activeScraper);
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
        if (detachedForegroundTasksRef.current.size > 0) return;

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
                intentionallyStartedRef.current.delete(currentActive);
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
                const isDetachedForegroundTask =
                    detachedForegroundTasksRef.current.has(sourceId);
                const isActiveTask = activeScraperRef.current === sourceId;
                if (!isDetachedForegroundTask && !isActiveTask) {
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

                // Clear active scraper state (but don't add to skipped on success -
                // the source completed successfully and should be re-queued if needed)
                useStore.getState().setActiveScraper(null);
                activeTaskIdRef.current = null;
                manualQueuedRef.current.delete(sourceId);
                foregroundOverridesRef.current.delete(sourceId);
                intentionallyStartedRef.current.delete(sourceId);
                detachedForegroundTasksRef.current.delete(sourceId);
                bumpQueueNonce();

                if (error) {
                    // Only add to skipped on error, not on success
                    console.error(`Scraper error for ${sourceId}:`, error);
                    useStore.getState().addSkippedScraper(sourceId);
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
                    intentionallyStartedRef.current.delete(sourceId);
                    detachedForegroundTasksRef.current.delete(sourceId);
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
