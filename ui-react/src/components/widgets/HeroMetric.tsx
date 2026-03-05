import { useEffect, useState, useRef } from "react";
import { HeroMetricWidget } from "../../types/config";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { evaluateTemplate, cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface Props {
    widget: HeroMetricWidget;
    data: Record<string, any>;
}

export function HeroMetric({ widget, data }: Props) {
    const amountRaw = evaluateTemplate(widget.amount, data);
    const amount =
        amountRaw !== undefined &&
        amountRaw !== null &&
        !isNaN(Number(amountRaw))
            ? Number(amountRaw).toFixed(2)
            : "--";

    const prevAmountRef = useRef(amount);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        if (prevAmountRef.current !== amount && prevAmountRef.current !== "--") {
            setFlash(true);
            const timer = setTimeout(() => setFlash(false), 300);
            prevAmountRef.current = amount;
            return () => clearTimeout(timer);
        } else {
            prevAmountRef.current = amount;
        }
    }, [amount]);

    let deltaDisplay = null;
    if (widget.delta) {
        const deltaRaw = evaluateTemplate(widget.delta, data);
        if (
            deltaRaw !== undefined &&
            deltaRaw !== null &&
            !isNaN(Number(deltaRaw))
        ) {
            const deltaValue = Number(deltaRaw);
            const isPositive = deltaValue > 0;
            const isNegative = deltaValue < 0;
            deltaDisplay = (
                <div
                    className={cn(
                        "flex items-center text-xs font-medium tabular-nums",
                        isPositive
                            ? "text-success"
                            : isNegative
                              ? "text-error"
                              : "text-muted-foreground"
                    )}
                >
                    {isPositive && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
                    {isNegative && (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(deltaValue).toFixed(2)}
                </div>
            );
        }
    }

    const valueDisplay = (
        <span
            className={cn(
                "text-3xl font-bold tracking-tight tabular-nums truncate transition-colors duration-300 rounded px-1 -ml-1",
                flash ? "bg-brand/20 text-brand" : "bg-transparent text-foreground"
            )}
        >
            {amount}
        </span>
    );

    return (
        <div className="flex flex-col w-full h-full justify-center min-w-0 min-h-0 overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 w-full">
                {widget.prefix && (
                    <span className="text-xl font-semibold text-muted-foreground shrink-0">
                        {widget.prefix}
                    </span>
                )}
                {widget.currency && !widget.prefix && (
                    <span className="text-xl font-semibold text-muted-foreground shrink-0">
                        {widget.currency === "USD" ? "$" : widget.currency}
                    </span>
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* Wrapper for trigger to handle truncate properly */}
                        <div className="min-w-0 truncate">
                            {valueDisplay}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>{amount}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            {deltaDisplay}
        </div>
    );
}
