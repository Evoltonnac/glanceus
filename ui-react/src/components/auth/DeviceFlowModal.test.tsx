import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "../../test/render";
import { DeviceFlowModal } from "./DeviceFlowModal";

describe("DeviceFlowModal", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        (window as any).__GLANCEUS_NATIVE_OPEN__ = vi.fn();
    });

    afterEach(() => {
        delete (window as any).__GLANCEUS_NATIVE_OPEN__;
        vi.useRealTimers();
    });

    it("renders start state and triggers start action", async () => {
        const onStart = vi.fn().mockResolvedValue(undefined);
        const onVerifyNow = vi.fn().mockResolvedValue(undefined);

        render(
            <DeviceFlowModal
                flowData={null}
                loading={false}
                status="idle"
                onStart={onStart}
                onVerifyNow={onVerifyNow}
            />,
        );

        fireEvent.click(screen.getByText("Start Device Authorization"));
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("renders flow payload and triggers poll", async () => {
        const onStart = vi.fn().mockResolvedValue(undefined);
        const onVerifyNow = vi.fn().mockResolvedValue(undefined);
        const clipboardWrite = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: { writeText: clipboardWrite },
        });

        render(
            <DeviceFlowModal
                flowData={{
                    user_code: "ABCD-EFGH",
                    verification_uri: "https://provider.example.com/activate",
                    expires_in: 600,
                    interval: 5,
                }}
                loading={false}
                status="pending"
                onStart={onStart}
                onVerifyNow={onVerifyNow}
            />,
        );

        expect(screen.getByText("ABCD-EFGH")).toBeInTheDocument();
        expect(
            screen.getByText("https://provider.example.com/activate"),
        ).toBeInTheDocument();

        const verifyButton = screen.getByRole("button", { name: "Verify" });
        expect(verifyButton).toHaveClass("bg-muted");
        expect(verifyButton).not.toHaveClass("bg-brand-gradient");

        fireEvent.click(screen.getByText("Open Link"));
        expect(verifyButton).toHaveClass("bg-brand-gradient");

        fireEvent.click(screen.getByText("Verify"));
        expect(onVerifyNow).toHaveBeenCalledTimes(1);
        expect(verifyButton).toHaveClass("h-11");

        await act(async () => {
            fireEvent.click(screen.getByText("Copy Code"));
        });
        expect(clipboardWrite).toHaveBeenCalledWith("ABCD-EFGH");
    });

    it("keeps countdown progressing when same flow payload is refreshed", async () => {
        const onStart = vi.fn().mockResolvedValue(undefined);
        const onVerifyNow = vi.fn().mockResolvedValue(undefined);
        const baseTime = new Date("2026-03-19T00:00:00.000Z");
        vi.setSystemTime(baseTime);

        const flowData = {
            device_code: "device-code-1",
            user_code: "ABCD-EFGH",
            verification_uri: "https://provider.example.com/activate",
            expires_in: 900,
            expires_at: Math.floor(baseTime.getTime() / 1000) + 900,
            interval: 5,
        };

        const { rerender } = render(
            <DeviceFlowModal
                flowData={flowData}
                loading={false}
                status="pending"
                onStart={onStart}
                onVerifyNow={onVerifyNow}
            />,
        );

        expect(screen.getByText("Expires in 900s")).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(screen.getByText("Expires in 898s")).toBeInTheDocument();

        rerender(
            <DeviceFlowModal
                flowData={{ ...flowData }}
                loading={false}
                status="pending"
                onStart={onStart}
                onVerifyNow={onVerifyNow}
            />,
        );

        expect(screen.getByText("Expires in 898s")).toBeInTheDocument();
    });

    it("resets verify button to gray when a new flow starts", () => {
        const onStart = vi.fn().mockResolvedValue(undefined);
        const onVerifyNow = vi.fn().mockResolvedValue(undefined);

        const initialFlowData = {
            device_code: "device-code-1",
            user_code: "ABCD-EFGH",
            verification_uri: "https://provider.example.com/activate",
            expires_in: 900,
            interval: 5,
        };
        const nextFlowData = {
            ...initialFlowData,
            device_code: "device-code-2",
            user_code: "IJKL-MNOP",
        };

        const { rerender } = render(
            <DeviceFlowModal
                flowData={initialFlowData}
                loading={false}
                status="pending"
                onStart={onStart}
                onVerifyNow={onVerifyNow}
            />,
        );

        const verifyButton = screen.getByRole("button", { name: "Verify" });
        expect(verifyButton).toHaveClass("bg-muted");
        fireEvent.click(screen.getByText("Open Link"));
        expect(verifyButton).toHaveClass("bg-brand-gradient");

        rerender(
            <DeviceFlowModal
                flowData={nextFlowData}
                loading={false}
                status="pending"
                onStart={onStart}
                onVerifyNow={onVerifyNow}
            />,
        );

        expect(screen.getByRole("button", { name: "Verify" })).toHaveClass("bg-muted");
    });
});
