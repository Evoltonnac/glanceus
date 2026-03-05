import { Card } from "./ui/card";
import type {
    ViewComponent,
    SourceSummary,
    DataResponse,
} from "../types/config";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

interface BaseSourceCardProps {
    component: ViewComponent;
    sourceSummary?: SourceSummary;
    sourceData?: DataResponse | null;
    onInteract?: (source: SourceSummary) => void;
}

// Semantic status color indicator for server-rack style pill
const statusPillColorMap: Record<string, string> = {
    active: "bg-success shadow-[0_0_8px_var(--color-success)]",
    refreshing: "bg-brand animate-pulse shadow-[0_0_8px_var(--color-brand)]",
    suspended: "bg-warning shadow-[0_0_8px_var(--color-warning)]",
    error: "bg-error shadow-[0_0_8px_var(--color-error)]",
    disabled: "bg-muted-foreground opacity-50",
};

export function BaseSourceCard({
    component,
    sourceSummary,
    sourceData,
}: BaseSourceCardProps) {
    const ui = component.ui || {
        title: component.label || "Untitled",
        icon: undefined,
        status_field: undefined,
    };

    // Determine status for indicator
    const rawStatus = sourceSummary?.status || "disabled";
    let dotStatus: "active" | "refreshing" | "error" | "suspended" | "disabled";
    if ((rawStatus as string) === "refreshing") {
        dotStatus = "refreshing";
    } else if (sourceData?.error || sourceSummary?.error) {
        dotStatus = "error";
    } else if (rawStatus === "suspended") {
        dotStatus = "suspended";
    } else if (sourceSummary?.has_data && rawStatus === "active") {
        dotStatus = "active";
    } else {
        dotStatus = rawStatus as any;
    }

    const pillClass =
        statusPillColorMap[dotStatus] || statusPillColorMap.disabled;

    // Decide if we have data to show
    const hasWidgetData =
        sourceData?.data && component.widgets && component.widgets.length > 0;
    const hasNoData = !hasWidgetData;

    return (
        <Card className="bg-surface border-border h-full flex flex-col relative overflow-hidden hover:border-foreground/20 hover:shadow-soft-elevation transition-all duration-150">
            {/* Header — acts as drag handle */}
            <div
                className="qb-card-header relative z-10 flex-shrink-0 flex items-center justify-between px-4 border-b border-border/40 bg-transparent"
                style={{ height: "var(--qb-card-header-height)" }}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {ui.icon && (
                        <span className="text-sm leading-none shrink-0 text-muted-foreground">
                            {ui.icon}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">
                        {ui.title}
                    </span>
                </div>
                {/* Absolute positioned server rack style indicator light in top-left */}
                <div
                    className={`absolute left-2 top-1/2 -translate-y-1/2 w-[4px] h-3 rounded-full flex-shrink-0 transition-all duration-500 z-20 ${pillClass}`}
                    title={`Status: ${dotStatus}`}
                />
            </div>

            {/* Content area — fills remaining card height */}
            <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0 px-4 py-3 bg-surface/50">
                {hasWidgetData && (
                    <div className="flex flex-col gap-2 h-full min-h-0">
                        {component.widgets!.map((widget, idx) => (
                            <WidgetRenderer
                                key={idx}
                                widget={widget}
                                data={sourceData!.data!}
                            />
                        ))}
                    </div>
                )}

                {hasNoData && (
                    <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
                        暂无数据
                    </div>
                )}
            </div>
        </Card>
    );
}
