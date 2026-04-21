import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiBaseUrl, hasApiBaseUrl } from '../services/api';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !hasApiBaseUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return undefined;
    }

    const socket = io(apiBaseUrl, {
      auth: {
        token,
      },
      reconnection: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      if (user?.role === 'driver') {
        socket.emit('watch:driver');
      }

      if (user?.role === 'admin') {
        socket.emit('watch:admin');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.onAny((eventName, payload) => {
      listenersRef.current.forEach((listener) => {
        listener(eventName, payload);
      });
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [token, user?.role]);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);

    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const watchBooking = useCallback((bookingId) => {
    if (!socketRef.current || !bookingId) {
      return () => {};
    }

    socketRef.current.emit('watch:booking', {
      bookingId,
    });

    return () => {
      socketRef.current?.emit('unwatch:booking', {
        bookingId,
      });
    };
  }, []);

  const watchTrip = useCallback((tripId) => {
    if (!socketRef.current || !tripId) {
      return () => {};
    }

    socketRef.current.emit('watch:trip', {
      tripId,
    });

    return () => {
      socketRef.current?.emit('unwatch:trip', {
        tripId,
      });
    };
  }, []);

  const watchDriver = useCallback(() => {
    socketRef.current?.emit('watch:driver');
  }, []);

  const watchAdmin = useCallback(() => {
    socketRef.current?.emit('watch:admin');
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      subscribe,
      watchAdmin,
      watchBooking,
      watchDriver,
      watchTrip,
    }),
    [isConnected, subscribe, watchAdmin, watchBooking, watchDriver, watchTrip]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error('useRealtime must be used inside RealtimeProvider');
  }

  return context;
}
