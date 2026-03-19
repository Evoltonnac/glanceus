import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { openExternalLink } from "../../lib/utils";

export interface DeviceFlowData {
    device_code?: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in: number;
    expires_at?: number;
    interval: number;
}

interface DeviceFlowModalProps {
    flowData: DeviceFlowData | null;
    loading: boolean;
    status: "idle" | "pending" | "authorized" | "expired" | "error";
    onStart: () => Promise<void>;
    onVerifyNow: () => Promise<void>;
}

export function DeviceFlowModal({
    flowData,
    loading,
    status,
    onStart,
    onVerifyNow,
}: DeviceFlowModalProps) {
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [now, setNow] = useState<number>(Date.now());
    const [copied, setCopied] = useState(false);
    const [hasOpenedVerificationUrl, setHasOpenedVerificationUrl] = useState(false);
    const copiedTimerRef = useRef<number | null>(null);
    const activeFlowKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!flowData) {
            setExpiresAt(null);
            setHasOpenedVerificationUrl(false);
            activeFlowKeyRef.current = null;
            return;
        }

        const flowKey = [
            flowData.device_code ?? "",
            flowData.user_code,
            flowData.verification_uri,
            flowData.verification_uri_complete ?? "",
        ].join("|");
        const hasSameFlow = activeFlowKeyRef.current === flowKey;
        activeFlowKeyRef.current = flowKey;
        if (!hasSameFlow) {
            setHasOpenedVerificationUrl(false);
        }

        if (typeof flowData.expires_at === "number" && Number.isFinite(flowData.expires_at)) {
            setExpiresAt(flowData.expires_at * 1000);
        } else if (!hasSameFlow) {
            setExpiresAt(Date.now() + flowData.expires_in * 1000);
        }
        setNow(Date.now());
    }, [flowData]);

    const secondsLeft = useMemo(() => {
        if (!expiresAt) {
            return 0;
        }
        return Math.max(0, Math.floor((expiresAt - now) / 1000));
    }, [expiresAt, now]);

    useEffect(() => {
        if (!expiresAt) {
            return;
        }
        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => window.clearInterval(timer);
    }, [expiresAt]);

    const verificationUrl = flowData?.verification_uri_complete || flowData?.verification_uri || "";

    const handleOpenLink = async () => {
        setHasOpenedVerificationUrl(true);
        await openExternalLink(verificationUrl);
    };

    const handleCopy = async () => {
        if (!flowData?.user_code) {
            return;
        }
        await navigator.clipboard.writeText(flowData.user_code);
        setCopied(true);
        if (copiedTimerRef.current !== null) {
            window.clearTimeout(copiedTimerRef.current);
        }
        copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
    };

    useEffect(() => {
        return () => {
            if (copiedTimerRef.current !== null) {
                window.clearTimeout(copiedTimerRef.current);
            }
        };
    }, []);

    if (!flowData) {
        return (
            <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                    This source uses OAuth Device Flow. Click start to receive verification URL and user code.
                </p>
                <Button onClick={onStart} disabled={loading} className="w-full">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting...
                        </>
                    ) : (
                        "Start Device Authorization"
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 py-4">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Verification URL</div>
                <div className="mt-1 break-all text-sm">{flowData.verification_uri}</div>
            </div>
            <div className="rounded-md border border-brand/40 bg-brand/5 p-3">
                <div className="text-xs text-muted-foreground">User Code</div>
                <div className="mt-1 text-lg font-semibold tracking-widest">{flowData.user_code}</div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleOpenLink}
                >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Link
                </Button>
                <Button variant="outline" onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied" : "Copy Code"}
                </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expires in {secondsLeft}s</span>
            </div>
            <div className="rounded-md border border-brand/30 bg-brand/5 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status: {status}</span>
                    <Button variant="ghost" size="sm" onClick={onStart} disabled={loading}>
                        Restart
                    </Button>
                </div>
                <Button
                    variant={hasOpenedVerificationUrl ? "brand" : "outline"}
                    className={
                        hasOpenedVerificationUrl
                            ? "h-11 w-full font-semibold"
                            : "h-11 w-full border-border/80 bg-muted text-muted-foreground hover:bg-muted/80 font-semibold"
                    }
                    onClick={onVerifyNow}
                    disabled={loading}
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                </Button>
            </div>
            {status === "authorized" && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-sm text-emerald-700">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    Authorization completed.
                </div>
            )}
        </div>
    );
}
