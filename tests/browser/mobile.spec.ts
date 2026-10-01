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
  const invalid = await page.context().request.patch("/api/state", {
    headers: { Origin: "http://localhost:3100" },
    data: { id: "arbitrary-folder", completed: true },
  });
  expect(invalid.status()).toBe(400);
  for (const body of ["null", "{"]) {
    const malformed = await page.context().request.patch("/api/state", {
      headers: {
        Origin: "http://localhost:3100",
        "Content-Type": "application/json",
      },
      data: body,
    });
    expect(malformed.status()).toBe(400);
  }
  const unconfigured = await page.context().request.patch("/api/state", {
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
  await page.route("**/*.basemaps.cartocdn.com/**", (r) => r.abort());
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
    const cache = await caches.open("bodas-shell-v3");
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

test("modais mobile ocupam as laterais, ficam na base e variam de altura com o conteúdo", async ({
  page,
}) => {
  await open(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await nav(page, "Roteiro");
    await page.getByRole("button", { name: "DOM 8 NOV" }).click();
    await page.getByRole("button", { name: "Bom dia, viagem!" }).click();
    const dialog = page.locator(".details-sheet[open]");
    await expect(dialog).toBeVisible();
    const short = await dialog.boundingBox();
    expect(short!.x).toBeCloseTo(0, 0);
    expect(short!.width).toBeCloseTo(width, 0);
    expect(short!.y + short!.height).toBeCloseTo(844, 0);
    expect(short!.height).toBeLessThan(500);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    const close = dialog.getByRole("button", { name: "Fechar detalhes" });
    const closeBox = await close.boundingBox();
    expect(closeBox!.x).toBeGreaterThan(width - 80);
    await page.screenshot({ path: `/tmp/bodas-short-sheet-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.getByRole("button", { name: "SEG 16 NOV" }).click();
    await page
      .getByRole("button", { name: "A estrada de volta para casa" })
      .click();
    const long = await dialog.boundingBox();
    expect(long!.height).toBeGreaterThan(short!.height + 100);
    expect(long!.height).toBeLessThanOrEqual(844 * 0.92 + 1);
    expect(long!.y + long!.height).toBeCloseTo(844, 0);
    expect(long!.width).toBeCloseTo(width, 0);
    await dialog
      .locator(".bottom-sheet-body")
      .evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(close).toBeInViewport();
    await page.screenshot({ path: `/tmp/bodas-long-sheet-${width}.png` });
    await close.click();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  }
  await nav(page, "Mapa");
  await page.route("**/*.basemaps.cartocdn.com/**", (r) => r.abort());
  await page.getByRole("button", { name: "Ampliar", exact: true }).click();
  const mapDialog = page.locator(".expanded-map-dialog[open]");
  const box = await mapDialog.boundingBox();
  expect(box!.width).toBeCloseTo(430, 0);
  expect(box!.y + box!.height).toBeCloseTo(844, 0);
  await page.getByRole("button", { name: "Fechar mapa ilustrado" }).click();
});

test("mapa usa CARTO com atribuição, mantém zoom ao sincronizar e recupera após falha", async ({
  page,
}) => {
  await open(page);
  let unavailable = true;
  const tileRequests: string[] = [];
  await page.route("**/*.basemaps.cartocdn.com/**", (r) => {
    tileRequests.push(r.request().url());
    return unavailable
      ? r.abort()
      : r.fulfill({ path: "public/icon-192.png", contentType: "image/png" });
  });
  await nav(page, "Mapa");
  await expect(page.getByText(/O mapa de ruas não carregou/)).toBeVisible();
  await expect(page.locator(".leaflet-tile-pane img")).toHaveCount(0);
  unavailable = false;
  await page.getByRole("button", { name: "Tentar carregar o mapa" }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await expect(page.getByText(/O mapa de ruas não carregou/)).not.toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "CARTO",
  );
  expect(tileRequests.every((url) => url.includes("/light_all/"))).toBe(true);
  const header = await page.context().request.get("/");
  expect(header.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  const privateLink = await page
    .context()
    .request.get("/api/session?token=invalid");
  expect(privateLink.headers()["referrer-policy"]).toBe("no-referrer");
  const map = page.locator(".leaflet-container");
  await page.locator(".leaflet-control-zoom-in").click();
  const instance = await map.evaluate(
    (element) => (element as HTMLElement & { _leaflet_id: number })._leaflet_id,
  );
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/state") &&
      response.request().method() === "GET",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(
    await map.evaluate(
      (element) =>
        (element as HTMLElement & { _leaflet_id: number })._leaflet_id,
    ),
  ).toBe(instance);
  const marker = page.locator(".leaflet-marker-icon").nth(6);
  await marker.click();
  await expect(page.locator(".details-sheet[open]")).toBeVisible();
});

test("visual acolhedor sem header antigo, Nunito local e contrastes dos textos principais", async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByText("Olá, Cleide e Flávio!", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".app-header,.brand,.development-note"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Explorar nosso roteiro" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const typography = await page
    .getByRole("heading", { name: "O melhor caminho" })
    .evaluate((el) => ({
      font: getComputedStyle(el).fontFamily,
      weight: getComputedStyle(el).fontWeight,
      background: getComputedStyle(document.body).backgroundColor,
    }));
  expect(typography.font).toContain("Nunito");
  expect(Number(typography.weight)).toBeGreaterThanOrEqual(700);
  await page.getByRole("button", { name: "Explorar nosso roteiro" }).click();
  await expect(
    page.getByRole("heading", { name: "Nosso roteiro" }),
  ).toBeVisible();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const section of ["Hoje", "Roteiro", "Viagem"]) {
      await nav(page, section);
      expect(await page.evaluate(() => innerWidth)).toBe(width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
  const contrast = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const value = (name: string) => {
      const hex = style.getPropertyValue(name).trim().replace("#", "");
      const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const linear = rgb.map((v) =>
        v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const white = 1;
    return {
      primary: (white + 0.05) / (value("--primary") + 0.05),
      foreground: (white + 0.05) / (value("--foreground") + 0.05),
    };
  });
  expect(contrast.primary).toBeGreaterThan(4.5);
  expect(contrast.foreground).toBeGreaterThan(7);
  await nav(page, "Hoje");
  await page.screenshot({ path: "/tmp/bodas-warm-home.png", fullPage: true });
});

test("localização real do navegador exige permissão, mostra o celular e atualiza sua posição", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: -23.219,
    longitude: -44.713,
    accuracy: 35,
  });
  await open(page);
  await page.route("**/*.basemaps.cartocdn.com/**", (r) =>
    r.fulfill({ path: "public/icon-192.png", contentType: "image/png" }),
  );
  await nav(page, "Mapa");
  await expect(
    page.getByText("Nos arredores de Paraty", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".device-location-dot")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Nossa localização" }),
  ).toBeEnabled();
  const response = await page.context().request.get("/");
  expect(response.headers()["permissions-policy"]).toContain(
    "geolocation=(self)",
  );
  await context.setGeolocation({
    latitude: -20.3856,
    longitude: -43.5035,
    accuracy: 50,
  });
  await expect(
    page.getByText("Nos arredores de Ouro Preto", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".device-location-dot")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver toda a viagem no mapa" }).click();
  await page.getByRole("button", { name: "Nossa localização" }).click();
  await page.screenshot({ path: "/tmp/bodas-location-map.png" });
  await nav(page, "Roteiro");
  await expect(page.locator(".device-location-dot")).toHaveCount(0);
});

test("permissão negada, posição indisponível e timeout não impedem roteiro ou rotas", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition(
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) {
          queueMicrotask(() =>
            error({
              code: 1,
              message: "Denied",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            }),
          );
          return 1;
        },
        clearWatch() {},
      },
    });
  });
  await open(page);
  await page.route("**/*.basemaps.cartocdn.com/**", (r) => r.abort());
  await nav(page, "Mapa");
  await expect(page.getByText(/A localização não foi permitida/)).toBeVisible();
  await expect(page.locator(".device-location-dot")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Localizar vocês" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition(
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) {
          queueMicrotask(() =>
            error({
              code: 3,
              message: "Timeout",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            }),
          );
          return 2;
        },
        clearWatch() {},
      },
    });
  });
  await page.getByRole("button", { name: "Localizar vocês" }).click();
  await expect(page.getByText(/A posição está demorando/)).toBeVisible();
  await nav(page, "Roteiro");
  await page
    .getByRole("button", { name: "BH → Ouro Preto", exact: true })
    .click();
  await expect(
    page
      .locator(".details-sheet[open]")
      .getByRole("link", { name: "Abrir rota no Google Maps" }),
  ).toBeVisible();
});
