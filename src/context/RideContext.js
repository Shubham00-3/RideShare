import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useRealtime } from './RealtimeContext';
import {
  cancelRideBooking,
  confirmRideBooking,
  fetchBookingDetails,
  fetchBookingQuote,
  fetchMyBookings,
  hasApiBaseUrl,
  previewRideMatches,
} from '../services/api';

const RideContext = createContext(null);

const DEFAULT_SEARCH = {
  pickup: 'Connaught Place, New Delhi',
  dropoff: 'Akshardham Temple, Delhi',
  pickupLocation: null,
  dropoffLocation: null,
  route: null,
  rideType: 'shared',
  seatsRequired: 1,
  allowMidTripPickup: true,
  womenOnly: false,
  departureTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
};

function buildCancelledTrip(trip) {
  if (!trip) {
    return null;
  }

  return {
    ...trip,
    status: 'cancelled',
    phaseLabel: 'Trip cancelled',
    nextStopLabel: 'Cancelled',
    etaMinutes: 0,
    driverEtaMinutes: 0,
    progress: 0,
    remainingDistanceKm: 0,
    midTripOffer: null,
  };
}

export function RideProvider({ children }) {
  const { signOut, token } = useAuth();
  const { subscribe } = useRealtime();
  const [searchForm, setSearchForm] = useState(DEFAULT_SEARCH);
  const [rideRequest, setRideRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [quote, setQuote] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [activeBookingSource, setActiveBookingSource] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      return;
    }

    setSearchForm(DEFAULT_SEARCH);
    setRideRequest(null);
    setMatches([]);
    setSelectedMatch(null);
    setSelectedVehicle(null);
    setQuote(null);
    setActiveTrip(null);
    setActiveBookingId(null);
    setActiveBookingSource(null);
    setBookingHistory([]);
    setError(null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    return subscribe((eventName, payload) => {
      if (eventName !== 'booking:update' || !payload?.booking) {
        return;
      }

      const nextBooking = payload.booking;

      setBookingHistory((previous) => {
        const hasExistingBooking = previous.some((item) => item.bookingId === nextBooking.bookingId);
        const nextItems = hasExistingBooking
          ? previous.map((item) => (item.bookingId === nextBooking.bookingId ? nextBooking : item))
          : [nextBooking, ...previous];

        return nextItems;
      });

      setActiveBookingId((previous) =>
        previous === nextBooking.bookingId || !previous ? nextBooking.bookingId : previous
      );

      if (activeBookingId === nextBooking.bookingId) {
        setActiveTrip(nextBooking.trip);
        setActiveBookingSource(nextBooking.source || 'api');
      }
    });
  }, [activeBookingId, subscribe]);

  const searchRides = useCallback(async (input) => {
    const nextSearch = {
      ...DEFAULT_SEARCH,
      ...input,
    };

    setLoading(true);
    setError(null);

    try {
      const response = await previewRideMatches(nextSearch, token);

      setSearchForm(response.request || nextSearch);
      setRideRequest(response.request);
      setMatches(response.matches);
      setSelectedMatch(response.matches[0] ?? null);
      setSelectedVehicle(null);
      setQuote(null);
      setActiveTrip(null);
      setActiveBookingId(null);
      setActiveBookingSource(null);

      return response;
    } catch (searchError) {
      const message = searchError.message || 'Unable to search rides right now.';
      setError(message);
      throw searchError;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const chooseMatch = useCallback((match) => {
    setSelectedMatch(match);
    setSelectedVehicle(null);
    setQuote(null);
  }, []);

  const chooseVehicle = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
    setQuote(null);
  }, []);

  const refreshQuote = useCallback(async (options = {}) => {
    if (!rideRequest || !selectedMatch || !selectedVehicle) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextQuote = await fetchBookingQuote({
        request: rideRequest,
        match: selectedMatch,
        vehicle: selectedVehicle,
        options: {
          insurance: true,
          allowMidTripPickup: true,
          ...options,
        },
      }, token);
      setQuote(nextQuote);
      return nextQuote;
    } catch (quoteError) {
      const message = quoteError.message || 'Unable to calculate fare right now.';
      setError(message);
      throw quoteError;
    } finally {
      setLoading(false);
    }
  }, [rideRequest, selectedMatch, selectedVehicle, token]);

  const createBooking = useCallback(async (options = {}) => {
    if (!rideRequest || !selectedMatch || !selectedVehicle) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextQuote = quote ?? (await refreshQuote(options));
      const booking = await confirmRideBooking({
        request: rideRequest,
        match: selectedMatch,
        vehicle: selectedVehicle,
        quote: nextQuote,
        options,
      }, token);
      setQuote(nextQuote);
      setActiveTrip(booking.trip);
      setActiveBookingId(booking.bookingId);
      setActiveBookingSource(booking.source || 'api');
      return booking;
    } catch (bookingError) {
      const message = bookingError.message || 'Unable to confirm ride right now.';
      setError(message);
      throw bookingError;
    } finally {
      setLoading(false);
    }
  }, [quote, refreshQuote, rideRequest, selectedMatch, selectedVehicle, token]);

  const refreshActiveBooking = useCallback(async (bookingIdOverride) => {
    const bookingId = bookingIdOverride || activeBookingId;

    if (!bookingId || !hasApiBaseUrl) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const booking = await fetchBookingDetails(bookingId, token);
      setActiveBookingId(booking.bookingId);
      setActiveBookingSource(booking.source || 'api');
      setActiveTrip(booking.trip);
      return booking;
    } catch (bookingError) {
      if (bookingError.statusCode === 401) {
        await signOut();
      }

      const message = bookingError.message || 'Unable to refresh trip right now.';
      setError(message);
      throw bookingError;
    } finally {
      setLoading(false);
    }
  }, [activeBookingId, signOut, token]);

  const refreshBookingHistory = useCallback(async () => {
    if (!token || !hasApiBaseUrl) {
      setBookingHistory([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchMyBookings(token);
      const items = response.items || [];
      setBookingHistory(items);
      return items;
    } catch (historyError) {
      if (historyError.statusCode === 401) {
        await signOut();
      }

      const message = historyError.message || 'Unable to load trip history right now.';
      setError(message);
      throw historyError;
    } finally {
      setLoading(false);
    }
  }, [signOut, token]);

  const cancelBooking = useCallback(async (bookingIdOverride) => {
    const bookingId = bookingIdOverride || activeBookingId;

    if (!bookingId) {
      throw new Error('No booking is available to cancel.');
    }

    setLoading(true);
    setError(null);

    try {
      let cancelledBooking;

      if (token && hasApiBaseUrl) {
        cancelledBooking = await cancelRideBooking(bookingId, token);
      } else if (bookingId === activeBookingId && activeTrip) {
        cancelledBooking = {
          bookingId,
          source: activeBookingSource || 'local',
          status: 'cancelled',
          trip: buildCancelledTrip(activeTrip),
        };
      } else {
        throw new Error('Cancellation requires the API to be available for this booking.');
      }

      setBookingHistory((previous) => {
        const hasExistingBooking = previous.some((item) => item.bookingId === cancelledBooking.bookingId);
        const nextItems = hasExistingBooking
          ? previous.map((item) =>
              item.bookingId === cancelledBooking.bookingId
                ? { ...item, ...cancelledBooking, trip: cancelledBooking.trip || item.trip }
                : item
            )
          : [cancelledBooking, ...previous];

        return nextItems;
      });

      if (bookingId === activeBookingId) {
        setActiveTrip(cancelledBooking.trip || buildCancelledTrip(activeTrip));
        setActiveBookingSource(cancelledBooking.source || activeBookingSource || 'api');
      }

      return cancelledBooking;
    } catch (cancelError) {
      if (cancelError.statusCode === 401) {
        await signOut();
      }

      const message = cancelError.message || 'Unable to cancel the ride right now.';
      setError(message);
      throw cancelError;
    } finally {
      setLoading(false);
    }
  }, [activeBookingId, activeBookingSource, activeTrip, signOut, token]);

  const value = useMemo(
    () => ({
      activeBookingId,
      activeBookingSource,
      activeTrip,
      bookingHistory,
      cancelBooking,
      chooseMatch,
      chooseVehicle,
      createBooking,
      error,
      loading,
      matches,
      quote,
      refreshActiveBooking,
      refreshBookingHistory,
      refreshQuote,
      rideRequest,
      searchForm,
      searchRides,
      selectedMatch,
      selectedVehicle,
      setError,
      setSearchForm,
    }),
    [
      activeTrip,
      activeBookingId,
      activeBookingSource,
      bookingHistory,
      error,
      loading,
      matches,
      quote,
      refreshActiveBooking,
      refreshBookingHistory,
      rideRequest,
      searchForm,
      selectedMatch,
      selectedVehicle,
      searchRides,
      refreshQuote,
      createBooking,
      cancelBooking,
      chooseMatch,
      chooseVehicle,
    ]
  );

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRide() {
  const context = useContext(RideContext);

  if (!context) {
    throw new Error('useRide must be used inside RideProvider');
  }

  return context;
}
