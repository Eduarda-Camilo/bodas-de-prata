export type EventType =
  | "preparation"
  | "route"
  | "city"
  | "attraction"
  | "stamp"
  | "restaurant"
  | "accommodation"
  | "rest"
  | "boat"
  | "special"
  | "beach"
  | "stop";
export type Location = {
  name: string;
  city: string;
  state?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  coordinatesVerified?: boolean;
  googleMapsUrl?: string;
};
export type Route = {
  origin: string;
  destination: string;
  waypoints?: string[];
  estimatedDuration?: string;
  distance?: string;
  segments?: Route[];
};
export type TripEvent = {
  id: string;
  dayId: string;
  type: EventType;
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  approximateTime: boolean;
  important?: boolean;
  location?: Location;
  route?: Route;
  referenceImages?: { src: string; alt: string }[];
  allowPhotoUpload: boolean;
  notes?: string[];
  stampPlace?: {
    verified: boolean;
    name: string | null;
    address: string | null;
    mapsUrl: string | null;
  };
  accommodation?: {
    checkIn?: string;
    checkOut?: string;
    phone?: string;
    parking?: string;
    breakfast?: string;
  };
};
export type TripDay = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  city: string;
  heroImage?: string;
  events: TripEvent[];
};
export type Photo = {
  id: string;
  eventId: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
};
export type SharedState = {
  checks: Record<string, boolean>;
  photos: Photo[];
  configured: boolean;
  photosConfigured: boolean;
};
