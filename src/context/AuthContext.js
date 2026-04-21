import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  deletePushToken,
  fetchSession,
  hasApiBaseUrl,
  logoutSession,
  registerPushToken,
  requestOtp as requestOtpApi,
  verifyOtp as verifyOtpApi,
} from '../services/api';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';
import {
  clearSessionToken,
  persistSessionToken,
  readSessionToken,
} from '../services/sessionStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState(null);

  const clearSession = useCallback(async () => {
    setSession(null);
    await clearSessionToken();
  }, []);

  const syncSession = useCallback(async (token, options = {}) => {
    const { clearOnFailure = true } = options;

    if (!token || !hasApiBaseUrl) {
      if (clearOnFailure) {
        await clearSession();
      }
      return null;
    }

    try {
      const nextSession = await fetchSession(token);
      setSession(nextSession);
      await persistSessionToken(nextSession.token);
      return nextSession;
    } catch (sessionError) {
      if (clearOnFailure) {
        await clearSession();
      }
      throw sessionError;
    }
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = await readSessionToken();

        if (!storedToken) {
          return;
        }

        await syncSession(storedToken, {
          clearOnFailure: true,
        });
      } catch (sessionError) {
        if (isMounted) {
          setError(sessionError.message || 'Session expired. Please sign in again.');
        }
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [syncSession]);

  useEffect(() => {
    if (!session?.token || !hasApiBaseUrl) {
      return undefined;
    }

    let cancelled = false;
    let activePushToken = null;

    async function syncPushToken() {
      const payload = await registerForPushNotificationsAsync();

      if (!payload || cancelled) {
        return;
      }

      activePushToken = payload.expoPushToken;

      try {
        await registerPushToken(payload, session.token);
      } catch (_error) {
        // Keep auth stable even if push registration fails.
      }
    }

    syncPushToken();

    return () => {
      cancelled = true;

      if (activePushToken) {
        deletePushToken(activePushToken, session.token).catch(() => {
          // Token cleanup can safely fail during sign-out or app close.
        });
      }
    };
  }, [session?.token]);

  const requestOtp = useCallback(async (phone) => {
    setLoading(true);
    setError(null);

    try {
      const response = await requestOtpApi(phone);
      return response;
    } catch (requestError) {
      const message = requestError.message || 'Unable to send OTP right now.';
      setError(message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (phone, code) => {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await verifyOtpApi(phone, code);
      setSession(nextSession);
      await persistSessionToken(nextSession.token);
      return nextSession;
    } catch (verifyError) {
      const message = verifyError.message || 'Unable to verify OTP right now.';
      setError(message);
      throw verifyError;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session?.token || !hasApiBaseUrl) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextSession = await syncSession(session.token, {
        clearOnFailure: true,
      });
      return nextSession;
    } catch (sessionError) {
      const message = sessionError.message || 'Session expired. Please sign in again.';
      setError(message);
      throw sessionError;
    } finally {
      setLoading(false);
    }
  }, [session?.token, syncSession]);

  const signOut = useCallback(async () => {
    const token = session?.token;
    await clearSession();

    if (!token || !hasApiBaseUrl) {
      return;
    }

    try {
      await logoutSession(token);
    } catch (_error) {
      // The local session is already cleared.
    }
  }, [clearSession, session?.token]);

  const value = useMemo(
    () => ({
      error,
      hydrated,
      isAuthenticated: Boolean(session?.token),
      loading,
      refreshSession,
      requestOtp,
      session,
      setError,
      signOut,
      token: session?.token || null,
      user: session?.user || null,
      verifyOtp,
    }),
    [error, hydrated, loading, refreshSession, requestOtp, session, signOut, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
