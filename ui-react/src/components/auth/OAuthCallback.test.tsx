import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        oauthCallbackInteract: vi.fn(),
    },
}));

vi.mock("../../api/client", () => ({
    api: apiMock,
}));

const callbackMessages: Record<string, string> = {
    "oauth_callback.status.authenticating": "Authenticating...",
    "oauth_callback.status.success": "Authorization successful! You can close this window.",
    "oauth_callback.error.authorization_failed": "Authorization failed: {reason}",
    "oauth_callback.error.missing_payload": "Missing authorization payload.",
    "oauth_callback.error.missing_code_exchange_params":
        "Missing required OAuth callback parameters for code exchange.",
    "oauth_callback.error.missing_source_id":
        "OAuth callback did not return a validated source.",
    "oauth_callback.error.exchange_failed": "Failed to exchange token.",
    "oauth_callback.title": "OAuth Authorization",
    "oauth_callback.action.close_window": "Close Window",
};

vi.mock("../../i18n", () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, string | number>) => {
            const template = callbackMessages[key] ?? key;
            if (!params) return template;
            return template.replace(/\{(\w+)\}/g, (_, name: string) => {
                const value = params[name];
                return value === undefined || value === null ? "" : String(value);
            });
        },
    }),
}));

import { render } from "../../test/render";
import { OAuthCallback } from "./OAuthCallback";

class BroadcastChannelMock {
    static instances: BroadcastChannelMock[] = [];
    public postMessage = vi.fn();
    public close = vi.fn();
    constructor(_name: string) {
        BroadcastChannelMock.instances.push(this);
    }

    static reset() {
        BroadcastChannelMock.instances = [];
    }
}

function createLocalStorageMock() {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
    };
}

describe("OAuthCallback", () => {
    beforeEach(() => {
        apiMock.oauthCallbackInteract.mockReset();
        apiMock.oauthCallbackInteract.mockResolvedValue({
            message: "ok",
            source_id: "source-from-backend",
        });
        BroadcastChannelMock.reset();
        Object.defineProperty(window, "localStorage", {
            writable: true,
            value: createLocalStorageMock(),
        });

        Object.defineProperty(window, "BroadcastChannel", {
            writable: true,
            value: BroadcastChannelMock,
        });
        Object.defineProperty(window, "close", {
            writable: true,
            value: vi.fn(),
        });
    });

    it("exchanges code payload from query parameters", async () => {
        window.history.pushState(
            {},
            "",
            "/oauth/callback?code=code-123&state=opaque-state-token",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.oauthCallbackInteract).toHaveBeenCalledWith({
                type: "oauth_code_exchange",
                interaction_type: "oauth_code_exchange",
                state: "opaque-state-token",
                code: "code-123",
                redirect_uri: `${window.location.origin}/oauth/callback`,
            });
        });

        expect(
            await screen.findByText("Authorization successful! You can close this window."),
        ).toBeInTheDocument();
    });

    it("stores implicit token payload from hash fragment", async () => {
        window.history.pushState(
            {},
            "",
            "/oauth/callback#access_token=tok-xyz&token_type=Bearer&expires_in=3600&scope=read&state=opaque-state-token",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.oauthCallbackInteract).toHaveBeenCalledWith({
                type: "oauth_implicit_token",
                interaction_type: "oauth_implicit_token",
                oauth_payload: {
                    access_token: "tok-xyz",
                    token_type: "Bearer",
                    expires_in: "3600",
                    scope: "read",
                    state: "opaque-state-token",
                },
                access_token: "tok-xyz",
                token_type: "Bearer",
                expires_in: 3600,
                scope: "read",
                state: "opaque-state-token",
            });
        });
    });

    it("passes through non-standard authorization code fields", async () => {
        window.history.pushState(
            {},
            "",
            "/oauth/callback?auth_code=code-999&state=opaque-state-token",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.oauthCallbackInteract).toHaveBeenCalledWith({
                type: "oauth_code_exchange",
                interaction_type: "oauth_code_exchange",
                auth_code: "code-999",
                state: "opaque-state-token",
                code: undefined,
                redirect_uri: `${window.location.origin}/oauth/callback`,
            });
        });
    });

    it("rejects oauth code exchange callback with missing state", async () => {
        window.history.pushState(
            {},
            "",
            "/oauth/callback?interaction_type=oauth_code_exchange&code=code-456",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.oauthCallbackInteract).not.toHaveBeenCalled();
        });

        expect(
            await screen.findByText(
                "Missing required OAuth callback parameters for code exchange.",
            ),
        ).toBeInTheDocument();
    });

    it("does not infer source id from local storage fallback", async () => {
        apiMock.oauthCallbackInteract.mockResolvedValue({
            message: "ok",
            source_id: "",
        });
        window.localStorage.setItem("oauth_pending_source_id", "source-d");
        window.history.pushState({}, "", "/oauth/callback?code=code-456&state=opaque-state-token");
        render(<OAuthCallback />);

        expect(
            await screen.findByText("OAuth callback did not return a validated source."),
        ).toBeInTheDocument();

        expect(window.localStorage.getItem("oauth_pending_source_id")).toBe("source-d");
        expect(BroadcastChannelMock.instances).toHaveLength(0);
    });

    it("shows backend callback error details", async () => {
        apiMock.oauthCallbackInteract.mockRejectedValue(
            new Error("oauth_state_invalid"),
        );
        window.history.pushState({}, "", "/oauth/callback?code=code-456&state=bad-state");
        render(<OAuthCallback />);

        expect(await screen.findByText("oauth_state_invalid")).toBeInTheDocument();
    });
});
