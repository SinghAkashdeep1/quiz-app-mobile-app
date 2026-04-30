import axios from 'axios';
import { Platform } from 'react-native';

// Web can use localhost, native devices need the host machine IP
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const BASE_IMAGE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL,
  timeout: 10000,
});

export default client;
