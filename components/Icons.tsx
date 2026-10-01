import {
  Car,
  Church,
  Utensils,
  Camera,
  MapPin,
  Stamp,
  BedDouble,
  Sun,
  Ship,
  Waves,
  Coffee,
  Sparkles,
} from "lucide-react";
import type { EventType } from "@/data/types";
export const eventIcons: Record<EventType, typeof Car> = {
  preparation: Sun,
  route: Car,
  city: MapPin,
  attraction: Church,
  stamp: Stamp,
  restaurant: Utensils,
  accommodation: BedDouble,
  rest: Coffee,
  boat: Ship,
  special: Sparkles,
  beach: Waves,
  stop: Coffee,
};
export const categories: Record<EventType, string> = {
  preparation: "Preparação",
  route: "Na estrada",
  city: "Cidade",
  attraction: "Para conhecer",
  stamp: "Passaporte",
  restaurant: "À mesa",
  accommodation: "Hospedagem",
  rest: "Sem pressa",
  boat: "Passeio de barco",
  special: "Bodas de Prata",
  beach: "Perto do mar",
  stop: "Uma pausa",
};
export { Camera };
