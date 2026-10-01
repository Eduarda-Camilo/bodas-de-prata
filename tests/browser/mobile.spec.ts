import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const empty = {
  checks: {},
  photos: [],
  configured: true,
  photosConfigured: true,
};
async function open(page: Page, welcome = false) {
  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "GET")
      await route.fulfill({ json: empty });
    else await route.fulfill({ json: { ok: true } });
  });
  if (!welcome)
    await page.addInitScript(() =>
      localStorage.setItem("bodas-welcome", "done"),
    );
  await page.goto(`/api/session?token=${process.env.TEST_TRIP_SECRET}`);
  await expect(page).toHaveURL("/");
  if (!welcome)
    await expect(
      page.getByRole("heading", { name: "O melhor caminho" }),
    ).toBeVisible();
}
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test("sessão privada, cookie seguro, APIs fechadas e validação dos IDs", async ({
  page,
  request,
}) => {
  const denied = await request.patch("/api/state", {
    data: { id: "day-8-1", completed: true },
    headers: { Origin: "http://localhost:3100" },
  });
  expect(denied.status()).toBe(401);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /link privado/ }),
  ).toBeVisible();
  const bad = await request.get("/api/session?token=invalid");
  expect(bad.status()).toBe(401);
  await open(page);
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "trip_session",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  const state = await page.context().request.get("/api/state");
  expect(state.status()).toBe(200);
  expect((await state.json()).configured).toBe(false);
  const invalid = await page
    .context()
    .request.patch("/api/state", {
      headers: { Origin: "http://localhost:3100" },
      data: { id: "arbitrary-folder", completed: true },
    });
  expect(invalid.status()).toBe(400);
  const unconfigured = await page
    .context()
    .request.patch("/api/state", {
      headers: { Origin: "http://localhost:3100" },
      data: { id: "day-8-1", completed: true },
    });
  expect(unconfigured.status()).toBe(503);

  const result = await page.evaluate(async () => {
    const r = await fetch("/api/photos", {
      method: "POST",
      body: new FormData(),
    });
    return r.status;
  });
  expect(result).toBe(400);
  const csrf = await page.context().request.patch("/api/state", {
    headers: { Origin: "https://other.example" },
    data: { id: "day-8-1", completed: true },
  });
  expect(csrf.status()).toBe(403);
});
test("onboarding, navegação a 360/390/430px, estados vazios e ausência de erros de runtime", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, true);
  await expect(
    page.getByRole("heading", { name: /Cleide e Flávio/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Conhecer nosso guia" }).click();
  await page.getByRole("button", { name: "Começar nossa viagem" }).click();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ["Hoje", "Roteiro", "Viagem"]) {
      await nav(page, name);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Memórias", exact: true }).click();
    await expect(page.getByText("As memórias estão por vir.")).toBeVisible();
  }
  await nav(page, "Hoje");
  await page.screenshot({ path: "/tmp/bodas-home-mobile.png", fullPage: true });
  await nav(page, "Roteiro");
  await page.getByRole("button", { name: "SÁB 14 NOV" }).click();
  await expect(
    page.getByRole("button", { name: "Jantar das Bodas" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/bodas-bodas-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Cleide e Flávio/ }),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("checks otimistas, desfazer, rollback, offline e compartilhamento via API", async ({
  page,
  context,
  browser,
}) => {
  let checks: Record<string, boolean> = {};
  let fail = false;
  await open(page);
  await page.unroute("**/api/state");
  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { ...empty, checks } });
    if (fail)
      return route.fulfill({ status: 503, json: { error: "Sem conexão" } });
    const b = route.request().postDataJSON();
    checks = { ...checks, [b.id]: b.completed };
    await new Promise((r) => setTimeout(r, 150));
    await route.fulfill({ json: { ok: true } });
  });
  await nav(page, "Roteiro");
  const first = page.locator(".event-card").first();
  await first.getByRole("button", { name: "Marcar como concluído" }).click();
  await expect(first.getByRole("button", { name: /Concluído/ })).toBeVisible();
  await expect.poll(() => checks["day-8-1"]).toBe(true);
  const otherContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const other = await otherContext.newPage();
  await other.addInitScript(() =>
    localStorage.setItem("bodas-welcome", "done"),
  );
  await other.route("**/api/state", (r) =>
    r.fulfill({ json: { ...empty, checks } }),
  );
  await other.goto(`/api/session?token=${process.env.TEST_TRIP_SECRET}`);
  await nav(other, "Roteiro");
  await expect(
    other
      .locator(".event-card")
      .first()
      .getByRole("button", { name: /Concluído/ }),
  ).toBeVisible();
  await otherContext.close();

  await first.getByRole("button", { name: /Desfazer/ }).click();
  await expect.poll(() => checks["day-8-1"]).toBe(false);
  fail = true;
  await first.getByRole("button", { name: "Marcar como concluído" }).click();
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "Ele voltou como estava",
  );
  await expect(
    first.getByRole("button", { name: "Marcar como concluído" }),
  ).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText(/Sem sinal. Aproveitem/)).toBeVisible();
  await first.getByRole("button", { name: "Marcar como concluído" }).click();
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "Sem sinal agora",
  );
  await context.setOffline(false);
});
test("rota de volta em dois trechos, Maps destino-only e detalhe de carimbo", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Roteiro");
  await page.getByRole("button", { name: "SEG 16 NOV" }).click();
  await page
    .getByRole("button", { name: "A estrada de volta para casa" })
    .click();
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "A estrada de volta para casa" }),
  });
  for (const i of [1, 2]) {
    const url = new URL(
      (await dialog
        .getByRole("link", { name: `Abrir trecho ${i}` })
        .getAttribute("href"))!,
    );
    expect(
      url.searchParams.get("waypoints")!.split("|").length,
    ).toBeLessThanOrEqual(3);
  }
  await dialog.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByRole("button", { name: "DOM 8 NOV" }).click();
  await page
    .getByRole("button", { name: "Retirar passaporte e primeiro carimbo" })
    .click();
  await expect(page.locator(".stamp-info")).toContainText(
    "Local do carimbo a confirmar",
  );
  expect(
    await page
      .locator(".details-sheet")
      .getByRole("link", { name: "Como chegar" })
      .count(),
  ).toBe(0);
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByRole("button", { name: "Chegada a Ouro Preto" }).click();
  const dest = new URL(
    (await page
      .locator(".details-sheet")
      .getByRole("link", { name: "Como chegar" })
      .getAttribute("href"))!,
  );
  expect(dest.searchParams.has("origin")).toBe(false);
});
test("upload comprimido, erro mantém prévia, retry idempotente, galeria e exclusão confirmada", async ({
  page,
}) => {
  await open(page);
  let fail = true;
  let firstId = "";
  const photo = {
    id: String(randomUUID()),
    eventId: "day-8-4",
    filename: "foto.jpg",
    mimeType: "image/jpeg",
    uploadedAt: new Date().toISOString(),
  };
  await page.route("**/api/photos", async (route) => {
    const data = route.request().postDataBuffer()!.toString();
    const id = data.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    )![0];
    if (firstId) expect(id).toBe(firstId);
    firstId = id;
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: "Não foi possível enviar a foto." },
      });
    photo.id = id;
    await route.fulfill({ json: photo });
  });
  await page.route("**/api/photos/*", async (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({ json: { ok: true } })
      : route.fulfill({
          path: "public/icon-192.png",
          contentType: "image/png",
        }),
  );
  await nav(page, "Roteiro");
  await page.getByRole("button", { name: "Chegada a Ouro Preto" }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("public/icon-512.png");
  await expect(page.getByAltText("Prévia da foto selecionada")).toBeVisible();
  await page.getByRole("button", { name: "Guardar esta foto" }).click();
  await expect(
    page.getByText("Não foi possível enviar a foto.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByAltText("Prévia da foto selecionada")).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByText("Foto guardada com carinho.")).toBeVisible();
  await page.getByRole("button", { name: "Abrir foto ampliada" }).click();
  await page.getByRole("button", { name: "Excluir foto", exact: true }).click();
  await page.getByRole("button", { name: "Manter foto" }).click();
  await expect(page.getByAltText("Foto da viagem ampliada")).toBeVisible();
  await page.getByRole("button", { name: "Excluir foto", exact: true }).click();
  await page.getByRole("button", { name: "Sim, excluir" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir foto ampliada" }),
  ).toHaveCount(0);
});
test("mapa funcional, fallback de tiles e expansão do mapa ilustrado", async ({
  page,
}) => {
  await open(page);
  await page.route("**/*.tile.openstreetmap.org/**", (r) => r.abort());
  await nav(page, "Mapa");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByText(/O mapa de ruas não carregou/)).toBeVisible();
  await page.locator(".leaflet-control-zoom-in").click();
  await page.getByRole("button", { name: "Ampliar", exact: true }).click();
  await expect(page.locator(".expanded-map-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fechar mapa ilustrado" }).click();
  await expect(page.locator(".expanded-map-dialog")).toHaveCount(0);
});

test("PWA preserva o roteiro visitado após recarregar sem conexão", async ({
  page,
  context,
}) => {
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "O melhor caminho" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const cache = await caches.open("bodas-shell-v1");
    if (!(await cache.match("/"))) throw new Error("Shell não cacheado");
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "O melhor caminho" }),
  ).toBeVisible();
  await nav(page, "Roteiro");
  await expect(
    page.getByRole("heading", { name: "Nosso roteiro" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "SÁB 14 NOV" }).click();
  await expect(
    page.getByRole("button", { name: "Jantar das Bodas" }),
  ).toBeVisible();
  await context.setOffline(false);
});
