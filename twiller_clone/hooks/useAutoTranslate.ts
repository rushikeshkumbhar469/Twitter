import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/context/translationcontext";

// Module-level cache: "lang:text" -> translated string
const translationCache = new Map<string, string>();

// MyMemory language code map (our codes -> BCP-47 pair format)
const LANG_MAP: Record<string, string> = {
  en: "en",
  hi: "hi",
  es: "es",
  pt: "pt",
  zh: "zh-CN",
  fr: "fr",
};

async function fetchTranslation(text: string, targetLang: string): Promise<string> {
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const langPair = `en|${LANG_MAP[targetLang] || targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Translation API error");

  const data = await res.json();
  const translated: string = data?.responseData?.translatedText || text;

  translationCache.set(cacheKey, translated);
  return translated;
}

/**
 * Translates a single string to the current UI language.
 * Returns { translated, loading }.
 * - If language is "en" or text is empty, returns original text immediately (no API call).
 * - Results are cached per session to avoid redundant API calls.
 */
export function useAutoTranslate(text: string): { translated: string; loading: boolean } {
  const { language } = useTranslation();
  const [translated, setTranslated] = useState(text);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // No translation needed for English or empty text
    if (!text || language === "en") {
      setTranslated(text);
      setLoading(false);
      return;
    }

    const cacheKey = `${language}:${text}`;
    if (translationCache.has(cacheKey)) {
      setTranslated(translationCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Cancel any in-flight request for this hook instance
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    fetchTranslation(text, language)
      .then((result) => setTranslated(result))
      .catch(() => setTranslated(text)) // silently fall back to original
      .finally(() => setLoading(false));

    return () => {
      abortRef.current?.abort();
    };
  }, [text, language]);

  return { translated, loading };
}
