import type { Location, Route, TripEvent } from "@/data/types";
export function buildGoogleMapsDirectionsUrl(route: Route) {
  const p = new URLSearchParams({
    api: "1",
    origin: route.origin,
    destination: route.destination,
    travelmode: "driving",
  });
  if (route.waypoints?.length) p.set("waypoints", route.waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${p}`;
}
export function buildGoogleMapsPlaceUrl(place: Location) {
  if (place.googleMapsUrl) return place.googleMapsUrl;
  const query = place.address
    ? `${place.name}, ${place.address}, ${place.city}, ${place.state ?? ""}`
    : `${place.name}, ${place.city}, ${place.state ?? ""}`;
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`;
}

export function getEventMapsUrl(event: TripEvent) {
  if (event.route) return buildGoogleMapsDirectionsUrl(event.route);
  const place = event.location;
  const placeUrl =
    place && place.name !== "A definir"
      ? buildGoogleMapsPlaceUrl(place)
      : undefined;
  if (event.type === "stamp")
    return event.stampPlace?.verified
      ? (event.stampPlace.mapsUrl ?? placeUrl)
      : undefined;
  return placeUrl;
}
