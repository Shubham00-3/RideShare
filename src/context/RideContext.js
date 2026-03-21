import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  confirmRideBooking,
  fetchBookingQuote,
  previewRideMatches,
} from '../services/api';

const RideContext = createContext(null);

const DEFAULT_SEARCH = {
  pickup: 'Connaught Place, New Delhi',
  dropoff: 'Akshardham Temple, Delhi',
  rideType: 'shared',
  seatsRequired: 1,
  allowMidTripPickup: true,
  departureTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
};

export function RideProvider({ children }) {
  const [searchForm, setSearchForm] = useState(DEFAULT_SEARCH);
  const [rideRequest, setRideRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [quote, setQuote] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchRides = useCallback(async (input) => {
    const nextSearch = {
      ...DEFAULT_SEARCH,
      ...input,
    };

    setLoading(true);
    setError(null);

    try {
      const response = await previewRideMatches(nextSearch);

      setSearchForm(nextSearch);
      setRideRequest(response.request);
      setMatches(response.matches);
      setSelectedMatch(response.matches[0] ?? null);
      setSelectedVehicle(null);
      setQuote(null);
      setActiveTrip(null);

      return response;
    } catch (searchError) {
      const message = searchError.message || 'Unable to search rides right now.';
      setError(message);
      throw searchError;
    } finally {
      setLoading(false);
    }
  }, []);

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
      });
      setQuote(nextQuote);
      return nextQuote;
    } catch (quoteError) {
      const message = quoteError.message || 'Unable to calculate fare right now.';
      setError(message);
      throw quoteError;
    } finally {
      setLoading(false);
    }
  }, [rideRequest, selectedMatch, selectedVehicle]);

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
      });
      setQuote(nextQuote);
      setActiveTrip(booking.trip);
      return booking;
    } catch (bookingError) {
      const message = bookingError.message || 'Unable to confirm ride right now.';
      setError(message);
      throw bookingError;
    } finally {
      setLoading(false);
    }
  }, [quote, refreshQuote, rideRequest, selectedMatch, selectedVehicle]);

  const value = useMemo(
    () => ({
      activeTrip,
      chooseMatch,
      chooseVehicle,
      createBooking,
      error,
      loading,
      matches,
      quote,
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
      error,
      loading,
      matches,
      quote,
      rideRequest,
      searchForm,
      selectedMatch,
      selectedVehicle,
      searchRides,
      refreshQuote,
      createBooking,
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
