import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        interact: vi.fn(),
        getAuthorizeUrl: vi.fn(),
        getSources: vi.fn(),
        getAuthStatus: vi.fn(),
        getDeviceFlowStatus: vi.fn(),
        pollDeviceToken: vi.fn(),
    },
}));

vi.mock("../../api/client", () => ({
    api: apiMock,
}));

import { render } from "../../test/render";
import { mockInvoke } from "../../test/mocks/tauri";
import type { SourceSummary } from "../../types/config";
import { FlowHandler } from "./FlowHandler";

class BroadcastChannelMock {
    public onmessage: ((event: MessageEvent) => void) | null = null;
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

function buildSource(interaction: SourceSummary["interaction"]): SourceSummary {
    return {
        id: "source-1",
        name: "Test Source",
        description: "test source",
        enabled: true,
        auth_type: "oauth",
        has_data: false,
        status: "suspended",
        interaction,
    };
}

describe("FlowHandler", () => {
    beforeEach(() => {
        apiMock.interact.mockReset();
        apiMock.getAuthorizeUrl.mockReset();
        apiMock.getSources.mockReset();
        apiMock.getAuthStatus.mockReset();
        apiMock.getDeviceFlowStatus.mockReset();
        apiMock.pollDeviceToken.mockReset();

        apiMock.interact.mockResolvedValue(undefined);
        apiMock.getSources.mockResolvedValue([]);
        apiMock.getAuthStatus.mockResolvedValue({
            source_id: "source-1",
            auth_type: "oauth",
            status: "missing",
            message: "需要 OAuth 授权",
        });
        apiMock.getDeviceFlowStatus.mockResolvedValue({ status: "idle" });
        apiMock.getAuthorizeUrl.mockResolvedValue({
            flow: "code",
            authorize_url: "https://provider.example.com/authorize",
        });
        apiMock.pollDeviceToken.mockResolvedValue({
            status: "pending",
            retry_after: 5,
        });

        Object.defineProperty(window, "BroadcastChannel", {
            writable: true,
            value: BroadcastChannelMock,
        });
        Object.defineProperty(window, "localStorage", {
            writable: true,
            value: createLocalStorageMock(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (globalThis as any).isTauri;
    });

    it("does not throw when source interaction appears after null render", () => {
        const onClose = vi.fn();
        const onInteractSuccess = vi.fn();

        const { rerender } = render(
            <FlowHandler
                source={null}
                isOpen={false}
                onClose={onClose}
                onInteractSuccess={onInteractSuccess}
            />,
        );

        expect(() =>
            rerender(
                <FlowHandler
                    source={buildSource({
                        type: "oauth_start",
                        message: "Auth required",
                        fields: [],
                    })}
                    isOpen={false}
                    onClose={onClose}
                    onInteractSuccess={onInteractSuccess}
                />,
            ),
        ).not.toThrow();

        expect(() =>
            rerender(
                <FlowHandler
                    source={null}
                    isOpen={false}
                    onClose={onClose}
                    onInteractSuccess={onInteractSuccess}
                />,
            ),
        ).not.toThrow();
    });

    it("checks device flow status only for device flow interactions", async () => {
        render(
            <FlowHandler
                source={buildSource({
                    type: "webview_scrape",
                    message: "Need webview",
                    fields: [],
                    data: {},
                })}
                isOpen={true}
                onClose={vi.fn()}
                onInteractSuccess={vi.fn()}
            />,
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(apiMock.getDeviceFlowStatus).not.toHaveBeenCalled();

        render(
            <FlowHandler
                source={buildSource({
                    type: "oauth_start",
                    message: "OAuth required",
                    fields: [],
                    data: {
                        oauth_flow: "code",
                    },
                })}
                isOpen={true}
                onClose={vi.fn()}
                onInteractSuccess={vi.fn()}
            />,
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(apiMock.getDeviceFlowStatus).not.toHaveBeenCalled();

        render(
            <FlowHandler
                source={buildSource({
                    type: "oauth_start",
                    message: "OAuth required",
                    fields: [],
                    data: {
                        oauth_args: {
                            oauth_flow: "device",
                        },
                    },
                })}
                isOpen={true}
                onClose={vi.fn()}
                onInteractSuccess={vi.fn()}
            />,
        );
        await act(async () => {
            await Promise.resolve();
        });
        expect(apiMock.getDeviceFlowStatus).toHaveBeenCalledWith("source-1");
    });

    it("polls auth status while oauth window is open and closes when authorized", async () => {
        vi.useFakeTimers();
        apiMock.getSources.mockResolvedValue([
            buildSource({
                type: "oauth_start",
                message: "OAuth required",
                fields: [],
                data: {
                    oauth_flow: "code",
                },
            }),
        ]);
        apiMock.getAuthStatus
            .mockResolvedValueOnce({
                source_id: "source-1",
                auth_type: "oauth",
                status: "missing",
                message: "需要 OAuth 授权",
            })
            .mockResolvedValueOnce({
                source_id: "source-1",
                auth_type: "oauth",
                status: "ok",
            });

        const onClose = vi.fn();
        const onInteractSuccess = vi.fn();
        const openSpy = vi
            .spyOn(window, "open")
            .mockImplementation(() => null);

        render(
            <FlowHandler
                source={buildSource({
                    type: "oauth_start",
                    message: "OAuth required",
                    fields: [],
                    data: {
                        oauth_flow: "code",
                    },
                })}
                isOpen={true}
                onClose={onClose}
                onInteractSuccess={onInteractSuccess}
            />,
        );

        fireEvent.click(screen.getByText("Connect Test Source"));
        await act(async () => {
            await Promise.resolve();
        });

        expect(apiMock.getAuthStatus).toHaveBeenCalledTimes(1);
        expect(onInteractSuccess).toHaveBeenCalledTimes(0);

        await act(async () => {
            vi.advanceTimersByTime(2100);
            await Promise.resolve();
        });

        expect(apiMock.getAuthStatus).toHaveBeenCalledTimes(2);
        expect(onInteractSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);

        openSpy.mockRestore();
    });

    it("polls device token only after manual verify action", async () => {
        vi.useFakeTimers();
        apiMock.getAuthorizeUrl.mockResolvedValue({
            flow: "device",
            device: {
                user_code: "ABCD-EFGH",
                verification_uri: "https://provider.example.com/activate",
                expires_in: 600,
                interval: 1,
            },
        });
        apiMock.pollDeviceToken.mockResolvedValue({ status: "authorized" });

        const onClose = vi.fn();
        const onInteractSuccess = vi.fn();
        render(
            <FlowHandler
                source={buildSource({
                    type: "oauth_device_flow",
                    message: "Auth required",
                    fields: [],
                })}
                isOpen={true}
                onClose={onClose}
                onInteractSuccess={onInteractSuccess}
            />,
        );

        fireEvent.click(screen.getByText("Start Device Authorization"));
        await act(async () => {
            await Promise.resolve();
        });
        expect(apiMock.getAuthorizeUrl).toHaveBeenCalledTimes(1);
        expect(apiMock.getAuthorizeUrl).toHaveBeenCalledWith(
            "source-1",
            `${window.location.origin}/oauth/callback`,
        );
        expect(apiMock.pollDeviceToken).toHaveBeenCalledTimes(0);

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });
        fireEvent.click(screen.getByText("Verify"));

        await act(async () => {
            await Promise.resolve();
        });
        expect(apiMock.pollDeviceToken).toHaveBeenCalledTimes(1);
        expect(onInteractSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("uses Tauri web mode port for OAuth redirect URI in production runtime", async () => {
        (globalThis as any).isTauri = true;
        mockInvoke.mockImplementation((command: string) => {
            if (command === "get_runtime_port_info") {
                return Promise.resolve({
                    api_target_port: 18640,
                    web_mode_port: 18641,
                });
            }
            return Promise.resolve(undefined);
        });

        render(
            <FlowHandler
                source={buildSource({
                    type: "oauth_start",
                    message: "OAuth required",
                    fields: [],
                    data: {
                        oauth_flow: "code",
                    },
                })}
                isOpen={true}
                onClose={vi.fn()}
                onInteractSuccess={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText("Connect Test Source"));
        await act(async () => {
            await Promise.resolve();
        });

        expect(apiMock.getAuthorizeUrl).toHaveBeenCalledWith(
            "source-1",
            "http://localhost:18641/oauth/callback",
        );
        delete (globalThis as any).isTauri;
    });

    it("throttles verify action to avoid repeated polling", async () => {
        vi.useFakeTimers();
        apiMock.getAuthorizeUrl.mockResolvedValue({
            flow: "device",
            device: {
                user_code: "ABCD-EFGH",
                verification_uri: "https://provider.example.com/activate",
                expires_in: 600,
                interval: 0,
            },
        });
        apiMock.pollDeviceToken.mockResolvedValue({
            status: "pending",
            retry_after: 3,
        });

        render(
            <FlowHandler
                source={buildSource({
                    type: "oauth_device_flow",
                    message: "Auth required",
                    fields: [],
                })}
                isOpen={true}
                onClose={vi.fn()}
                onInteractSuccess={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText("Start Device Authorization"));
        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.click(screen.getByText("Verify"));
        fireEvent.click(screen.getByText(/Verify/));
        await act(async () => {
            await Promise.resolve();
        });

        expect(apiMock.pollDeviceToken).toHaveBeenCalledTimes(1);
    });
});
