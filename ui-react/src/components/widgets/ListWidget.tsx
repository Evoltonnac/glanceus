import { useState } from "react";
import type { ListWidgetConfig } from "../../types/config";
import { getFieldFromPath, cn } from "../../lib/utils";
import { WidgetRenderer } from "./WidgetRenderer";

interface Props {
    widget: ListWidgetConfig;
    data: Record<string, any>;
}

export function ListWidget({ widget, data }: Props) {
    const [currentPage, setCurrentPage] = useState(1);

    const rawData = getFieldFromPath(data, widget.data_source);

    if (!rawData || !Array.isArray(rawData)) {
        return null;
    }

    const alias = widget.item_alias || "item";

    let processedArray = [...rawData];

    // Filter
    if (widget.filter) {
        try {
            processedArray = processedArray.filter((item, index) => {
                const ctx = {
                    ...data,
                    [alias]: item,
                    [`${alias}_index`]: index,
                };

                const match = widget.filter?.match(
                    /^([a-zA-Z0-9_.[\]]+)\s*([><!=]+)\s*(.+)$/,
                );
                if (match) {
                    const [, path, operator, valueStr] = match;
                    const fieldVal = getFieldFromPath(ctx, path);
                    const cmpVal = isNaN(Number(valueStr))
                        ? valueStr.replace(/['"]/g, "")
                        : Number(valueStr);

                    switch (operator) {
                        case ">": return fieldVal > cmpVal;
                        case "<": return fieldVal < cmpVal;
                        case ">=": return fieldVal >= cmpVal;
                        case "<=": return fieldVal <= cmpVal;
                        case "==": return fieldVal == cmpVal;
                        case "!=": return fieldVal != cmpVal;
                        case "===": return fieldVal === cmpVal;
                        case "!==": return fieldVal !== cmpVal;
                        default: return true;
                    }
                }
                return true;
            });
        } catch (e) {
            console.warn("Failed to apply filter", e);
        }
    }

    // Sort
    if (widget.sort_by) {
        const orderMult = widget.sort_order === "desc" ? -1 : 1;
        processedArray.sort((a, b) => {
            const ctxA = { ...data, [alias]: a };
            const ctxB = { ...data, [alias]: b };

            const valA = getFieldFromPath(ctxA, widget.sort_by!);
            const valB = getFieldFromPath(ctxB, widget.sort_by!);

            if (valA < valB) return -1 * orderMult;
            if (valA > valB) return 1 * orderMult;
            return 0;
        });
    }

    // Pagination Controls
    const isPagination = widget.pagination === true;
    const defaultPageSize = widget.page_size || 5;
    const totalPages = Math.max(
        1,
        Math.ceil(processedArray.length / defaultPageSize),
    );
    const actualPage = Math.min(currentPage, totalPages);

    // Pagination vs Limit
    if (isPagination) {
        const startIndex = (actualPage - 1) * defaultPageSize;
        processedArray = processedArray.slice(
            startIndex,
            startIndex + defaultPageSize,
        );
    } else if (widget.limit && widget.limit > 0) {
        processedArray = processedArray.slice(0, widget.limit);
    }

    const getLayoutClasses = () => {
        switch (widget.layout) {
            case "row":
                return "flex flex-row flex-wrap gap-2";
            case "grid":
                return widget.columns
                    ? "grid gap-2"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2";
            case "col":
            default:
                return "flex flex-col gap-2";
        }
    };

    const listStyle: React.CSSProperties =
        widget.layout === "grid" && widget.columns
            ? {
                  gridTemplateColumns: `repeat(${widget.columns}, minmax(0, 1fr))`,
              }
            : {};

    const renderPaginationControls = () => {
        if (!isPagination || totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={actualPage === 1}
                    className="px-2 py-1 text-xs font-medium border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                    Prev
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {actualPage} / {totalPages}
                </span>
                <button
                    onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={actualPage === totalPages}
                    className="px-2 py-1 text-xs font-medium border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
            <div
                className={cn(
                    getLayoutClasses(),
                    "w-full flex-1 overflow-y-auto min-h-0 pr-1",
                    "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
                )}
                style={listStyle}
            >
                {processedArray.map((item, index) => {
                    const scopedData = {
                        ...data,
                        [alias]: item,
                        [`${alias}_index`]: index,
                    };

                    const renders = Array.isArray(widget.render)
                        ? widget.render
                        : [widget.render];

                    const isGridItem = !!widget.layout_config?.grid_template_areas;
                    const gridAreas = widget.layout_config?.grid_template_areas
                        ?.map((a) => `"${a}"`)
                        .join(" ");
                    const gridColumns = widget.layout_config?.grid_template_columns;

                    const wrapperStyle: React.CSSProperties = isGridItem
                        ? {
                              display: "grid",
                              gridTemplateAreas: gridAreas,
                              gridTemplateColumns: gridColumns,
                              gap: "0.25rem",
                          }
                        : {};

                    return (
                        <div
                            key={index}
                            className={cn(
                                "w-full h-full border border-border/50 rounded-md p-1.5 bg-surface hover:bg-muted/30 transition-colors min-w-0 truncate",
                                !isGridItem && "flex flex-col gap-1"
                            )}
                            style={wrapperStyle}
                        >
                            {renders.map((childWidget, i) => (
                                <div
                                    key={i}
                                    style={
                                        childWidget.area
                                            ? { gridArea: childWidget.area }
                                            : undefined
                                    }
                                    className="w-full h-full flex flex-col min-h-0 min-w-0 truncate"
                                >
                                    <WidgetRenderer
                                        widget={childWidget}
                                        data={scopedData}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
            {renderPaginationControls()}
        </div>
    );
}
