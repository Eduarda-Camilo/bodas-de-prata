import type { Location, Route } from "@/data/types";
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
