import { useState, useEffect, useRef } from "react";
import {
    ExternalLink,
    SkipForward,
    XCircle,
    Activity,
    ChevronRight,
    FileText,
    Monitor,
} from "lucide-react";
import { cn } from "../lib/utils";
import { isTauri } from "../lib/utils";
import type { ScraperLifecycleLog } from "../hooks/useScraper";

export interface ScraperStatusBannerProps {
    activeScraperName: string | null;
    queueLength: number;
    scraperLogs: ScraperLifecycleLog[];
    onShowWindow: () => void;
    onSkip: () => void;
    onClearQueue: () => void;
}

export function ScraperStatusBanner({
    activeScraperName,
    queueLength,
    scraperLogs,
    onShowWindow,
    onSkip,
    onClearQueue,
}: ScraperStatusBannerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showLogViewer, setShowLogViewer] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);
    const inTauri = isTauri();

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (showLogViewer && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [scraperLogs, showLogViewer]);
    const hasTask = Boolean(activeScraperName) || queueLength > 0;
    const remainingCount = Math.max(
        queueLength - (activeScraperName ? 1 : 0),
        0,
    );

    const getLevelColor = (level: string) => {
        switch (level) {
            case "info":
                return "text-foreground";
            case "warn":
                return "text-warning";
            case "error":
                return "text-error";
            case "debug":
                return "text-muted-foreground";
            default:
                return "text-foreground";
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const timeStr = date.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const ms = date.getMilliseconds().toString().padStart(3, "0");
        return `${timeStr}.${ms}`;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end justify-end pointer-events-none gap-3">
            {/* Log Viewer Panel */}
            {inTauri && showLogViewer && scraperLogs.length > 0 && (
                <div className="bg-surface border border-border shadow-soft-elevation rounded-lg p-3 pointer-events-auto w-[600px] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-surface pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-brand" />
                            <span className="text-sm font-medium text-foreground">
                                Scraper Logs
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded tabular-nums">
                                {scraperLogs.length}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowLogViewer(false)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                        {scraperLogs.map((log, idx) => (
                            <div
                                key={idx}
                                className="flex gap-2 py-1 border-b border-border/50 last:border-0"
                            >
                                <span className="text-muted-foreground shrink-0 w-[90px]">
                                    {formatTimestamp(log.timestamp)}
                                </span>
                                <span
                                    className={cn(
                                        "shrink-0 w-[80px] font-semibold uppercase text-[10px]",
                                        getLevelColor(log.level)
                                    )}
                                >
                                    [{log.level}]
                                </span>
                                <span className="text-brand shrink-0 w-[120px] truncate">
                                    {log.stage}
                                </span>
                                <span className="text-muted-foreground shrink-0 w-[84px] truncate">
                                    {log.task_id.slice(-8)}
                                </span>
                                <span className="text-foreground flex-1">
                                    {log.message}
                                </span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}

            {/* Status Bar */}
            <div
                className={cn(
                    "bg-surface border border-border shadow-soft-elevation rounded-full flex items-center h-10 p-1.5 pointer-events-auto transition-all overflow-hidden",
                    // Custom easing inspired by refined UI guidelines
                    "duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isExpanded
                        ? inTauri
                            ? "max-w-[800px] pl-3"
                            : "max-w-[300px] pl-3"
                        : "max-w-[72px] cursor-pointer hover:bg-surface/80",
                )}
                onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                }}
            >
                {/* ---------- COLLAPSED CONTENT ---------- */}
                {!isExpanded && (
                    <div className="flex items-center justify-center w-full gap-2 px-2">
                        {inTauri ? (
                            <Activity
                                className={cn(
                                    "h-4 w-4",
                                    hasTask
                                        ? "text-brand animate-pulse"
                                        : "text-muted-foreground",
                                )}
                            />
                        ) : (
                            <Monitor className="h-4 w-4 text-muted-foreground/50" />
                        )}
                        {inTauri && queueLength > 0 && (
                            <span className="text-xs font-semibold tabular-nums text-foreground">
                                {queueLength}
                            </span>
                        )}
                    </div>
                )}

                {/* ---------- EXPANDED CONTENT ---------- */}
                {isExpanded && (
                    <>
                        <div className="flex items-center gap-2.5 shrink-0 animate-in fade-in duration-300 delay-100">
                            {inTauri ? (
                                <>
                                    <div
                                        className={cn(
                                            "h-3 w-1 rounded-full",
                                            hasTask
                                                ? "bg-brand shadow-[0_0_8px_hsl(var(--brand)/0.6)] animate-pulse"
                                                : "bg-muted-foreground/40",
                                        )}
                                    />

                                    <span className="text-sm font-medium whitespace-nowrap">
                                        <span className="text-muted-foreground mr-1">
                                            {hasTask
                                                ? "正在后台抓取:"
                                                : "当前任务:"}
                                        </span>
                                        <span className="text-foreground max-w-[150px] truncate inline-block align-bottom">
                                            {hasTask
                                                ? activeScraperName ||
                                                  "准备中..."
                                                : "无任务"}
                                        </span>
                                    </span>

                                    {hasTask && remainingCount > 0 && (
                                        <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded tabular-nums ml-1">
                                            剩余{remainingCount}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-2">
                                    <Monitor className="h-3.5 w-3.5" />
                                    Web 端无法进行网页抓取
                                </span>
                            )}
                        </div>

                        <div className="w-px h-4 bg-border mx-2 shrink-0 animate-in fade-in duration-300 delay-100" />

                        <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-300 delay-100 relative">
                            {inTauri ? (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowLogViewer(!showLogViewer);
                                        }}
                                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-foreground hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand relative"
                                        title="查看日志"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        日志
                                        {scraperLogs.length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-brand text-background text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                                {scraperLogs.length}
                                            </span>
                                        )}
                                    </button>
                                    {hasTask && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onShowWindow();
                                                }}
                                                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-foreground hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                                                title="显示浏览器"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                浏览器
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSkip();
                                                }}
                                                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-foreground hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                                                title="跳过当前"
                                            >
                                                <SkipForward className="h-3.5 w-3.5" />
                                                跳过
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onClearQueue();
                                                }}
                                                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium text-error hover:bg-error hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                                                title="清空队列"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                                清空
                                            </button>

                                            <div className="w-px h-4 bg-border mx-1" />
                                        </>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                            "https://github.com/xingminghua/quota-board/releases",
                                            "_blank",
                                        );
                                    }}
                                    className="flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand/10 text-brand hover:bg-brand hover:text-background transition-all"
                                >
                                    获取客户端
                                </button>
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }}
                                className="flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                                title="收起"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
