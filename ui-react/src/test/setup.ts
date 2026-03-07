import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import {
    mockInvoke,
    mockListen,
    resetTauriMocks,
} from "./mocks/tauri";

vi.mock("@tauri-apps/api/core", () => ({
    invoke: mockInvoke,
}));

vi.mock("@tauri-apps/api/event", () => ({
    listen: mockListen,
}));

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    resetTauriMocks();
});
