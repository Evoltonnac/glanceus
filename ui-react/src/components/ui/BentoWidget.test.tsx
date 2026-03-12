import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { render } from "../../test/render";
import { BentoWidget } from "./BentoWidget";

describe("BentoWidget", () => {
    it("applies expected classes for each variant", () => {
        const { rerender, container } = render(
            <BentoWidget variant="default">Body</BentoWidget>,
        );

        expect(container.firstElementChild?.className).toContain("bg-surface/40");

        rerender(<BentoWidget variant="outline">Body</BentoWidget>);
        expect(container.firstElementChild?.className).toContain("bg-transparent");
        expect(container.firstElementChild?.className).toContain("border");

        rerender(<BentoWidget variant="ghost">Body</BentoWidget>);
        expect(container.firstElementChild?.className).toContain("bg-transparent");
    });

    it("renders header details conditionally", () => {
        const { rerender } = render(<BentoWidget>Body</BentoWidget>);
        expect(screen.queryByRole("heading")).toBeNull();

        rerender(
            <BentoWidget
                title="Usage"
                subtitle="Daily"
                icon={<span data-testid="bento-icon">I</span>}
                headerAction={<button type="button">Action</button>}
            >
                Body
            </BentoWidget>,
        );

        expect(screen.getByRole("heading", { name: "Usage" })).toBeInTheDocument();
        expect(screen.getByText("Daily")).toBeInTheDocument();
        expect(screen.getByTestId("bento-icon")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    });
});
