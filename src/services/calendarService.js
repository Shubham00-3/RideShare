import * as Calendar from 'expo-calendar';

function resolveScheduleWindow(booking) {
  const trip = booking?.trip;
  const startDate = trip?.departureTime ? new Date(trip.departureTime) : new Date();
  const durationMinutes = Math.max(Number(trip?.durationMinutes || 30), 15);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    endDate,
    startDate,
  };
}

export async function addScheduledRideToCalendar(booking) {
  const trip = booking?.trip;

  if (!trip) {
    return null;
  }

  const { startDate, endDate } = resolveScheduleWindow(booking);
  const title = `RideShare ride to ${trip.dropoff?.split(',')[0] || 'destination'}`;
  const notes = [
    `Pickup: ${trip.pickup || 'Pending'}`,
    `Dropoff: ${trip.dropoff || 'Pending'}`,
    `Booking ID: ${booking.bookingId || 'Pending'}`,
    trip.driver?.name ? `Driver: ${trip.driver.name}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return Calendar.createEventInCalendarAsync({
    title,
    startDate,
    endDate,
    location: `${trip.pickup || ''} -> ${trip.dropoff || ''}`,
    notes,
  });
}
