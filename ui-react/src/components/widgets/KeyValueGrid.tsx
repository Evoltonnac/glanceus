import { useEffect, useState, useRef } from "react";
import type { KeyValueGridWidget } from "../../types/config";
import { evaluateTemplate, cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface Props {
    widget: KeyValueGridWidget;
    data: Record<string, any>;
}

function KeyValueItem({ label, value }: { label: string; value: string }) {
    const prevValueRef = useRef(value);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        if (prevValueRef.current !== value && prevValueRef.current !== "--") {
            setFlash(true);
            const timer = setTimeout(() => setFlash(false), 300);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        } else {
            prevValueRef.current = value;
        }
    }, [value]);

    const isNumeric = !isNaN(Number(value)) && value !== "--";

    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="text-muted-foreground text-xs leading-tight truncate cursor-default">
                        {label}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <span 
                        className={cn(
                            "font-medium text-sm leading-tight truncate transition-colors duration-300 rounded px-1 -ml-1",
                            isNumeric && "tabular-nums",
                            flash ? "bg-brand/20 text-brand" : "bg-transparent text-foreground"
                        )}
                    >
                        {value}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>{value}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export function KeyValueGrid({ widget, data }: Props) {
    if (!widget.items || Object.keys(widget.items).length === 0) {
        return null; // Empty mapping
    }

    const maxCols = Math.min(3, Object.keys(widget.items).length);
    const gridClass =
        maxCols === 1
            ? "grid-cols-1"
            : maxCols === 2
              ? "grid-cols-2"
              : "grid-cols-3";

    return (
        <div
            className={`grid ${gridClass} gap-y-3 gap-x-4 w-full h-full min-h-0 overflow-auto content-center`}
        >
            {Object.entries(widget.items).map(([label, template], idx) => {
                const valRaw = evaluateTemplate(template, data);
                const value =
                    valRaw !== undefined && valRaw !== null && valRaw !== ""
                        ? String(valRaw)
                        : "--";
                return (
                    <KeyValueItem key={idx} label={label} value={value} />
                );
            })}
        </div>
    );
}
