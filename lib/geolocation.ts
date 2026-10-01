import { cities } from "@/data/places";
export type DevicePosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};
export function nearbyCity(position: DevicePosition) {
  if (position.accuracy > 15000) return undefined;
  const radians = (value: number) => (value * Math.PI) / 180;
  let closest: { name: string; distance: number } | undefined;
  for (const city of Object.values(cities)) {
    const dLat = radians(city.latitude! - position.latitude),
      dLon = radians(city.longitude! - position.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(position.latitude)) *
        Math.cos(radians(city.latitude!)) *
        Math.sin(dLon / 2) ** 2;
    const bounded = Math.min(1, Math.max(0, a));
    const distance =
      6371 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
    if (!closest || distance < closest.distance)
      closest = { name: city.name, distance };
  }
  return closest && closest.distance <= 30 ? closest.name : undefined;
}
export function validPosition(
  position: GeolocationPosition,
): DevicePosition | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    accuracy < 0
  )
    return null;
  return { latitude, longitude, accuracy, timestamp: position.timestamp };
}
