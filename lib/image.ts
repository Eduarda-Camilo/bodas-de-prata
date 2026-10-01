import sharp from "sharp";
/** Decode real bytes, enforce pixel budget, strip metadata and normalize output. */
export async function prepareServerImage(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
    throw new Error("Unsupported image format");
  return image
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 86 })
    .toBuffer();
}
