"use client";
import { useEffect, useRef, useState } from "react";
import type { TripEvent } from "@/data/types";
import { cities, journey, returnJourney } from "@/data/places";
import { categories } from "./Icons";
import "leaflet/dist/leaflet.css";
export default function MapView({
  events,
  checks,
  onSelect,
}: {
  events: TripEvent[];
  checks: Record<string, boolean>;
  onSelect: (event: TripEvent) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !root.current) return;
      const map = L.map(root.current, { scrollWheelZoom: false }).setView(
        [-21.6, -44.35],
        7,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      })
        .on("tileerror", () => setTileError(true))
        .addTo(map);
      L.polyline(
        journey.map(
          (k) =>
            [cities[k].latitude!, cities[k].longitude!] as [number, number],
        ),
        { color: "#9b492f", weight: 3 },
      ).addTo(map);
      L.polyline(
        returnJourney.map(
          (k) =>
            [cities[k].latitude!, cities[k].longitude!] as [number, number],
        ),
        { color: "#647055", weight: 2, dashArray: "5 7" },
      ).addTo(map);
      const markers: [number, number][] = [];
      for (const key of Array.from(new Set([...journey, ...returnJourney]))) {
        const city = cities[key];
        const event =
          events.find(
            (e) => e.location?.city === city.city && e.type === "city",
          ) ??
          events.find(
            (e) => e.location?.city === city.city && e.type !== "stamp",
          );
        const marker = L.marker([city.latitude!, city.longitude!], {
          icon: L.divIcon({
            html: '<span class="city-pin">●</span>',
            className: "travel-pin",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        }).addTo(map);
        marker.bindTooltip(`${city.name} · centro aproximado`);
        if (event) marker.on("click", () => onSelect(event));
        markers.push([city.latitude!, city.longitude!]);
      }
      for (const event of events) {
        const loc = event.location;
        if (
          !loc?.coordinatesVerified ||
          loc.latitude == null ||
          loc.longitude == null ||
          event.type === "city"
        )
          continue;
        const symbols: Record<string, string> = {
          stamp: "P",
          accommodation: "H",
          restaurant: "R",
          special: "25",
          attraction: "A",
          stop: "•",
          beach: "≈",
          boat: "≈",
        };
        L.marker([loc.latitude, loc.longitude], {
          icon: L.divIcon({
            html: `<span class="place-pin ${checks[event.id] ? "done-pin" : ""}">${checks[event.id] ? "✓" : (symbols[event.type] ?? "•")}</span>`,
            className: "travel-pin",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        })
          .bindTooltip(`${categories[event.type]} · ${event.title}`)
          .on("click", () => onSelect(event))
          .addTo(map);
      }
      map.fitBounds(markers, { padding: [25, 25] });
      cleanup = () => map.remove();
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [events, checks, onSelect]);
  return (
    <>
      <div
        ref={root}
        className="functional-map"
        aria-label="Mapa interativo da viagem"
      />
      {tileError && (
        <p className="notice">
          O mapa de ruas não carregou. O roteiro e os botões do Google Maps
          continuam disponíveis.
        </p>
      )}
      <p className="caption">
        Linhas mostram o caminho geral, não navegação. Pins de cidades são
        centros aproximados. Locais aparecem quando tiverem coordenadas
        verificadas.
      </p>
      <div className="map-legend">
        <span>● Cidade</span>
        <span>H Hospedagem</span>
        <span>R Restaurante</span>
        <span>A Atração</span>
        <span>P Passaporte</span>
        <span>• Parada</span>
        <span>25 Bodas</span>
      </div>
    </>
  );
}
