import "server-only";
import { ApiError, driveConfigured } from "./server";
let tokenCache: { value: string; until: number } | undefined;
async function accessToken() {
  if (!driveConfigured())
    throw new ApiError(503, "O envio de fotos ainda precisa ser configurado.");
  if (tokenCache && tokenCache.until > Date.now()) return tokenCache.value;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(
      503,
      "Não foi possível acessar as fotos. Tente novamente mais tarde.",
    );
  const data = await response.json();
  tokenCache = {
    value: data.access_token,
    until: Date.now() + (data.expires_in - 120) * 1000,
  };
  return tokenCache.value;
}
export async function driveFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await accessToken()}`);
  return fetch(url, { ...init, headers, cache: "no-store" });
}
async function folder(name: string, parent: string) {
  const q = `'${parent.replaceAll("'", "\\'")}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${name.replaceAll("'", "\\'")}' and trashed = false`;
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: "files(id)" })}`,
  );
  if (!response.ok) throw new Error("Drive folder lookup");
  const data = await response.json();
  if (data.files?.[0]) return data.files[0].id as string;
  const created = await driveFetch(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent],
      }),
    },
  );
  if (!created.ok) throw new Error("Drive folder creation");
  return (await created.json()).id as string;
}
export async function uploadImage(
  bytes: Buffer,
  eventId: string,
  date: string,
  title: string,
  id: string,
) {
  const root = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  // A stable request ID recovers a Drive upload whose database write or client response failed.
  const lookup = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: `trashed = false and appProperties has { key='tripPhotoId' and value='${id}' }`, fields: "files(id)" })}`,
  );
  if (!lookup.ok) throw new Error("Drive lookup");
  const existing = (await lookup.json()).files?.[0];
  if (existing) return existing.id as string;
  const parent = await folder(
    `${date.slice(8)}-11${date === "2026-11-14" ? " - Bodas" : date === "2026-11-16" ? " - Volta para BH" : ""}`,
    root,
  );
  const eventFolder = await folder(`${eventId} - ${title}`, parent);
  const started = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "image/jpeg",
        "X-Upload-Content-Length": String(bytes.length),
      },
      body: JSON.stringify({
        name: `${id}.jpg`,
        parents: [eventFolder],
        appProperties: { tripPhotoId: id, eventId },
      }),
    },
  );
  const uri = started.headers.get("location");
  if (!started.ok || !uri || new URL(uri).hostname !== "www.googleapis.com")
    throw new Error("Drive resumable initialization");
  let offset = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const end = Math.min(offset + 1024 * 1024, bytes.length);
      const sent = await driveFetch(uri, {
        method: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Range": `bytes ${offset}-${end - 1}/${bytes.length}`,
        },
        body: new Uint8Array(bytes.subarray(offset, end)),
      });
      if (sent.ok) return (await sent.json()).id as string;
      if (sent.status === 308) {
        offset = Number(sent.headers.get("range")?.split("-")[1] ?? -1) + 1;
        continue;
      }
      if (sent.status < 500 && sent.status !== 429)
        throw new ApiError(502, "Não foi possível enviar a foto.");
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
    const status = await driveFetch(uri, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes */${bytes.length}`,
        "Content-Length": "0",
      },
    });
    if (status.ok) return (await status.json()).id as string;
    if (status.status !== 308)
      throw new ApiError(502, "Não foi possível enviar a foto.");
    offset = Number(status.headers.get("range")?.split("-")[1] ?? -1) + 1;
  }
  throw new ApiError(502, "Não foi possível enviar a foto.");
}
