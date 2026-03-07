import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { render } from "../../test/render";
import { WidgetRenderer } from "./WidgetRenderer";

vi.mock("./HeroMetric", () => ({
    HeroMetric: () => <div data-testid="hero-metric-widget" />,
}));

vi.mock("./KeyValueGrid", () => ({
    KeyValueGrid: () => <div data-testid="key-value-grid-widget" />,
}));

vi.mock("./ProgressBar", () => ({
    ProgressBar: () => <div data-testid="progress-bar-widget" />,
}));

vi.mock("./ListWidget", () => ({
    ListWidget: () => <div data-testid="list-widget" />,
}));

describe("WidgetRenderer", () => {
    it("dispatches widget types to their dedicated components", () => {
        const data = { value: 1 };

        render(
            <WidgetRenderer
                widget={{ type: "hero_metric", amount: "{value}" } as any}
                data={data}
            />,
        );
        expect(screen.getByTestId("hero-metric-widget")).toBeInTheDocument();

        render(
            <WidgetRenderer
                widget={{ type: "key_value_grid", items: { A: "{value}" } } as any}
                data={data}
            />,
        );
        expect(screen.getByTestId("key-value-grid-widget")).toBeInTheDocument();

        render(
            <WidgetRenderer
                widget={{ type: "progress_bar", usage: "{value}", limit: "100" } as any}
                data={data}
            />,
        );
        expect(screen.getByTestId("progress-bar-widget")).toBeInTheDocument();

        render(
            <WidgetRenderer
                widget={
                    {
                        type: "list",
                        data_source: "items",
                        render: { type: "hero_metric", amount: "{item.value}" },
                    } as any
                }
                data={{ items: [{ value: 1 }] }}
            />,
        );
        expect(screen.getByTestId("list-widget")).toBeInTheDocument();
    });

    it("renders unknown type fallback message", () => {
        render(
            <WidgetRenderer
                widget={{ type: "unknown_widget" } as any}
                data={{}}
            />,
        );

        expect(
            screen.getByText("Unknown widget type: unknown_widget"),
        ).toBeInTheDocument();
    });

    it("applies row-span defaults and custom override to wrapper style", () => {
        const { rerender } = render(
            <WidgetRenderer
                widget={{ type: "hero_metric", amount: "{value}" } as any}
                data={{ value: 1 }}
            />,
        );

        const defaultWrapper = screen
            .getByTestId("hero-metric-widget")
            .parentElement;
        expect(defaultWrapper?.getAttribute("style")).toContain("flex: 2");

        rerender(
            <WidgetRenderer
                widget={{ type: "hero_metric", amount: "{value}", row_span: 5 } as any}
                data={{ value: 1 }}
            />,
        );

        const customWrapper = screen
            .getByTestId("hero-metric-widget")
            .parentElement;
        expect(customWrapper?.getAttribute("style")).toContain("flex: 5");
    });
});
