import test from "node:test";
import assert from "node:assert/strict";
import { days, events } from "../data/events";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
} from "../lib/maps";
import { localDate, tripPhase, activeDay, nextEvent } from "../lib/time";
test("nove dias consecutivos, IDs únicos, eventos em ordem e todos os carimbos não inventados", () => {
  assert.equal(days.length, 9);
  assert.equal(new Set(events.map((e) => e.id)).size, events.length);
  for (const [i, d] of days.entries()) {
    assert.equal(d.date, `2026-11-${String(i + 8).padStart(2, "0")}`);
    assert.ok(d.events.length > 0);
    let previous = "00:00";
    for (const e of d.events) {
      assert.equal(e.dayId, d.id);
      assert.ok(e.startTime >= previous, `${e.id} fora de ordem`);
      previous = e.startTime;
      if (e.type === "stamp") {
        assert.equal(e.stampPlace?.verified, false);
        assert.equal(e.stampPlace.name, null);
      }
    }
  }
});
test("fuso explícito de São Paulo nas viradas e fases", () => {
  assert.equal(localDate(new Date("2026-11-08T02:59:00Z")), "2026-11-07");
  assert.equal(localDate(new Date("2026-11-08T03:00:00Z")), "2026-11-08");
  assert.equal(tripPhase("2026-11-07"), "before");
  assert.equal(tripPhase("2026-11-16"), "during");
  assert.equal(tripPhase("2026-11-17"), "after");
  assert.equal(activeDay(days, "2026-11-14").id, "day-14");
});
test("próximo é calculado; concluídos não desaparecem e desfazer restaura próximo", () => {
  const first = days[0].events[0];
  assert.equal(nextEvent(days[0].events, {})?.id, first.id);
  assert.equal(
    nextEvent(days[0].events, { [first.id]: true })?.id,
    days[0].events[1].id,
  );
  assert.equal(nextEvent(days[0].events, { [first.id]: false })?.id, first.id);
  assert.equal(
    nextEvent(
      days[0].events,
      Object.fromEntries(days[0].events.map((e) => [e.id, true])),
    ),
    undefined,
  );
});
test("URLs oficiais: rota fixa com encoding e destino sem origem", () => {
  const url = new URL(
    buildGoogleMapsDirectionsUrl({
      origin: "Belo Horizonte, MG",
      destination: "Ouro Preto, MG",
      waypoints: ["A & B"],
    }),
  );
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("origin"), "Belo Horizonte, MG");
  assert.equal(url.searchParams.get("waypoints"), "A & B");
  const place = new URL(
    buildGoogleMapsPlaceUrl({
      name: "Matriz",
      city: "Tiradentes",
      state: "MG",
    }),
  );
  assert.equal(place.searchParams.has("origin"), false);
  assert.ok(place.searchParams.get("query")?.includes("Tiradentes"));
});
test("volta preserva TODAS as cidades em trechos com no máximo 3 waypoints mobile", () => {
  const route = days[8].events.find((e) => e.route)!.route!;
  assert.equal(route.segments!.length, 2);
  assert.equal(route.segments![0].destination, route.segments![1].origin);
  const stops = route
    .segments!.flatMap((s, i) => {
      assert.ok((s.waypoints?.length ?? 0) <= 3);
      return [
        ...(i === 0 ? [s.origin] : []),
        ...(s.waypoints ?? []),
        s.destination,
      ];
    })
    .map((s) => s.split(",")[0]);
  assert.deepEqual(stops, [
    "Paraty",
    "Angra dos Reis",
    "Barra Mansa",
    "Volta Redonda",
    "Três Rios",
    "Juiz de Fora",
    "Barbacena",
    "Conselheiro Lafaiete",
    "Belo Horizonte",
  ]);
});
test("Bodas e escuna têm destaque e restaurante ainda não inventado", () => {
  const dinner = days[6].events.find((e) => e.type === "special")!;
  assert.equal(dinner.startTime, "20:30");
  assert.equal(dinner.important, true);
  assert.equal(dinner.location?.name, "A definir");
  assert.ok(
    days[5].events.filter((e) => e.type === "boat").every((e) => e.important),
  );
});
