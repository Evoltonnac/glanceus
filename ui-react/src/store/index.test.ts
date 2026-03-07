import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        getViews: vi.fn(),
        getSources: vi.fn(),
        getSourceData: vi.fn(),
    },
}));

vi.mock("../api/client", () => ({
    api: apiMock,
}));

import { useStore } from "./index";

describe("store", () => {
    const initialState = useStore.getState();

    beforeEach(() => {
        useStore.setState(initialState, true);
        apiMock.getViews.mockReset();
        apiMock.getSources.mockReset();
        apiMock.getSourceData.mockReset();
    });

    it("toggles sidebar state", () => {
        expect(useStore.getState().sidebarCollapsed).toBe(false);

        useStore.getState().toggleSidebar();
        expect(useStore.getState().sidebarCollapsed).toBe(true);

        useStore.getState().toggleSidebar();
        expect(useStore.getState().sidebarCollapsed).toBe(false);
    });

    it("loads data and updates view, source, and data map state", async () => {
        apiMock.getViews.mockResolvedValue([
            {
                id: "view-1",
                name: "Main",
                layout_columns: 12,
                items: [],
            },
        ]);
        apiMock.getSources.mockResolvedValue([
            {
                id: "source-1",
                name: "Demo",
                description: "",
                enabled: true,
                auth_type: "none",
                has_data: true,
                status: "active",
            },
        ]);
        apiMock.getSourceData.mockResolvedValue({
            source_id: "source-1",
            data: { value: 42 },
        });

        await useStore.getState().loadData();

        const state = useStore.getState();
        expect(state.loading).toBe(false);
        expect(state.viewConfig?.id).toBe("view-1");
        expect(state.sources).toHaveLength(1);
        expect(state.dataMap["source-1"]).toEqual({
            source_id: "source-1",
            data: { value: 42 },
        });
    });
});
