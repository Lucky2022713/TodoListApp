// /todoList/frontend/config.js

import { Platform } from 'react-native';

export const API_URL =
  Platform.OS === 'ios'
    ? 'http://localhost:4000'
    : 'http://192.168.1.26:4000';
