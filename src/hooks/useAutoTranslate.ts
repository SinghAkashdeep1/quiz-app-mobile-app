import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../services/translationService';

export const useAutoTranslate = () => {
  const { t, i18n } = useTranslation();
  const [cache, setCache] = useState<Record<string, string>>({});

  const autoTranslate = (key: string, defaultValue?: string) => {
    const lng = i18n.language;
    const originalValue = defaultValue || t(key);

    if (lng === 'en') return originalValue;

    // Check if i18next already has a translation (not equal to key)
    const i18nTranslated = t(key);
    if (i18nTranslated !== key) return i18nTranslated;

    // Use dynamic translation
    const cacheKey = `${lng}:${originalValue}`;
    if (cache[cacheKey]) return cache[cacheKey];

    // Trigger translation in background
    translateText(originalValue, lng).then(result => {
      if (result && result !== originalValue) {
        setCache(prev => ({ ...prev, [cacheKey]: result }));
      }
    });

    return originalValue; // Return original while loading
  };

  return { t: autoTranslate, i18n };
};
