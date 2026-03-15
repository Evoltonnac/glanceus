import { describe, expect, it } from "vitest";

import { parseCssLengthToPixels } from "./gridSizing";

describe("gridSizing", () => {
    it("parses px values into rounded pixels", () => {
        expect(parseCssLengthToPixels("60px", 8)).toBe(60);
        expect(parseCssLengthToPixels("12.4px", 8)).toBe(12);
    });

    it("converts rem values to pixels with root font size", () => {
        expect(parseCssLengthToPixels("0.5rem", 8, 16)).toBe(8);
        expect(parseCssLengthToPixels("0.75rem", 8, 16)).toBe(12);
    });

    it("falls back for invalid or non-positive values", () => {
        expect(parseCssLengthToPixels("", 8)).toBe(8);
        expect(parseCssLengthToPixels("0", 8)).toBe(8);
        expect(parseCssLengthToPixels("-1px", 8)).toBe(8);
        expect(parseCssLengthToPixels("invalid", 8)).toBe(8);
    });
});
