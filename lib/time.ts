import { trip } from "@/data/trip";
import type { TripDay, TripEvent } from "@/data/types";
export function localDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: trip.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function tripPhase(date: string) {
  return date < trip.start ? "before" : date > trip.end ? "after" : "during";
}
export function activeDay(days: TripDay[], date: string) {
  return (
    days.find((d) => d.date === date) ??
    (date < trip.start ? days[0] : days[days.length - 1])
  );
}
export function nextEvent(
  events: TripEvent[],
  checks: Record<string, boolean>,
) {
  return events.find((e) => !checks[e.id]);
}
export function countdown(date: string) {
  return Math.max(
    0,
    Math.ceil(
      (Date.parse(trip.start + "T12:00:00-03:00") -
        Date.parse(date + "T12:00:00-03:00")) /
        86400000,
    ),
  );
}
