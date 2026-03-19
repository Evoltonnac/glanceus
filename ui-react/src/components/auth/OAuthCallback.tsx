import { useEffect, useState, useRef } from "react";
import { api } from "../../api/client";
import { useI18n } from "../../i18n";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function OAuthCallback() {
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState(() =>
    t("oauth_callback.status.authenticating"),
  );

  // Prevent StrictMode double invocation
  const callbackRef = useRef(false);

  useEffect(() => {
    if (callbackRef.current) return;
    callbackRef.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryPayload = Object.fromEntries(params.entries());
      const hashPayload = Object.fromEntries(hash.entries());
      const code = params.get("code");
      const error = params.get("error");
      const queryState = params.get("state");
      const interactionType = params.get("interaction_type")?.trim().toLowerCase();
      const accessToken = hash.get("access_token");
      const tokenType = hash.get("token_type");
      const expiresIn = hash.get("expires_in");
      const scope = hash.get("scope");
      const hashState = hash.get("state");
      const hasQueryPayload = Object.keys(queryPayload).length > 0;
      const hasHashPayload = Object.keys(hashPayload).length > 0;
      const isCodeExchange =
        interactionType === "oauth_code_exchange" ||
        (!!code || (hasQueryPayload && !hasHashPayload));
      const hasCodeExchangeCredential =
        (!!code && code.trim().length > 0) ||
        Object.entries(queryPayload).some(([key, value]) => {
          if (key === "state" || key === "interaction_type") {
            return false;
          }
          return typeof value === "string" && value.trim().length > 0;
        });

      if (error) {
        setStatus("error");
        setMessage(
          t("oauth_callback.error.authorization_failed", { reason: error }),
        );
        return;
      }

      if (!hasQueryPayload && !hasHashPayload) {
        setStatus("error");
        setMessage(t("oauth_callback.error.missing_payload"));
        return;
      }

      if (
        isCodeExchange &&
        (!queryState || !queryState.trim() || !hasCodeExchangeCredential)
      ) {
        setStatus("error");
        setMessage(t("oauth_callback.error.missing_code_exchange_params"));
        return;
      }

      try {
        // Determine redirect_uri (current URL without query)
        const redirectUri = window.location.origin + window.location.pathname;
        const payload = isCodeExchange
            ? {
                type: "oauth_code_exchange",
                interaction_type: "oauth_code_exchange",
                ...queryPayload,
                code: code ?? undefined,
                redirect_uri: redirectUri,
              }
            : {
                type: "oauth_implicit_token",
                interaction_type: "oauth_implicit_token",
                oauth_payload: hashPayload,
                access_token: accessToken ?? undefined,
                token_type: tokenType ?? "Bearer",
                expires_in: expiresIn ? Number(expiresIn) : undefined,
                scope: scope ?? undefined,
                state: hashState ?? undefined,
              };

        const result = await api.oauthCallbackInteract(payload);
        const sourceId = result.source_id;
        if (!sourceId) {
          throw new Error(t("oauth_callback.error.missing_source_id"));
        }

        setStatus("success");
        setMessage(t("oauth_callback.status.success"));

        // Notify parent window via BroadcastChannel
        const channel = new BroadcastChannel("oauth_channel");
        channel.postMessage({ type: "success", sourceId });
        channel.close();

        // Auto close after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || t("oauth_callback.error.exchange_failed"));
      }
    };

    handleCallback();

    // No cleanup - prevent StrictMode double invocation by never resetting the flag
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            {status === "error" && <XCircle className="h-6 w-6 text-red-500" />}
            {t("oauth_callback.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{message}</p>
          {status !== "loading" && (
            <Button
              className="w-full"
              onClick={() => window.close()}
              variant={status === "error" ? "destructive" : "default"}
            >
              {t("oauth_callback.action.close_window")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
