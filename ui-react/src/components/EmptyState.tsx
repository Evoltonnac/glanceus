import { type ReactNode } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-8 text-center min-h-[300px]",
                className
            )}
            {...props}
        >
            {icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction} className="bg-brand-gradient text-white">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
