import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  fetchSession,
  hasApiBaseUrl,
  logoutSession,
  requestOtp as requestOtpApi,
  verifyOtp as verifyOtpApi,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const nextSession = await fetchSession(session.token);
      setSession(nextSession);
      return nextSession;
    } catch (sessionError) {
      setSession(null);
      const message = sessionError.message || 'Session expired. Please sign in again.';
      setError(message);
      throw sessionError;
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  const signOut = useCallback(async () => {
    const token = session?.token;
    setSession(null);

    if (!token || !hasApiBaseUrl) {
      return;
    }

    try {
      await logoutSession(token);
    } catch (_error) {
      // The local session is already cleared.
    }
  }, [session?.token]);

  const value = useMemo(
    () => ({
      error,
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
    [error, loading, refreshSession, requestOtp, session, signOut, verifyOtp]
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
