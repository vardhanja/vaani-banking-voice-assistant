import { useState, useEffect } from "react";
import { getPageStrings } from "../config/pageStrings.js";
import { getPreferredLanguage, PREFERRED_LANGUAGE_KEY } from "../utils/preferences.js";
import { DEFAULT_LANGUAGE } from "../config/voiceConfig.js";

/**
 * Hook to manage page language and localized strings
 * Listens to language changes and updates strings accordingly
 */
export const usePageLanguage = () => {
  const [language, setLanguage] = useState(() => getPreferredLanguage());
  const strings = getPageStrings(language);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const { language: newLanguage } = event.detail;
      setLanguage(newLanguage);
    };

    const handleStorageChange = (event) => {
      if (event.key === PREFERRED_LANGUAGE_KEY) {
        setLanguage(event.newValue || DEFAULT_LANGUAGE);
      }
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return { language, strings };
};

export default usePageLanguage;

