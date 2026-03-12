import { useStore } from "../../store";
import { cn } from "../../lib/utils";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export function Toast() {
    const toast = useStore((state) => state.toast);
    const hideToast = useStore((state) => state.hideToast);

    if (!toast) return null;

    const icons = {
        success: <CheckCircle className="h-4 w-4 text-green-500" />,
        error: <AlertCircle className="h-4 w-4 text-destructive" />,
        info: <Info className="h-4 w-4 text-brand" />,
    };

    const styles = {
        success: "border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400",
        error: "border-destructive/20 bg-destructive/5 text-destructive",
        info: "border-brand/20 bg-brand/5 text-brand",
    };

    return (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div
                className={cn(
                    "flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md",
                    styles[toast.type]
                )}
            >
                {icons[toast.type]}
                <span className="text-sm font-medium">{toast.message}</span>
                <button
                    onClick={hideToast}
                    className="ml-2 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                >
                    <X className="h-3.5 w-3.5 opacity-60" />
                </button>
            </div>
        </div>
    );
}
