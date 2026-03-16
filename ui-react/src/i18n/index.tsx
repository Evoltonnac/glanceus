import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSettings } from "../hooks/useSWR";
import enMessages from "./messages/en";
import zhMessages from "./messages/zh";

export type AppLanguage = "en" | "zh";
type MessageCatalog = Record<string, string>;
type MessageParams = Record<string, string | number>;
export type ErrorCopy = {
  title: string;
  description: string;
};

const catalogs: Record<AppLanguage, MessageCatalog> = {
  en: enMessages,
  zh: zhMessages,
};

export type Translate = (key: string, params?: MessageParams) => string;

function resolveLanguage(raw: unknown): AppLanguage {
  return raw === "zh" ? "zh" : "en";
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function translate(locale: AppLanguage, key: string, params?: MessageParams): string {
  const localeCatalog = catalogs[locale];
  const fallbackCatalog = catalogs.en;
  const raw = localeCatalog[key] ?? fallbackCatalog[key] ?? key;
  return interpolate(raw, params);
}

function resolveErrorCopyByCode(t: Translate, errorCode?: string | null): ErrorCopy | null {
  if (!errorCode) return null;

  const titleKey = `error.copy.${errorCode}.title`;
  const descriptionKey = `error.copy.${errorCode}.description`;
  const title = t(titleKey);
  const description = t(descriptionKey);
  if (title !== titleKey || description !== descriptionKey) {
    return {
      title: title !== titleKey ? title : description,
      description: description !== descriptionKey ? description : title,
    };
  }

  if (errorCode.startsWith("auth.")) {
    return {
      title: t("error.copy.auth.generic.title"),
      description: t("error.copy.auth.generic.description"),
    };
  }
  if (errorCode.startsWith("runtime.")) {
    return {
      title: t("error.copy.runtime.generic.title"),
      description: t("error.copy.runtime.generic.description"),
    };
  }
  return {
    title: t("error.copy.generic.title"),
    description: t("error.copy.generic.description"),
  };
}

type I18nContextValue = {
  locale: AppLanguage;
  setLocale: (locale: AppLanguage) => void;
  t: Translate;
  getErrorCopyByCode: (errorCode?: string | null) => ErrorCopy | null;
  getErrorMessageByCode: (errorCode?: string | null) => string | null;
};

const defaultTranslate: Translate = (key, params) => translate("zh", key, params);
const defaultContextValue: I18nContextValue = {
  locale: "zh",
  setLocale: () => undefined,
  t: defaultTranslate,
  getErrorCopyByCode: (errorCode?: string | null) =>
    resolveErrorCopyByCode(defaultTranslate, errorCode),
  getErrorMessageByCode: (errorCode?: string | null) =>
    resolveErrorCopyByCode(defaultTranslate, errorCode)?.description ?? null,
};

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [locale, setLocaleState] = useState<AppLanguage>("en");

  useEffect(() => {
    setLocaleState(resolveLanguage(settings?.language));
  }, [settings?.language]);

  const setLocale = useCallback((nextLocale: AppLanguage) => {
    setLocaleState(resolveLanguage(nextLocale));
  }, []);

  const t = useCallback<Translate>(
    (key, params) => translate(locale, key, params),
    [locale],
  );

  const getErrorMessageByCode = useCallback(
    (errorCode?: string | null) => resolveErrorCopyByCode(t, errorCode)?.description ?? null,
    [t],
  );

  const getErrorCopyByCode = useCallback(
    (errorCode?: string | null) => resolveErrorCopyByCode(t, errorCode),
    [t],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, getErrorCopyByCode, getErrorMessageByCode }),
    [locale, setLocale, t, getErrorCopyByCode, getErrorMessageByCode],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
