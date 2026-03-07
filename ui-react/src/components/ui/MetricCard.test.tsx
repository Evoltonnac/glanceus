import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { render } from "../../test/render";
import { MetricCard } from "./MetricCard";

describe("MetricCard", () => {
    it("renders title, value, description, and positive trend", () => {
        render(
            <MetricCard
                title="Revenue"
                value={128}
                description="Current month"
                trend={{ value: 12, isPositive: true, label: "vs last month" }}
            />,
        );

        expect(screen.getByText("Revenue")).toBeInTheDocument();
        expect(screen.getByText("128")).toBeInTheDocument();
        expect(screen.getByText("Current month")).toBeInTheDocument();
        expect(screen.getByText("+12 vs last month")).toBeInTheDocument();
    });

    it("renders negative trend and status indicator style", () => {
        const { container } = render(
            <MetricCard
                title="Errors"
                value={9}
                trend={{ value: 4, isPositive: false }}
                statusColor="error"
            />,
        );

        expect(screen.getByText("-4")).toBeInTheDocument();
        expect(container.querySelector(".bg-error")).not.toBeNull();
    });
});
