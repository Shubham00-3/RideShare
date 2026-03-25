import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'rideshare.sessionToken';

let secureStoreAvailabilityPromise = null;

async function isSecureStoreAvailable() {
  if (!secureStoreAvailabilityPromise) {
    secureStoreAvailabilityPromise = SecureStore.isAvailableAsync().catch(() => false);
  }

  return secureStoreAvailabilityPromise;
}

function readWebStorage() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
}

export async function readSessionToken() {
  if (Platform.OS === 'web') {
    return readWebStorage()?.getItem(SESSION_TOKEN_KEY) || null;
  }

  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function persistSessionToken(token) {
  if (!token) {
    return clearSessionToken();
  }

  if (Platform.OS === 'web') {
    readWebStorage()?.setItem(SESSION_TOKEN_KEY, token);
    return;
  }

  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function clearSessionToken() {
  if (Platform.OS === 'web') {
    readWebStorage()?.removeItem(SESSION_TOKEN_KEY);
    return;
  }

  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
