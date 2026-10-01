export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma foto.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error("Escolha uma foto menor que 30 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "Este formato não abriu. Escolha uma foto JPEG, PNG ou WebP.",
    );
  }
  const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.86;
  let blob: Blob | null = null;
  while (quality >= 0.55) {
    blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= 3 * 1024 * 1024) break;
    quality -= 0.1;
  }
  if (!blob || blob.size > 3 * 1024 * 1024)
    throw new Error("Esta foto ficou grande demais. Escolha uma versão menor.");
  return blob;
}
