import test from "node:test";
import assert from "node:assert/strict";
import { nearbyCity, validPosition } from "../lib/geolocation";
const location = {
  latitude: -23.219,
  longitude: -44.713,
  accuracy: 40,
  timestamp: Date.now(),
};
test("posição próxima identifica a cidade; longe do roteiro ou sem precisão não inventa cidade", () => {
  assert.equal(nearbyCity(location), "Paraty");
  assert.equal(
    nearbyCity({ ...location, latitude: 0, longitude: 0 }),
    undefined,
  );
  assert.equal(nearbyCity({ ...location, accuracy: 50000 }), undefined);
});
test("coordenadas e margem de precisão inválidas não viram pins", () => {
  const asGeo = (latitude: number, longitude: number, accuracy: number) =>
    ({
      coords: { latitude, longitude, accuracy },
      timestamp: 123,
    }) as GeolocationPosition;
  assert.deepEqual(validPosition(asGeo(-23.219, -44.713, 50)), {
    latitude: -23.219,
    longitude: -44.713,
    accuracy: 50,
    timestamp: 123,
  });
  for (const invalid of [
    asGeo(NaN, 0, 50),
    asGeo(91, 0, 50),
    asGeo(0, -181, 50),
    asGeo(0, 0, -2),
  ])
    assert.equal(validPosition(invalid), null);
});
