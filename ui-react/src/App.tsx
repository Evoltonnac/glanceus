import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { api } from "./api/client";
import { TauriMenuBridge } from "./components/TauriMenuBridge";
import { TopNav } from "./components/TopNav";
import { Button } from "./components/ui/button";
import { Toast } from "./components/ui/toast";
import logoMark from "./assets/logo.svg";

const OAuthCallback = lazy(() =>
    import("./components/auth/OAuthCallback").then((module) => ({
        default: module.OAuthCallback,
    })),
);
const IntegrationsPage = lazy(() => import("./pages/Integrations"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const DashboardPage = lazy(() => import("./pages/Dashboard"));

function StartupGate({
    error,
    onRetry,
    progress,
}: {
    error: string | null;
    onRetry: () => void;
    progress: number;
}) {
    return (
        <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--brand)/0.18),_transparent_55%),linear-gradient(160deg,hsl(var(--background))_0%,hsl(var(--surface))_100%)] px-4">
            <div className="absolute -top-16 right-[-72px] h-60 w-60 rounded-full bg-brand/10 blur-3xl" />
            <div className="absolute -bottom-24 left-[-72px] h-64 w-64 rounded-full bg-accent/12 blur-3xl" />

            <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-background/85 p-7 shadow-soft-elevation backdrop-blur">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient p-[1px]">
                        <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-background/95">
                            <img
                                src={logoMark}
                                alt="Glanceus"
                                className="h-6 w-6 object-contain"
                            />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            Glanceus
                        </p>
                        <p className="text-xs text-muted-foreground">
                            正在启动本地引擎
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                            启动后端失败：{error}
                        </div>
                        <Button onClick={onRetry} className="w-full">
                            重试启动
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin text-brand" />
                            等待服务就绪，首次启动可能需要几秒
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
                                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                            />
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                            {Math.round(progress)}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function App() {
    const [appReady, setAppReady] = useState(false);
    const [bootError, setBootError] = useState<string | null>(null);
    const [retryTick, setRetryTick] = useState(0);
    const [progress, setProgress] = useState(6);

    useEffect(() => {
        let cancelled = false;
        let finishTimer: number | null = null;
        setAppReady(false);
        setBootError(null);
        setProgress(6);

        api.waitForBackendReady(20_000)
            .then(() => {
                if (!cancelled) {
                    setProgress(100);
                    finishTimer = window.setTimeout(() => {
                        if (!cancelled) {
                            setAppReady(true);
                        }
                    }, 220);
                }
            })
            .catch((err) => {
                if (cancelled) {
                    return;
                }
                setBootError(
                    err instanceof Error
                        ? err.message
                        : "Unknown startup error",
                );
            });

        return () => {
            cancelled = true;
            if (finishTimer !== null) {
                window.clearTimeout(finishTimer);
            }
        };
    }, [retryTick]);

    useEffect(() => {
        if (appReady || bootError) {
            return;
        }

        let timer: number | null = null;
        const tick = () => {
            setProgress((prev) => {
                if (prev >= 92) {
                    return prev;
                }
                const eased = prev + (92 - prev) * 0.12;
                return Math.min(92, Math.max(prev + 0.18, eased));
            });
            timer = window.setTimeout(tick, 120);
        };

        timer = window.setTimeout(tick, 120);
        return () => {
            if (timer !== null) {
                window.clearTimeout(timer);
            }
        };
    }, [appReady, bootError, retryTick]);

    if (!appReady) {
        return (
            <StartupGate
                error={bootError}
                onRetry={() => setRetryTick((prev) => prev + 1)}
                progress={progress}
            />
        );
    }

    return (
        <BrowserRouter>
            <TauriMenuBridge />
            <Toast />
            <div className="flex h-screen flex-col bg-transparent text-foreground">
                <TopNav />
                <div className="flex-1 overflow-hidden relative">
                    <Suspense
                        fallback={
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        }
                    >
                        <Routes>
                            <Route
                                path="/oauth/callback"
                                element={<OAuthCallback />}
                            />
                            <Route
                                path="/integrations"
                                element={<IntegrationsPage />}
                            />
                            <Route
                                path="/settings"
                                element={<SettingsPage />}
                            />
                            <Route path="/" element={<DashboardPage />} />
                        </Routes>
                    </Suspense>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
