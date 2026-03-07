import { describe, expect, it, vi, beforeEach } from "vitest";

import { api } from "./client";

describe("api client", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    it("returns null when source data endpoint responds 404", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue({
            ok: false,
            status: 404,
            json: vi.fn(),
        } as unknown as Response);

        await expect(api.getSourceData("missing-source")).resolves.toBeNull();
        expect(fetchMock).toHaveBeenCalledWith("/api/data/missing-source");
    });

    it("throws deterministic error on non-404 source data failure", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue({
            ok: false,
            status: 500,
            json: vi.fn(),
        } as unknown as Response);

        await expect(api.getSourceData("broken-source")).rejects.toThrow(
            "Failed to fetch data for broken-source",
        );
    });
});
