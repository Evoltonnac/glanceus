import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "../../test/render";
import { DeviceFlowModal } from "./DeviceFlowModal";

describe("DeviceFlowModal", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
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

        fireEvent.click(screen.getByText("Verify"));
        expect(onVerifyNow).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText("Copy Code"));
        expect(clipboardWrite).toHaveBeenCalledWith("ABCD-EFGH");
    });
});
