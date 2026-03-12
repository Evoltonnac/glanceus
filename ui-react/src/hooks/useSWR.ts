import useSWR, { mutate } from "swr";
export { mutate };

import { api } from "../api/client";
import type { SourceSummary, DataResponse } from "../types/config";

const fetcher = async (key: string) => {
  // 根据 key 映射到对应的 API 方法
  switch (key) {
    case "sources":
      return api.getSources();
    case "views":
      return api.getViews();
    case "settings":
      return api.getSettings();
    case "integration-files":
      return api.listIntegrationFiles();
    case "integration-presets":
      return api.listIntegrationPresets();
    case "integration-metadata":
      return api.listIntegrationFileMetadata();
    default:
      // 处理带参数的 key，如 "source-data-{id}"
      if (key.startsWith("source-data-")) {
        const sourceId = key.replace("source-data-", "");
        return api.getSourceData(sourceId);
      }
      if (key.startsWith("integration-file-")) {
        const filename = key.replace("integration-file-", "");
        return api.getIntegrationFile(filename);
      }
      if (key.startsWith("integration-sources-")) {
        const filename = key.replace("integration-sources-", "");
        return api.getIntegrationSources(filename);
      }
      throw new Error(`Unknown key: ${key}`);
  }
};

// Fetcher that gets sources AND their data (like the old loadData)
const sourcesWithDataFetcher = async (): Promise<{
  sources: SourceSummary[];
  dataMap: Record<string, DataResponse>;
}> => {
  const sourcesData = await api.getSources();

  const dataPromises = sourcesData.map((s) =>
    api
      .getSourceData(s.id)
      .then((data) => ({ id: s.id, data }))
  );
  const results = await Promise.all(dataPromises);

  const dataMap: Record<string, DataResponse> = {};
  results.forEach(({ id, data }) => {
    dataMap[id] = data;
  });

  return { sources: sourcesData, dataMap };
};

// --- Dashboard Hooks ---

export function useSources() {
  const { data, error, isLoading, mutate: mutateSources } = useSWR(
    "sources-with-data",
    sourcesWithDataFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    sources: data?.sources ?? [],
    dataMap: data?.dataMap ?? {},
    isLoading,
    isError: error,
    mutateSources,
  };
}

export function useSourceData(sourceId: string) {
  const { data, error, isLoading } = useSWR(
    sourceId ? `source-data-${sourceId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    data: data ?? null,
    isLoading,
    isError: error,
  };
}

export function useViews() {
  const { data, error, isLoading, mutate: mutateViews } = useSWR(
    "views",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    views: data ?? [],
    isLoading,
    isError: error,
    mutateViews,
  };
}

// --- Settings Hooks ---

export function useSettings() {
  const { data, error, isLoading, mutate: mutateSettings } = useSWR(
    "settings",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    settings: data ?? null,
    isLoading,
    isError: error,
    mutateSettings,
  };
}

// --- Integrations Hooks ---

export function useIntegrationFiles() {
  const { data, error, isLoading, mutate: mutateFiles } = useSWR(
    "integration-files",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    files: data ?? [],
    isLoading,
    isError: error,
    mutateFiles,
  };
}

export function useIntegrationPresets() {
  const { data, error, isLoading } = useSWR(
    "integration-presets",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    presets: data ?? [],
    isLoading,
    isError: error,
  };
}

export function useIntegrationMetadata() {
  const { data, error, isLoading } = useSWR(
    "integration-metadata",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    metadata: data ?? [],
    isLoading,
    isError: error,
  };
}

export function useIntegrationFile(filename: string) {
  const { data, error, isLoading } = useSWR(
    filename ? `integration-file-${filename}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    file: data ?? null,
    isLoading,
    isError: error,
  };
}

export function useIntegrationSources(filename: string) {
  const { data, error, isLoading } = useSWR(
    filename ? `integration-sources-${filename}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return {
    sources: data ?? [],
    isLoading,
    isError: error,
  };
}

// --- Utility Functions ---

export async function invalidateSources() {
  mutate("sources-with-data");
}

// Optimistically update sources cache for immediate UI feedback
export async function optimisticUpdateSources(
  updateFn: (data: { sources: SourceSummary[]; dataMap: Record<string, DataResponse> }) => { sources: SourceSummary[]; dataMap: Record<string, DataResponse> }
) {
  mutate(
    "sources-with-data",
    async (currentData) => {
      if (!currentData) return currentData;
      return updateFn(currentData);
    },
    false
  );
}

// Optimistically remove a source from cache
export function optimisticRemoveSource(sourceId: string) {
  optimisticUpdateSources((data) => ({
    sources: data.sources.filter((s) => s.id !== sourceId),
    dataMap: Object.fromEntries(
      Object.entries(data.dataMap).filter(([id]) => id !== sourceId)
    ),
  }));
}

// Optimistically update a source's status (e.g., for refresh)
export function optimisticUpdateSourceStatus(
  sourceId: string,
  status: SourceSummary["status"]
) {
  optimisticUpdateSources((data) => ({
    sources: data.sources.map((s) =>
      s.id === sourceId ? { ...s, status } : s
    ),
    dataMap: data.dataMap,
  }));
}

export async function invalidateViews() {
  mutate("views");
}

export async function invalidateSettings() {
  mutate("settings");
}

export async function invalidateIntegrationFiles() {
  mutate("integration-files");
}

export async function invalidateIntegrationMetadata() {
  mutate("integration-metadata");
}

export async function invalidateAll() {
  mutate((key) => typeof key === "string" && key.startsWith(""));
}
