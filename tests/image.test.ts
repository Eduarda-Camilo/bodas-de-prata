import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareServerImage } from "../lib/image";
test("validação decodifica bytes reais, reduz imagens e remove metadados", async () => {
  const source = await sharp({
    create: { width: 3000, height: 1000, channels: 3, background: "#9b492f" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const prepared = await prepareServerImage(source);
  const info = await sharp(prepared).metadata();
  assert.equal(info.format, "jpeg");
  assert.equal(info.width, 2048);
  assert.ok(info.height! <= 2048);
  assert.equal(info.exif, undefined);
  assert.ok(prepared.length < 3 * 1024 * 1024);
});
test("bytes corrompidos e SVG disfarçado de foto são recusados", async () => {
  await assert.rejects(prepareServerImage(Buffer.from("not an image")));
  await assert.rejects(
    prepareServerImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40"/></svg>',
      ),
    ),
  );
});
