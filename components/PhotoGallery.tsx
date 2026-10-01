"use client";
import { useEffect, useRef, useState, useId } from "react";
import { Camera, ImagePlus, Trash2, RefreshCw } from "lucide-react";
import type { Photo } from "@/data/types";
import { compressImage } from "@/lib/compress";
import BottomSheet from "./BottomSheet";
export function PhotoUploader({
  eventId,
  enabled,
  onUploaded,
}: {
  eventId: string;
  enabled: boolean;
  onUploaded: (p: Photo) => void;
}) {
  const [selected, setSelected] = useState<{
    blob: Blob;
    url: string;
    id: string;
  } | null>(null);
  const [status, setStatus] = useState<
    "idle" | "preparing" | "sending" | "error" | "sent"
  >("idle");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const selection = useRef(selected);
  useEffect(() => {
    selection.current = selected;
  }, [selected]);
  useEffect(
    () => () => {
      if (selection.current) URL.revokeObjectURL(selection.current.url);
    },
    [],
  );
  async function prepare(file?: File) {
    if (!file || busy.current) return;
    busy.current = true;
    setStatus("preparing");
    setError("");
    try {
      const blob = await compressImage(file);
      if (selected) URL.revokeObjectURL(selected.url);
      setSelected({
        blob,
        url: URL.createObjectURL(blob),
        id: crypto.randomUUID(),
      });
      setStatus("idle");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }
  async function upload() {
    if (!selected || busy.current) return;
    busy.current = true;
    setStatus("sending");
    setError("");
    const form = new FormData();
    form.set("eventId", eventId);
    form.set("id", selected.id);
    form.set("file", selected.blob, "foto.jpg");
    try {
      const response = await fetch("/api/photos", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onUploaded(data);
      URL.revokeObjectURL(selected.url);
      setSelected(null);
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message || "Não foi possível enviar a foto.");
    } finally {
      busy.current = false;
    }
  }
  return (
    <div className="photo-uploader">
      <h3>Fotos deste momento</h3>
      {!enabled ? (
        <p className="caption">
          O envio de fotos estará disponível depois que a Duda configurar o
          acesso privado e o Google Drive.
        </p>
      ) : (
        <>
          <div className="photo-actions">
            <label
              className={`button secondary ${status === "sending" || status === "preparing" ? "disabled" : ""}`}
            >
              <ImagePlus size={18} /> Escolher foto
              <input
                type="file"
                accept="image/*"
                disabled={status === "preparing" || status === "sending"}
                onChange={(e) => {
                  void prepare(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="button secondary">
              <Camera size={18} /> Câmera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={status === "preparing" || status === "sending"}
                onChange={(e) => {
                  void prepare(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {selected && (
            <>
              <img
                className="upload-preview"
                src={selected.url}
                alt="Prévia da foto selecionada"
              />
              <button
                className="button"
                disabled={status === "sending" || status === "preparing"}
                onClick={() => void upload()}
              >
                {status === "sending" ? (
                  "Enviando…"
                ) : status === "error" ? (
                  <>
                    <RefreshCw size={18} />
                    Tentar novamente
                  </>
                ) : (
                  "Guardar esta foto"
                )}
              </button>
            </>
          )}
          {status === "preparing" && <p role="status">Preparando a foto…</p>}
          {status === "sent" && (
            <p role="status" className="success">
              Foto guardada com carinho.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
export function PhotoGallery({
  photos,
  onDeleted,
}: {
  photos: Photo[];
  onDeleted: (id: string) => void;
}) {
  const titleId = useId();
  const [open, setOpen] = useState<Photo | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!open || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/photos/${open.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error((await response.json()).error);
      onDeleted(open.id);
      setOpen(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="photo-grid">
        {photos.map((p) => (
          <button
            key={p.id}
            className="photo-thumbnail"
            onClick={() => {
              setOpen(p);
              setConfirm(false);
              setError("");
            }}
            aria-label="Abrir foto ampliada"
          >
            <img
              src={`/api/photos/${p.id}`}
              alt="Memória deste momento da viagem"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <BottomSheet
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        className="photo-dialog"
        labelledBy={titleId}
        closeLabel="Fechar foto"
        heading={<h2 id={titleId}>Uma memória de vocês</h2>}
        contentKey={open?.id}
      >
        {open && (
          <>
            <img src={`/api/photos/${open.id}`} alt="Foto da viagem ampliada" />
            <p>
              {new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
              }).format(new Date(open.uploadedAt))}
            </p>
            {confirm ? (
              <div className="delete-confirm">
                <p>
                  Excluir esta foto das memórias e enviar à lixeira do Drive?
                </p>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  {busy ? "Excluindo…" : "Sim, excluir"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setConfirm(false)}
                >
                  Manter foto
                </button>
              </div>
            ) : (
              <button className="text-button" onClick={() => setConfirm(true)}>
                <Trash2 size={18} /> Excluir foto
              </button>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </>
        )}
      </BottomSheet>
    </>
  );
}
