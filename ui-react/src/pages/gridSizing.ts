export function parseCssLengthToPixels(
    rawValue: string | null | undefined,
    fallback: number,
    rootFontSizePx: number = 16,
): number {
    const trimmed = (rawValue ?? "").trim();
    if (!trimmed) {
        return fallback;
    }

    const numeric = Number.parseFloat(trimmed);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return fallback;
    }

    if (trimmed.endsWith("rem")) {
        return Math.max(1, Math.round(numeric * rootFontSizePx));
    }

    return Math.max(1, Math.round(numeric));
}
