import { DEFAULT_LANGUAGE } from "../config/voiceConfig.js";

export const PREFERRED_LANGUAGE_KEY = "vaani.preferredLanguage";

export const getPreferredLanguage = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  try {
    const stored = window.localStorage.getItem(PREFERRED_LANGUAGE_KEY);
    return stored || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const setPreferredLanguage = (languageCode) => {
  if (typeof window === "undefined" || !languageCode) {
    return;
  }

  try {
    window.localStorage.setItem(PREFERRED_LANGUAGE_KEY, languageCode);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
};

export const clearPreferredLanguage = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(PREFERRED_LANGUAGE_KEY);
  } catch {
    // ignore
  }
};

export default {
  getPreferredLanguage,
  setPreferredLanguage,
  clearPreferredLanguage,
  PREFERRED_LANGUAGE_KEY,
};
