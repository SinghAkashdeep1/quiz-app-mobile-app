import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Web can use localhost, native devices need the host machine IP
const defaultIP = '10.205.87.35';
const defaultBaseURL = Platform.OS === 'web' ? 'localhost' : defaultIP;

const baseURL = process.env.EXPO_PUBLIC_API_URL || `http://${defaultBaseURL}:5000/api`;

export const BASE_IMAGE_URL = process.env.EXPO_PUBLIC_BASE_URL || `http://${defaultBaseURL}:5000`;

const client = axios.create({
  baseURL,
  timeout: 10000,
});

// Add a request interceptor
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  const guestId = await AsyncStorage.getItem('guestId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  
  const lang = await AsyncStorage.getItem('userLanguage') || 'en';
  config.headers['Accept-Language'] = lang;

  if (guestId) {
    config.headers['x-guest-id'] = guestId;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | x-guest-id: ${guestId} | lang: ${lang}`);
  } else {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | NO GUEST ID | lang: ${lang}`);
  }

  return config;
});

export default client;
