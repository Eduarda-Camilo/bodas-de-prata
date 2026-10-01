"use client";
import { useEffect, useRef, useState } from "react";
import type { TripEvent } from "@/data/types";
import { cities, journey, returnJourney } from "@/data/places";
import { categories } from "./Icons";
import { mapTiles } from "@/lib/map-tiles";
import type { Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
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
  const [retry, setRetry] = useState(0);
  const checksRef = useRef(checks);
  const placeMarkers = useRef<{ event: TripEvent; marker: Marker }[]>([]);
  useEffect(() => {
    checksRef.current = checks;
    for (const { event, marker } of placeMarkers.current) {
      const pin = marker.getElement()?.querySelector(".place-pin");
      if (pin) {
        pin.textContent = checks[event.id] ? "✓" : (symbols[event.type] ?? "•");
        pin.classList.toggle("done-pin", Boolean(checks[event.id]));
      }
    }
  }, [checks]);
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !root.current) return;
      const map = L.map(root.current, { scrollWheelZoom: false }).setView(
        [-21.6, -44.35],
        7,
      );
      const tiles = L.tileLayer(mapTiles.url, {
        attribution: mapTiles.attribution,
        subdomains: mapTiles.subdomains,
        maxZoom: mapTiles.maxZoom,
      });
      let failed = false;
      tiles
        .on("tileerror", () => {
          if (cancelled || failed) return;
          failed = true;
          map.removeLayer(tiles);
          setTileError(true);
        })
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
        const marker = L.marker([loc.latitude, loc.longitude], {
          icon: L.divIcon({
            html: `<span class="place-pin ${checksRef.current[event.id] ? "done-pin" : ""}">${checksRef.current[event.id] ? "✓" : (symbols[event.type] ?? "•")}</span>`,
            className: "travel-pin",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        })
          .bindTooltip(`${categories[event.type]} · ${event.title}`)
          .on("click", () => onSelect(event))
          .addTo(map);
        placeMarkers.current.push({ event, marker });
      }
      map.fitBounds(markers, { padding: [25, 25] });
      cleanup = () => {
        placeMarkers.current = [];
        map.remove();
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [events, onSelect, retry]);
  return (
    <>
      <div
        ref={root}
        className="functional-map"
        aria-label="Mapa interativo da viagem"
      />
      {tileError && (
        <div className="notice map-notice" role="status">
          <p>
            O mapa de ruas não carregou. Os pontos, o roteiro e os botões do
            Google Maps continuam disponíveis.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setTileError(false);
              setRetry((value) => value + 1);
            }}
          >
            Tentar carregar o mapa
          </button>
        </div>
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
