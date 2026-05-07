import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'dynamic_translation_';

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || !targetLang || targetLang === 'en') return text;

  const cacheKey = `${CACHE_KEY_PREFIX}${targetLang}_${text}`;
  
  try {
    // 1. Check local cache
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached;

    // 2. Call backend
    const response = await client.post('/game/lifeline/translate-static', {
      text,
      targetLang
    });

    const translation = response.data.translation;

    // 3. Save to local cache
    if (translation && translation !== text) {
      await AsyncStorage.setItem(cacheKey, translation);
    }

    return translation;
  } catch (error) {
    console.error('Dynamic translation failed:', error);
    return text;
  }
};
