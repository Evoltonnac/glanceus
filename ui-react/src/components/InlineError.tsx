import { AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface InlineErrorProps extends React.HTMLAttributes<HTMLDivElement> {
    message?: string | null;
}

export function InlineError({ message, className, ...props }: InlineErrorProps) {
    if (!message) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md bg-error/10 border border-error/20 text-sm text-error",
                className
            )}
            {...props}
        >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="break-words">{message}</span>
        </div>
    );
}
