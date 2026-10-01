"use client";
import { cities, journey, returnJourney } from "@/data/places";
const x = (lon: number) => 52 + ((lon + 45.3) / 2.3) * 490;
const y = (lat: number) => 38 + ((-19.85 - lat) / 3.6) * 590;
const offsets: Record<string, [number, number]> = {
  bh: [12, -9],
  ouro: [12, -8],
  congonhas: [-10, 19],
  tiradentes: [-14, -12],
  saojoao: [-14, 19],
  bichinho: [14, -18],
  carrancas: [10, -7],
  saolourenco: [-10, -9],
  passaquatro: [12, 0],
  guaratingueta: [-10, 19],
  cunha: [-10, 19],
  paraty: [14, -6],
  trindade: [14, 15],
};
const path = (keys: string[]) =>
  keys
    .map(
      (key, i) =>
        `${i ? "L" : "M"} ${x(cities[key].longitude!)} ${y(cities[key].latitude!)}`,
    )
    .join(" ");
export default function IllustratedRouteMap({
  onCity,
}: {
  onCity?: (key: string) => void;
}) {
  return (
    <svg
      className="illustrated-map"
      viewBox="0 0 630 680"
      role={onCity ? "group" : "img"}
      aria-label="Mapa ilustrado: Belo Horizonte, cidades históricas de Minas, Cunha, Paraty, Trindade e retorno por Angra e Juiz de Fora"
    >
      <defs>
        <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".7" fill="#ddd8d0" />
        </pattern>
      </defs>
      <rect width="630" height="680" fill="white" />
      <rect width="630" height="680" fill="url(#dots)" opacity=".65" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M ${40 + i * 11} 190 Q ${170 + i * 16} 80 ${280 + i * 15} 280 T ${420 + i * 16} 530`}
          fill="none"
          stroke="#e5e8de"
          strokeWidth="1.3"
        />
      ))}
      <path
        d="M 470 450 Q 410 510 360 550 Q 400 640 610 640 L 630 440"
        fill="#eef2ed"
      />
      <text
        x="490"
        y="590"
        fill="#68705c"
        fontSize="13"
        letterSpacing="3"
        transform="rotate(-18 490 590)"
      >
        OCEANO ATLÂNTICO
      </text>
      <text x="70" y="105" className="map-region">
        MINAS GERAIS
      </text>
      <text x="30" y="515" className="map-region">
        SÃO PAULO
      </text>
      <text x="440" y="420" className="map-region">
        RIO DE JANEIRO
      </text>
      <path
        d={path(returnJourney)}
        fill="none"
        stroke="#a2aa98"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
      <path
        d={path(journey)}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {Array.from(new Set(journey)).map((key) => {
        const place = cities[key];
        const [dx, dy] = offsets[key] ?? [10, -9];
        return (
          <g
            key={key}
            role={onCity ? "button" : undefined}
            tabIndex={onCity ? 0 : undefined}
            onClick={() => onCity?.(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCity?.(key);
              }
            }}
            aria-label={`Ver ${place.name}`}
            className={onCity ? "map-point" : ""}
          >
            <circle
              cx={x(place.longitude!)}
              cy={y(place.latitude!)}
              r="22"
              fill="transparent"
            />
            <circle
              cx={x(place.longitude!)}
              cy={y(place.latitude!)}
              r={key === "bh" || key === "paraty" ? 7 : 4.5}
              fill="white"
              stroke="var(--primary)"
              strokeWidth="2.5"
            />
            <text
              x={x(place.longitude!) + dx}
              y={y(place.latitude!) + dy}
              textAnchor={dx < 0 ? "end" : "start"}
              fontSize="12"
              fontWeight={key === "bh" || key === "paraty" ? 700 : 500}
              fill="var(--foreground)"
              paintOrder="stroke"
              stroke="white"
              strokeWidth="4"
            >
              {place.name}
            </text>
          </g>
        );
      })}
      <g transform="translate(560 50)">
        <path d="M 0 0 L -7 23 L 0 18 L 7 23 Z" fill="var(--primary)" />
        <text x="0" y="-9" textAnchor="middle" fontSize="11">
          N
        </text>
      </g>
      <text x="48" y="652" fontSize="11" fill="#686258">
        — ida pela Estrada Real
      </text>
      <text x="315" y="652" fontSize="11" fill="#686258">
        ··· volta por Angra · geografia simplificada
      </text>
    </svg>
  );
}
