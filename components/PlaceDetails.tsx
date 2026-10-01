"use client";
import BottomSheet from "./BottomSheet";
import { X } from "lucide-react";
import type { TripEvent, Photo } from "@/data/types";
import { categories, eventIcons } from "./Icons";
import { CompletionButton, GoogleMapsButton, RouteCard } from "./EventCard";
import { PhotoGallery, PhotoUploader } from "./PhotoGallery";
export default function PlaceDetails({
  event,
  done,
  pending,
  photos,
  uploadEnabled,
  onClose,
  onToggle,
  onUploaded,
  onDeleted,
}: {
  event: TripEvent | null;
  done: boolean;
  pending: boolean;
  photos: Photo[];
  uploadEnabled: boolean;
  onClose: () => void;
  onToggle: () => void;
  onUploaded: (p: Photo) => void;
  onDeleted: (id: string) => void;
}) {
  const Icon = event ? eventIcons[event.type] : X;
  return (
    <BottomSheet
      open={Boolean(event)}
      onClose={onClose}
      className="details-sheet"
      labelledBy="place-title"
      contentKey={event?.id}
      closeLabel="Fechar detalhes"
      heading={
        event && (
          <span className="eyebrow">
            <Icon size={18} />
            {categories[event.type]}
          </span>
        )
      }
    >
      <div className="sheet-content">
        {event && (
          <>
            <h2 id="place-title">{event.title}</h2>
            <p className="caption">
              {event.location?.city}
              {event.location?.state ? ` — ${event.location.state}` : ""} ·{" "}
              {event.dayId.replace("day-", "")}/11 ·{" "}
              {event.approximateTime ? "~ " : ""}
              {event.startTime}
              {event.endTime ? `–${event.endTime}` : ""}
            </p>
            <p>{event.description}</p>
            {event.location?.name &&
              event.location.name !== "A definir" &&
              event.location.name !== event.title && (
                <h3>{event.location.name}</h3>
              )}
            {event.location?.address && (
              <p>
                <strong>Endereço</strong>
                <br />
                {event.location.address}
              </p>
            )}
            {event.referenceImages?.length ? (
              <>
                <h3>Fotos do local</h3>
                <div className="reference-images">
                  {event.referenceImages.map((p) => (
                    <img key={p.src} src={p.src} alt={p.alt} />
                  ))}
                </div>
              </>
            ) : (
              event.location && (
                <p className="caption">
                  Fotos de referência do local ainda não cadastradas.
                </p>
              )
            )}
            {event.type === "stamp" && (
              <div className="stamp-info">
                <h3>Passaporte da Estrada Real</h3>
                <p>
                  {event.stampPlace?.verified
                    ? event.stampPlace.name
                    : "Local do carimbo a confirmar"}
                </p>
                {event.stampPlace?.address && <p>{event.stampPlace.address}</p>}
              </div>
            )}
            {event.accommodation && (
              <div className="info-box">
                <h3>Hospedagem</h3>
                <p>
                  {event.location?.name === "A definir"
                    ? "Pousada a definir"
                    : event.location?.name}
                </p>
                {Object.entries(event.accommodation).map(
                  ([key, value]) =>
                    value && (
                      <p key={key}>
                        <strong>
                          {
                            (
                              {
                                checkIn: "Check-in",
                                checkOut: "Check-out",
                                phone: "Telefone",
                                parking: "Estacionamento",
                                breakfast: "Café da manhã",
                              } as Record<string, string>
                            )[key]
                          }
                          :
                        </strong>{" "}
                        {value}
                      </p>
                    ),
                )}
              </div>
            )}
            {event.notes?.map((n) => (
              <p key={n} className="notice">
                {n}
              </p>
            ))}
            {event.route ? (
              <RouteCard route={event.route} />
            ) : (
              <GoogleMapsButton event={event} />
            )}
            <CompletionButton
              done={done}
              pending={pending}
              stamp={event.type === "stamp"}
              onToggle={onToggle}
            />
            {event.allowPhotoUpload && (
              <>
                <h3 className="gallery-heading">Fotos de vocês</h3>
                {photos.length ? (
                  <PhotoGallery photos={photos} onDeleted={onDeleted} />
                ) : (
                  <p className="caption">
                    Este momento ainda espera a primeira foto de vocês.
                  </p>
                )}
                <PhotoUploader
                  key={event.id}
                  eventId={event.id}
                  enabled={uploadEnabled}
                  onUploaded={onUploaded}
                />
              </>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
