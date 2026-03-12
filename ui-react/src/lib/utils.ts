import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { evaluateTemplateExpression } from "./templateExpression";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Opens a URL in the user's default browser.
 * In Tauri, uses the shell plugin. In browser, uses window.open.
 */
export async function openExternalLink(url: string) {
  const nativeOpen =
    typeof window !== "undefined" && (window as any).__GLANCIER_NATIVE_OPEN__
      ? ((window as any).__GLANCIER_NATIVE_OPEN__ as typeof window.open)
      : window.open.bind(window);

  const fallbackOpen = () => nativeOpen(url, "_blank", "noopener,noreferrer");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    fallbackOpen();
    return;
  }

  if (!isTauri()) {
    fallbackOpen();
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_external_url", { url });
    return;
  } catch (error) {
    console.error("Failed to open URL via Tauri command:", error);
  }

  try {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
  } catch (error) {
    console.error("Failed to open URL in Tauri shell:", error);
    fallbackOpen();
  }
}

export function getFieldFromPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  // Convert [0] to .0
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  const keys = normalizedPath.split(".");

  let current = obj;
  for (const key of keys) {
    if (!key) continue; // Skip empty keys from leading dot e.g. .0
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

export function evaluateTemplate(template: any, data: any): any {
  if (typeof template !== "string") return template;

  // Entire string is one expression: keep original return type.
  const singleExpressionMatch = template.match(/^\{([^{}]+)\}$/);
  if (singleExpressionMatch) {
    const value = evaluateTemplateExpression(singleExpressionMatch[1], data);
    return value !== undefined ? value : "";
  }

  // Mixed string: evaluate each expression and stringify.
  return template.replace(/\{([^{}]+)\}/g, (_, expression) => {
    const value = evaluateTemplateExpression(expression, data);
    return value !== undefined && value !== null ? String(value) : "";
  });
}

/**
 * Detects if the application is currently running inside the Tauri window.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const userAgent = window.navigator?.userAgent ?? "";
  const protocol = window.location?.protocol ?? "";
  return Boolean(
    (globalThis as any).isTauri ||
      /\bTauri\b/i.test(userAgent) ||
      protocol === "tauri:" ||
      (window as any).__TAURI_INTERNALS__ !== undefined ||
      (window as any).__TAURI__ !== undefined,
  );
}
