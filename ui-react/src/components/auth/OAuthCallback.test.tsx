import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        interact: vi.fn(),
    },
}));

vi.mock("../../api/client", () => ({
    api: apiMock,
}));

import { render } from "../../test/render";
import { OAuthCallback } from "./OAuthCallback";

class BroadcastChannelMock {
    public postMessage = vi.fn();
    public close = vi.fn();
    constructor(_name: string) {}
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
        apiMock.interact.mockReset();
        apiMock.interact.mockResolvedValue(undefined);
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
            "/oauth/callback?code=code-123&state=source-a",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.interact).toHaveBeenCalledWith("source-a", {
                type: "oauth_code_exchange",
                state: "source-a",
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
            "/oauth/callback#access_token=tok-xyz&token_type=Bearer&expires_in=3600&scope=read&state=source-b",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.interact).toHaveBeenCalledWith("source-b", {
                type: "oauth_implicit_token",
                oauth_payload: {
                    access_token: "tok-xyz",
                    token_type: "Bearer",
                    expires_in: "3600",
                    scope: "read",
                    state: "source-b",
                },
                access_token: "tok-xyz",
                token_type: "Bearer",
                expires_in: 3600,
                scope: "read",
                state: "source-b",
            });
        });
    });

    it("passes through non-standard authorization code fields", async () => {
        window.history.pushState(
            {},
            "",
            "/oauth/callback?auth_code=code-999&state=source-c",
        );
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.interact).toHaveBeenCalledWith("source-c", {
                type: "oauth_code_exchange",
                auth_code: "code-999",
                state: "source-c",
                code: undefined,
                redirect_uri: `${window.location.origin}/oauth/callback`,
            });
        });
    });

    it("falls back to pending source id from localStorage when state is missing", async () => {
        window.localStorage.setItem("oauth_pending_source_id", "source-d");
        window.history.pushState({}, "", "/oauth/callback?code=code-456");
        render(<OAuthCallback />);

        await waitFor(() => {
            expect(apiMock.interact).toHaveBeenCalledWith("source-d", {
                type: "oauth_code_exchange",
                code: "code-456",
                redirect_uri: `${window.location.origin}/oauth/callback`,
            });
        });

        expect(window.localStorage.getItem("oauth_pending_source_id")).toBeNull();
    });
});
