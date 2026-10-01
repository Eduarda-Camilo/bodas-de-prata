import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const dbConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const driveConfigured = () =>
  [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_FOLDER_ID",
  ].every((k) => Boolean(process.env[k]));
export function db() {
  if (!dbConfigured())
    throw new ApiError(
      503,
      "Os checks compartilhados ainda precisam ser configurados.",
    );
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
function signature(value: string) {
  if (!process.env.SESSION_SECRET)
    throw new ApiError(503, "O acesso privado ainda precisa ser configurado.");
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("base64url");
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function createSession() {
  const payload = `${Date.now() + 60 * 86400000}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${signature(payload)}`;
}
export async function hasSession() {
  const raw = (await cookies()).get("trip_session")?.value;
  if (!raw || !process.env.SESSION_SECRET || !process.env.TRIP_SECRET)
    return false;
  const parts = raw.split(".");
  if (parts.length !== 3 || Number(parts[0]) < Date.now()) return false;
  return equal(parts[2], signature(parts.slice(0, 2).join(".")));
}
export async function authorize(request?: Request) {
  if (!(await hasSession()))
    throw new ApiError(401, "Abra o link privado da viagem para continuar.");
  if (request && request.method !== "GET") {
    const origin = request.headers.get("origin");
    const expected = process.env.APP_ORIGIN;
    if (!expected)
      throw new ApiError(
        503,
        "O endereço privado ainda precisa ser configurado.",
      );
    if (origin !== new URL(expected).origin)
      throw new ApiError(403, "Não foi possível autorizar esta ação.");
  }
}
export function failure(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "Não foi possível concluir. Tente novamente.",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export const photoRow = (p: Record<string, unknown>) => ({
  id: p.id,
  eventId: p.event_id,
  filename: p.filename,
  mimeType: p.mime_type,
  uploadedAt: p.uploaded_at,
});
