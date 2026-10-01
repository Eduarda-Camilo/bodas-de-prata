import { prepareServerImage } from "@/lib/image";
import { authorize, db, failure, ApiError, photoRow } from "@/lib/server";
import { uploadImage } from "@/lib/drive";
import { eventById, days } from "@/data/events";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await authorize(request);
    const length = Number(request.headers.get("content-length"));
    if (length > 4 * 1024 * 1024)
      throw new ApiError(413, "A foto precisa ser menor que 4 MB.");
    const form = await request.formData();
    const eventId = form.get("eventId"),
      id = form.get("id"),
      file = form.get("file");
    if (
      typeof eventId !== "string" ||
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new ApiError(400, "Foto inválida.");
    const event = eventById.get(eventId);
    if (!event?.allowPhotoUpload) throw new ApiError(400, "Etapa inválida.");
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 3 * 1024 * 1024 ||
      file.size === 0
    )
      throw new ApiError(400, "Escolha uma imagem de até 3 MB.");
    const client = db();
    const existing = await client
      .from("photos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (existing.error) throw new Error("Database");
    if (existing.data) {
      if (existing.data.event_id !== eventId)
        throw new ApiError(409, "Foto inválida.");
      return Response.json(photoRow(existing.data));
    }
    let bytes: Buffer;
    try {
      bytes = await prepareServerImage(Buffer.from(await file.arrayBuffer()));
    } catch {
      throw new ApiError(
        400,
        "Não foi possível ler esta imagem. Escolha outra foto.",
      );
    }
    const claim = await client.rpc("claim_photo_upload", {
      photo_id: id,
      target_event_id: eventId,
    });
    if (claim.error) throw new Error("Database upload lock");
    if (!claim.data)
      throw new ApiError(
        409,
        "Esta foto ainda está sendo guardada. Aguarde um pouco e tente novamente.",
      );
    try {
      const date = days.find((d) => d.id === event.dayId)!.date;
      const driveFileId = await uploadImage(
        bytes,
        eventId,
        date,
        event.title,
        id,
      );
      const { data, error } = await client
        .from("photos")
        .upsert(
          {
            id,
            event_id: eventId,
            drive_file_id: driveFileId,
            filename: `${id}.jpg`,
            mime_type: "image/jpeg",
          },
          { onConflict: "id" },
        )
        .select()
        .single();
      if (error) throw new Error("Database");
      return Response.json(photoRow(data));
    } finally {
      await client.from("photo_uploads").delete().eq("id", id);
    }
  } catch (e) {
    return failure(e);
  }
}
