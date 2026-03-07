import { vi } from "vitest";

export const mockInvoke = vi.fn();
export const mockListen = vi.fn();
export const mockUnlisten = vi.fn();

mockListen.mockResolvedValue(mockUnlisten);

export function resetTauriMocks() {
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockUnlisten.mockReset();
    mockListen.mockResolvedValue(mockUnlisten);
}
