import {
  authorize,
  db,
  dbConfigured,
  driveConfigured,
  failure,
  ApiError,
  photoRow,
} from "@/lib/server";
import { eventById } from "@/data/events";
import { preparation } from "@/data/trip";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await authorize();
    if (!dbConfigured())
      return Response.json(
        { checks: {}, photos: [], configured: false, photosConfigured: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    const client = db();
    const [checks, photos] = await Promise.all([
      client.from("checks").select("id,completed"),
      client
        .from("photos")
        .select("id,event_id,filename,mime_type,uploaded_at")
        .order("uploaded_at"),
    ]);
    if (checks.error || photos.error) throw new Error("Database");
    return Response.json(
      {
        checks: Object.fromEntries(
          (checks.data ?? []).map((c) => [c.id, c.completed]),
        ),
        photos: (photos.data ?? []).map(photoRow),
        configured: true,
        photosConfigured: driveConfigured(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    await authorize(request);
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Não foi possível ler esta etapa.");
    });
    if (!body || typeof body !== "object")
      throw new ApiError(400, "Etapa inválida.");
    if (
      typeof body.completed !== "boolean" ||
      typeof body.id !== "string" ||
      (!eventById.has(body.id) &&
        !preparation.some((p) => `prep-${p.id}` === body.id))
    )
      throw new ApiError(400, "Etapa inválida.");
    const { error } = await db().from("checks").upsert({
      id: body.id,
      completed: body.completed,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Database");
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
