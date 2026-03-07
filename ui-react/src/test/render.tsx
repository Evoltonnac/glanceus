import type { ReactElement } from "react";
import { render as rtlRender } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter>{children}</MemoryRouter>;
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
    return rtlRender(ui, { wrapper: Wrapper, ...options });
}
