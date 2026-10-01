"use client";
import { useEffect, useRef, useState } from "react";
import type { TripEvent } from "@/data/types";
import { cities, journey, returnJourney } from "@/data/places";
import { categories } from "./Icons";
import { mapTiles } from "@/lib/map-tiles";
import type {
  Marker,
  Map as LeafletMap,
  CircleMarker,
  Circle,
  LatLngBounds,
} from "leaflet";
import { LocateFixed, Route, MapPin } from "lucide-react";
import useDeviceLocation from "./useDeviceLocation";
import { nearbyCity } from "@/lib/geolocation";
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
  const { position, status, start } = useDeviceLocation();
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const positionMarker = useRef<CircleMarker | null>(null);
  const accuracyCircle = useRef<Circle | null>(null);
  const journeyBounds = useRef<LatLngBounds | null>(null);
  const centered = useRef(false);
  const [mapVersion, setMapVersion] = useState(0);
  const city = position ? nearbyCity(position) : undefined;

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
      mapRef.current = map;
      leafletRef.current = L;
      centered.current = false;
      const colors = getComputedStyle(root.current);
      const primary = colors.getPropertyValue("--primary").trim();
      const secondary = colors.getPropertyValue("--secondary-accent").trim();
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
        { color: primary, weight: 4 },
      ).addTo(map);
      L.polyline(
        returnJourney.map(
          (k) =>
            [cities[k].latitude!, cities[k].longitude!] as [number, number],
        ),
        { color: secondary, weight: 2, dashArray: "5 7" },
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
      journeyBounds.current = L.latLngBounds(markers);
      map.fitBounds(journeyBounds.current, { padding: [35, 35] });
      setMapVersion((value) => value + 1);
      cleanup = () => {
        placeMarkers.current = [];
        map.remove();
        mapRef.current = null;
        leafletRef.current = null;
        positionMarker.current = null;
        accuracyCircle.current = null;
        journeyBounds.current = null;
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [events, onSelect, retry]);
  useEffect(() => {
    const map = mapRef.current,
      L = leafletRef.current;
    if (!map || !L) return;
    if (!position) {
      positionMarker.current?.remove();
      accuracyCircle.current?.remove();
      positionMarker.current = null;
      accuracyCircle.current = null;
      return;
    }
    const point: [number, number] = [position.latitude, position.longitude];
    const styles = getComputedStyle(root.current!);
    const color = styles.getPropertyValue("--primary").trim();
    const fill = styles.getPropertyValue("--highlight").trim();
    if (!accuracyCircle.current)
      accuracyCircle.current = L.circle(point, {
        radius: position.accuracy,
        color,
        fillColor: fill,
        fillOpacity: 0.2,
        weight: 1,
        interactive: false,
      }).addTo(map);
    else accuracyCircle.current.setLatLng(point).setRadius(position.accuracy);
    if (!positionMarker.current)
      positionMarker.current = L.circleMarker(point, {
        radius: 9,
        color: "#ffffff",
        fillColor: color,
        fillOpacity: 1,
        weight: 3,
        className: "device-location-dot",
      })
        .bindTooltip("Vocês estão aqui")
        .addTo(map);
    else positionMarker.current.setLatLng(point);
    positionMarker.current.bringToFront();
    if (!centered.current) {
      map.setView(point, 13);
      centered.current = true;
    }
  }, [position, mapVersion]);
  function centerOnDevice() {
    if (!position) {
      start();
      return;
    }
    mapRef.current?.flyTo(
      [position.latitude, position.longitude],
      Math.max(mapRef.current.getZoom(), 13),
      {
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      },
    );
  }
  function showJourney() {
    if (journeyBounds.current)
      mapRef.current?.fitBounds(journeyBounds.current, { padding: [35, 35] });
  }
  const locationText =
    status === "active"
      ? city
        ? `Nos arredores de ${city}`
        : "Vocês estão aqui, no mapa."
      : status === "requesting"
        ? "Permitam a localização no aviso do celular para aparecer no mapa."
        : status === "denied"
          ? "A localização não foi permitida. Vocês podem liberá-la nas configurações do navegador."
          : status === "insecure"
            ? "Para usar a localização no celular, abram a versão HTTPS da viagem."
            : status === "timeout"
              ? "A posição está demorando a chegar. Tentem de novo em um lugar com melhor sinal."
              : "Não conseguimos encontrar a posição agora. Tentem novamente.";
  return (
    <>
      <div className="map-stage">
        <div
          ref={root}
          className="functional-map"
          aria-label="Mapa interativo da viagem"
        />
        <div className="map-controls">
          <button
            className="map-control"
            onClick={centerOnDevice}
            disabled={status === "requesting"}
          >
            <LocateFixed size={20} />
            {status === "requesting"
              ? "Localizando…"
              : position
                ? "Nossa localização"
                : "Localizar vocês"}
          </button>
          <button
            className="map-control map-overview"
            onClick={showJourney}
            aria-label="Ver toda a viagem no mapa"
          >
            <Route size={20} />
          </button>
        </div>
      </div>
      <div
        className={`location-note ${status === "active" ? "location-active" : ""}`}
        role="status"
      >
        <MapPin size={19} />
        <div>
          <strong>{locationText}</strong>
          {position && (
            <span>
              Posição aproximada · margem de{" "}
              {position.accuracy < 1000
                ? `${Math.round(position.accuracy)} m`
                : `${(position.accuracy / 1000).toFixed(1).replace(".", ",")} km`}
            </span>
          )}
          <p>A posição aparece só neste celular. Não guardamos um histórico.</p>
        </div>
      </div>
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
