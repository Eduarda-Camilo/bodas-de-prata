import { authorize, db, failure, ApiError } from "@/lib/server";
import { driveFetch } from "@/lib/drive";
async function photo(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new ApiError(404, "Foto não encontrada.");
  const { data, error } = await db()
    .from("photos")
    .select("drive_file_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Database");
  if (!data) throw new ApiError(404, "Foto não encontrada.");
  return data;
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize();
    const p = await photo((await params).id);
    const upstream = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(p.drive_file_id)}?alt=media`,
    );
    if (!upstream.ok) throw new ApiError(502, "Não foi possível abrir a foto.");
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const { id } = await params;
    const p = await photo(id);
    const response = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(p.drive_file_id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      },
    );
    if (!response.ok && response.status !== 404)
      throw new Error("Drive delete");
    const { error } = await db().from("photos").delete().eq("id", id);
    if (error) throw new Error("Database");
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
