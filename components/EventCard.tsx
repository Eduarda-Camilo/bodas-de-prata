"use client";
import { ArrowUpRight, Check, ChevronRight, Undo2, Camera } from "lucide-react";
import type { TripEvent, Route } from "@/data/types";
import { eventIcons, categories } from "./Icons";
import { buildGoogleMapsDirectionsUrl, getEventMapsUrl } from "@/lib/maps";
export function GoogleMapsButton({ event }: { event: TripEvent }) {
  const url = getEventMapsUrl(event);
  if (!url) return null;
  return (
    <a
      className="maps-button"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ArrowUpRight size={17} />
      {event.route ? "Abrir rota no Maps" : "Como chegar"}
    </a>
  );
}
export function RouteCard({ route }: { route: Route }) {
  return (
    <div className="route-detail">
      <h3>A estrada de vocês</h3>
      <ol className="route-stops">
        {[route.origin, ...(route.waypoints ?? []), route.destination].map(
          (s, i) => (
            <li key={i}>{s.replace(", Brasil", "")}</li>
          ),
        )}
      </ol>
      {route.estimatedDuration && (
        <p className="caption">{route.estimatedDuration}</p>
      )}
      {route.segments ? (
        <>
          <p>
            Uma só viagem, em dois trechos. No celular, abra cada parte na ordem
            para manter todas as paradas.
          </p>
          {route.segments.map((s, i) => (
            <div className="route-segment" key={i}>
              <span className="eyebrow">
                TRECHO {i + 1} DE {route.segments!.length}
              </span>
              <p>
                {[s.origin, ...(s.waypoints ?? []), s.destination]
                  .map((x) => x.split(",")[0])
                  .join(" → ")}
              </p>
              <a
                className="button secondary"
                target="_blank"
                rel="noopener noreferrer"
                href={buildGoogleMapsDirectionsUrl(s)}
              >
                Abrir trecho {i + 1} <ArrowUpRight size={18} />
              </a>
            </div>
          ))}
          <details>
            <summary>Rota completa (compatibilidade varia)</summary>
            <p className="caption">
              Alguns celulares aceitam menos paradas. Se não aparecerem todas,
              use os dois trechos acima.
            </p>
            <a
              className="button secondary"
              target="_blank"
              rel="noopener noreferrer"
              href={buildGoogleMapsDirectionsUrl(route)}
            >
              Abrir rota completa
            </a>
          </details>
        </>
      ) : (
        <a
          className="button secondary"
          href={buildGoogleMapsDirectionsUrl(route)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir rota no Google Maps <ArrowUpRight size={18} />
        </a>
      )}
    </div>
  );
}
export function CompletionButton({
  done,
  pending,
  onToggle,
  stamp = false,
}: {
  done: boolean;
  pending: boolean;
  onToggle: () => void;
  stamp?: boolean;
}) {
  return (
    <button
      className={`completion ${done ? "is-complete" : ""}`}
      disabled={pending}
      onClick={onToggle}
    >
      {done ? (
        <>
          <Check size={18} /> Concluído{" "}
          <span className="undo">
            <Undo2 size={14} />
            Desfazer
          </span>
        </>
      ) : (
        <>
          <span className="empty-check" />
          {stamp ? "Carimbo feito" : "Marcar como concluído"}
        </>
      )}
    </button>
  );
}
export default function EventCard({
  event,
  done,
  pending,
  next,
  onToggle,
  onDetails,
  photoCount = 0,
}: {
  event: TripEvent;
  done: boolean;
  pending: boolean;
  next: boolean;
  onToggle: () => void;
  onDetails: () => void;
  photoCount?: number;
}) {
  const Icon = eventIcons[event.type];
  return (
    <article
      className={`event-card ${done ? "completed" : ""} ${event.type === "special" ? "special-card" : ""} ${next ? "next-event" : ""}`}
    >
      <div className="event-time">
        <span>
          {event.approximateTime ? "~ " : ""}
          {event.startTime}
          {event.endTime ? `–${event.endTime}` : ""}
        </span>
        {next && !done && <span className="next-tag">Próximo</span>}
        {event.important && (
          <span className="reservation-tag">
            {event.type === "special" ? "Dia especial" : "Conforme reserva"}
          </span>
        )}
      </div>
      <div className="event-heading">
        <span className="event-icon">
          <Icon size={20} />
        </span>
        <div>
          <span className="event-category">
            {categories[event.type]}{" "}
            {event.location?.city ? `· ${event.location.city}` : ""}
          </span>
          <button className="event-title" onClick={onDetails}>
            {event.title}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      {event.description && <p>{event.description}</p>}
      {event.type === "stamp" && !event.stampPlace?.verified && (
        <p className="pending-place">Local do carimbo a confirmar</p>
      )}
      <div className="event-links">
        {!event.route?.segments && <GoogleMapsButton event={event} />}
        <button className="text-button" onClick={onDetails}>
          {event.route?.segments ? (
            "Ver trechos da volta"
          ) : event.allowPhotoUpload ? (
            <>
              <Camera size={16} />
              {photoCount
                ? `${photoCount} foto${photoCount > 1 ? "s" : ""}`
                : "Detalhes e fotos"}
            </>
          ) : (
            "Ver detalhes"
          )}
        </button>
      </div>
      <CompletionButton
        done={done}
        pending={pending}
        onToggle={onToggle}
        stamp={event.type === "stamp"}
      />
    </article>
  );
}
