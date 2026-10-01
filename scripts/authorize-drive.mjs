// Run ONLY on your own computer: node --env-file=.env.local scripts/authorize-drive.mjs
import http from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret)
  throw new Error(
    "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET em .env.local.",
  );
const redirect = "http://localhost:8787/callback";
const state = randomBytes(32).toString("hex");
const verifier = randomBytes(32).toString("base64url");
const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirect,
  response_type: "code",
  scope: "https://www.googleapis.com/auth/drive.file",
  access_type: "offline",
  prompt: "consent",
  state,
  code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  code_challenge_method: "S256",
});
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8787");
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  if (url.searchParams.get("state") !== state) {
    res.writeHead(403).end("Pedido inválido.");
    return;
  }
  try {
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Autorização não concluída.");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirect,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    if (!response.ok) throw new Error("Não foi possível trocar a autorização.");
    const tokens = await response.json();
    if (!tokens.refresh_token)
      throw new Error(
        "Não recebemos refresh token; revogue a autorização anterior e tente novamente.",
      );
    const folder = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Bodas de Prata — Cleide e Flávio",
          mimeType: "application/vnd.google-apps.folder",
        }),
      },
    );
    if (!folder.ok) throw new Error("Não foi possível criar a pasta.");
    const created = await folder.json();
    await writeFile(
      ".env.drive",
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\nGOOGLE_DRIVE_FOLDER_ID=${created.id}\n`,
      { mode: 0o600, flag: "wx" },
    );
    res
      .writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
      .end(
        "Tudo certo. A pasta foi criada no seu Drive. Os valores foram salvos em .env.drive, no seu computador. Pode fechar esta janela.",
      );
    console.log(
      "Configuração salva em .env.drive (arquivo privado, não versionar).",
    );
    server.close();
  } catch (error) {
    res
      .writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
      .end(error.message);
    console.error(error.message);
  }
});
server.listen(8787, "127.0.0.1", () =>
  console.log(
    `Abra este endereço no navegador do seu computador:\nhttps://accounts.google.com/o/oauth2/v2/auth?${params}`,
  ),
);
setTimeout(
  () => {
    console.log("Prazo encerrado. Execute novamente para autorizar.");
    server.close();
  },
  10 * 60 * 1000,
).unref();
