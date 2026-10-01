import { eventOverrides } from "./customize";
import { cities } from "./places";
import type { EventType, TripDay, TripEvent, Route } from "./types";
// TODO DUDA: inserir pousadas de Tiradentes, São Lourenço, Cunha e Paraty, com reservas e fotos.
// TODO DUDA: inserir restaurantes, especialmente o jantar das Bodas.
// TODO DUDA: confirmar horário/reserva da escuna, complexo de cachoeiras e praia de 14/11.
// TODO DUDA: inserir pontos OFICIAIS de retirada/carimbo em todas as cidades; nenhum foi inventado.
// TODO DUDA: adicionar endereços e coordenadas verificadas dos estabelecimentos em locations.
type Row = [
  time: string,
  title: string,
  type: EventType,
  description?: string,
  city?: string,
  route?: Route,
];
const drive = (
  origin: string,
  destination: string,
  estimatedDuration?: string,
  waypoints?: string[],
): Route => ({ origin, destination, estimatedDuration, waypoints });
const name = (key: string) =>
  `${cities[key].city}, ${cities[key].state}, Brasil`;
const route = (a: string, b: string, duration?: string) =>
  drive(name(a), name(b), duration);
const returnRoute: Route = {
  ...route("paraty", "bh", "Chegada estimada entre 20h30 e 21h30"),
  waypoints: [
    "Angra dos Reis, RJ",
    "Barra Mansa, RJ",
    "Volta Redonda, RJ",
    "Três Rios, RJ",
    "Juiz de Fora, MG",
    "Barbacena, MG",
    "Conselheiro Lafaiete, MG",
  ],
  segments: [
    drive(name("paraty"), name("tresrios"), undefined, [
      "Angra dos Reis, RJ",
      "Barra Mansa, RJ",
      "Volta Redonda, RJ",
    ]),
    drive(name("tresrios"), name("bh"), undefined, [
      "Juiz de Fora, MG",
      "Barbacena, MG",
      "Conselheiro Lafaiete, MG",
    ]),
  ],
};
function day(
  n: number,
  title: string,
  subtitle: string,
  city: string,
  rows: Row[],
): TripDay {
  const dayId = `day-${n}`;
  return {
    id: dayId,
    date: `2026-11-${String(n).padStart(2, "0")}`,
    title,
    subtitle,
    city: cities[city].city,
    events: rows.map(
      (
        [time, eventTitle, type, description, placeKey, eventRoute],
        i,
      ): TripEvent => {
        const [startTime, endTime] = time.split("–");
        const key = placeKey ?? city;
        const base = cities[key];
        return {
          id: `${dayId}-${i + 1}`,
          dayId,
          type,
          title: eventTitle,
          description: description ?? "",
          startTime,
          endTime,
          approximateTime: type !== "special",
          important: type === "special" || type === "boat",
          location: ["route", "preparation", "rest"].includes(type)
            ? undefined
            : {
                name: [
                  "restaurant",
                  "accommodation",
                  "stamp",
                  "special",
                  "boat",
                  "stop",
                  "beach",
                ].includes(type)
                  ? "A definir"
                  : eventTitle,
                city: base.city,
                state: base.state,
                ...(["city"].includes(type)
                  ? {
                      name: base.name,
                      latitude: base.latitude,
                      longitude: base.longitude,
                    }
                  : {}),
              },
          route: eventRoute,
          allowPhotoUpload: !["preparation", "rest"].includes(type),
          ...(type === "stamp"
            ? {
                stampPlace: {
                  verified: false,
                  name: null,
                  address: null,
                  mapsUrl: null,
                },
                notes: [
                  "Local do carimbo a confirmar. Confirmem o ponto oficial e o funcionamento antes de ir.",
                ],
              }
            : {}),
          ...(type === "accommodation"
            ? {
                accommodation: {
                  checkIn: n === 12 ? "12/11 após 15h" : undefined,
                  checkOut:
                    n === 12 ? "16/11 até 10h — a confirmar" : undefined,
                },
              }
            : {}),
        };
      },
    ),
  };
}
export const days: TripDay[] = [
  day(
    8,
    "A estrada começa aqui",
    "Belo Horizonte → Ouro Preto → Congonhas → Tiradentes",
    "tiradentes",
    [
      ["08:00", "Bom dia, viagem!", "preparation", "Acordar com calma.", "bh"],
      [
        "08:00–09:15",
        "Café, malas e organização",
        "preparation",
        "Conferir documentos, reservas e carregadores.",
        "bh",
      ],
      [
        "09:30",
        "BH → Ouro Preto",
        "route",
        "A primeira estrada desta jornada.",
        "bh",
        route("bh", "ouro", "1h40–2h"),
      ],
      [
        "11:15",
        "Chegada a Ouro Preto",
        "city",
        "Um encontro com as ladeiras e a história de Minas.",
        "ouro",
      ],
      [
        "11:15–13:15",
        "Passeio por Ouro Preto",
        "attraction",
        "Praça Tiradentes, pequena caminhada e igreja ou atração disponível.",
        "ouro",
      ],
      [
        "11:15",
        "Retirar passaporte e primeiro carimbo",
        "stamp",
        "Retirada e carimbo em ponto oficial ainda a confirmar.",
        "ouro",
      ],
      [
        "13:15–14:15",
        "Almoço em Ouro Preto",
        "restaurant",
        "Restaurante a definir.",
        "ouro",
      ],
      [
        "14:15",
        "Ouro Preto → Congonhas",
        "route",
        "",
        "ouro",
        route("ouro", "congonhas"),
      ],
      [
        "15:20–16:30",
        "Os Profetas de Congonhas",
        "attraction",
        "Santuário do Bom Jesus de Matosinhos e os Profetas.",
        "congonhas",
      ],
      [
        "16:00",
        "Carimbo em Congonhas",
        "stamp",
        "Se for conveniente e o ponto estiver aberto.",
        "congonhas",
      ],
      [
        "16:30–16:45",
        "Congonhas → Tiradentes",
        "route",
        "",
        "congonhas",
        route("congonhas", "tiradentes"),
      ],
      [
        "18:30–19:00",
        "Chegada e check-in",
        "accommodation",
        "Pousada em Tiradentes a definir.",
      ],
      [
        "20:30",
        "Jantar e Centro Histórico",
        "restaurant",
        "Uma caminhada tranquila para encerrar o primeiro dia.",
      ],
    ],
  ),
  day(
    9,
    "Entre igrejas e ateliês",
    "Tiradentes → São João del-Rei → Bichinho",
    "tiradentes",
    [
      ["08:00", "Acordar sem pressa", "preparation"],
      ["08:30–09:30", "Café da manhã", "preparation"],
      [
        "10:00–11:30",
        "Os encantos de Tiradentes",
        "attraction",
        "Matriz de Santo Antônio, Largo das Forras, Rua Direita, igrejas e fotos.",
      ],
      ["11:00", "Carimbo em Tiradentes", "stamp"],
      [
        "11:30–12:30",
        "Passeio e lojas",
        "attraction",
        "Tempo livre para descobrir as ruas.",
      ],
      ["12:30–13:45", "Almoço", "restaurant", "Restaurante a definir."],
      [
        "14:00",
        "Tiradentes → São João del-Rei",
        "route",
        "",
        undefined,
        route("tiradentes", "saojoao"),
      ],
      [
        "14:30–16:15",
        "São João del-Rei",
        "attraction",
        "Igreja de São Francisco de Assis, Centro Histórico e pontes.",
        "saojoao",
      ],
      ["15:30", "Carimbo em São João del-Rei", "stamp", "", "saojoao"],
      [
        "16:15",
        "São João del-Rei → Bichinho",
        "route",
        "",
        "saojoao",
        route("saojoao", "bichinho"),
      ],
      [
        "16:45–18:00",
        "Uma tarde em Bichinho",
        "city",
        "Artesanato, ateliês, decoração e café.",
        "bichinho",
      ],
      [
        "18:30",
        "Voltar para a pousada",
        "route",
        "",
        "bichinho",
        route("bichinho", "tiradentes"),
      ],
      ["20:00", "Jantar em Tiradentes", "restaurant", "Restaurante a definir."],
    ],
  ),
  day(
    10,
    "Água, serra e novos caminhos",
    "Tiradentes → Carrancas → São Lourenço",
    "saolourenco",
    [
      ["08:00", "Acordar", "preparation"],
      ["08:30–09:30", "Café da manhã", "preparation"],
      ["09:30–10:00", "Malas e check-out", "preparation", "", "tiradentes"],
      [
        "10:00",
        "Tiradentes → Carrancas",
        "route",
        "",
        "tiradentes",
        route("tiradentes", "carrancas"),
      ],
      ["11:45", "Chegada a Carrancas", "city", "", "carrancas"],
      [
        "12:00–13:00",
        "Almoço em Carrancas",
        "restaurant",
        "Restaurante a definir.",
        "carrancas",
      ],
      [
        "13:15–15:30",
        "Um complexo de cachoeiras",
        "attraction",
        "Complexo a definir. Escolher conforme clima, acesso e disposição.",
        "carrancas",
      ],
      [
        "16:00",
        "Carrancas → São Lourenço",
        "route",
        "Cruzília: parada opcional para carimbo, se conveniente e aberto.",
        "carrancas",
        route("carrancas", "saolourenco"),
      ],
      [
        "16:45",
        "Cruzília, se der vontade",
        "stamp",
        "Parada opcional. Ponto oficial e horário a confirmar.",
        "saolourenco",
      ],
      [
        "18:30–19:00",
        "Chegada e check-in",
        "accommodation",
        "Hospedagem em São Lourenço a definir.",
      ],
      ["20:00", "Jantar", "restaurant", "Restaurante a definir."],
    ],
  ),
  day(
    11,
    "Da Mantiqueira às cerâmicas",
    "São Lourenço → Passa Quatro → Guaratinguetá → Cunha",
    "cunha",
    [
      ["08:00", "Acordar", "preparation"],
      ["08:30–09:30", "Café", "preparation"],
      ["09:30–10:00", "Check-out", "preparation", "", "saolourenco"],
      [
        "10:00–11:45",
        "Parque das Águas",
        "attraction",
        "Uma manhã para passear com calma.",
        "saolourenco",
      ],
      [
        "12:00",
        "São Lourenço → Passa Quatro",
        "route",
        "",
        "saolourenco",
        route("saolourenco", "passaquatro"),
      ],
      ["13:00", "Chegada a Passa Quatro", "city", "", "passaquatro"],
      [
        "13:00–14:15",
        "Almoço e centro",
        "restaurant",
        "Restaurante a definir; caminhada pelo centro.",
        "passaquatro",
      ],
      ["14:00", "Carimbo em Passa Quatro", "stamp", "", "passaquatro"],
      [
        "14:15",
        "Passa Quatro → Guaratinguetá",
        "route",
        "",
        "passaquatro",
        route("passaquatro", "guaratingueta"),
      ],
      [
        "15:30–16:00",
        "Pausa em Guaratinguetá",
        "stop",
        "Café, banheiro e uma pausa curta.",
        "guaratingueta",
      ],
      ["16:00", "Carimbo em Guaratinguetá", "stamp", "", "guaratingueta"],
      [
        "16:00–16:30",
        "Guaratinguetá → Cunha",
        "route",
        "",
        "guaratingueta",
        route("guaratingueta", "cunha"),
      ],
      [
        "17:15–18:00",
        "Chegada e check-in",
        "accommodation",
        "Hospedagem em Cunha a definir.",
      ],
      [
        "18:30–19:30",
        "Centro, lojas e cerâmicas",
        "attraction",
        "Ateliês a definir.",
      ],
      ["20:00", "Jantar em Cunha", "restaurant", "Restaurante a definir."],
    ],
  ),
  day(
    12,
    "A serra encontra o mar",
    "Cunha → Paraty · Serra da Bocaina",
    "paraty",
    [
      ["08:00", "Acordar", "preparation"],
      ["08:30–09:30", "Café", "preparation"],
      ["10:00", "Check-out", "preparation", "", "cunha"],
      [
        "10:00–12:00",
        "Mais um pouco de Cunha",
        "attraction",
        "Ateliês de cerâmica, centro, Igreja Matriz, lojas e café.",
        "cunha",
      ],
      [
        "12:00–13:00",
        "Almoço",
        "restaurant",
        "Restaurante a definir.",
        "cunha",
      ],
      [
        "13:15",
        "Cunha → Paraty",
        "route",
        "Pela Serra da Bocaina, com espaço para parar nos mirantes.",
        "cunha",
        route("cunha", "paraty"),
      ],
      [
        "15:30–16:00",
        "Nossa pousada em Paraty",
        "accommodation",
        "Hospedagem a definir. Base para os próximos dias.",
      ],
      ["16:00–17:00", "Tempo de descansar", "rest"],
      [
        "17:00–19:30",
        "Primeiro encontro com Paraty",
        "attraction",
        "Centro Histórico, cais, Igreja de Santa Rita, Praça da Matriz e lojas.",
      ],
      ["20:00", "Jantar", "restaurant", "Restaurante a definir."],
    ],
  ),
  day(13, "Um dia no azul do mar", "Passeio de escuna em Paraty", "paraty", [
    ["08:00", "Acordar", "preparation"],
    ["08:30–09:30", "Café", "preparation"],
    [
      "09:30–10:15",
      "Preparar e caminhar ao cais",
      "preparation",
      "Levar o necessário para um dia de barco.",
    ],
    [
      "10:30",
      "Embarque — a confirmar",
      "boat",
      "Cais, operador e horário conforme reserva, ainda a confirmar.",
    ],
    [
      "11:00–16:00",
      "Passeio de escuna",
      "boat",
      "Horário provisório. Confirmar com a reserva antes do passeio.",
    ],
    ["16:00–16:30", "Retorno do passeio", "stop"],
    ["17:00–19:00", "Descanso", "rest"],
    ["19:30", "Centro Histórico", "attraction"],
    ["20:00–20:30", "Jantar", "restaurant", "Restaurante a definir."],
  ]),
  day(
    14,
    "25 anos, tantos caminhos",
    "Um dia para celebrar Cleide e Flávio",
    "paraty",
    [
      ["08:30", "Acordar juntos, sem pressa", "preparation"],
      ["09:00–10:00", "Café da manhã", "preparation"],
      [
        "10:30–13:30",
        "Uma praia tranquila",
        "beach",
        "Praia a definir. O melhor lugar é aquele onde vocês se sentirem bem.",
      ],
      ["13:30–14:30", "Almoço", "restaurant", "Restaurante a definir."],
      ["15:00–17:30", "Descanso na pousada", "rest"],
      [
        "18:00–19:30",
        "Centro Histórico e fotos",
        "attraction",
        "Guardar um pouco deste dia tão especial.",
      ],
      ["19:30", "Um drink ou café", "restaurant", "Local a definir."],
      [
        "20:30",
        "Jantar das Bodas",
        "special",
        "Uma noite para celebrar 25 anos de vida juntos. Restaurante a definir.",
      ],
    ],
  ),
  day(
    15,
    "O último dia tem gosto de praia",
    "Paraty → Trindade → Paraty",
    "paraty",
    [
      ["08:00", "Acordar", "preparation"],
      ["08:30–09:15", "Café", "preparation"],
      [
        "09:30",
        "Paraty → Trindade",
        "route",
        "",
        undefined,
        route("paraty", "trindade"),
      ],
      ["10:15", "Chegada a Trindade", "city", "", "trindade"],
      ["10:30–12:00", "Praia do Meio", "beach", "", "trindade"],
      ["12:00–13:30", "Praia e Cachadaço", "beach", "", "trindade"],
      [
        "13:30–14:30",
        "Almoço",
        "restaurant",
        "Restaurante a definir.",
        "trindade",
      ],
      [
        "14:30–16:30",
        "Praia ou piscina natural",
        "beach",
        "Piscina Natural do Cachadaço, dependendo do clima, condições e disposição.",
        "trindade",
      ],
      [
        "17:00",
        "Trindade → Paraty",
        "route",
        "",
        "trindade",
        route("trindade", "paraty"),
      ],
      ["18:00", "Voltar à pousada", "rest"],
      [
        "20:00",
        "Último jantar em Paraty",
        "restaurant",
        "Restaurante a definir.",
      ],
      ["21:30", "Organizar as malas", "preparation"],
    ],
  ),
  day(
    16,
    "De volta, com novas memórias",
    "Paraty → Angra → Vale do Paraíba → Belo Horizonte",
    "bh",
    [
      ["08:00", "Acordar", "preparation", "", "paraty"],
      ["08:00–09:00", "Café", "preparation", "", "paraty"],
      ["09:00–09:30", "Check-out e carro", "preparation", "", "paraty"],
      [
        "09:30",
        "A estrada de volta para casa",
        "route",
        "Paraty → Angra dos Reis → Barra Mansa / Volta Redonda → Três Rios → Juiz de Fora → Barbacena → Conselheiro Lafaiete → Belo Horizonte.",
        "paraty",
        returnRoute,
      ],
      [
        "11:30",
        "Uma pausa no caminho",
        "stop",
        "Local a escolher durante a viagem.",
      ],
      [
        "14:00",
        "Almoço de estrada",
        "restaurant",
        "Local a escolher durante a viagem.",
      ],
      ["17:30", "Café e banheiro", "stop", "Mais uma pausa tranquila."],
      [
        "20:30–21:30",
        "Chegada a Belo Horizonte",
        "city",
        "A viagem termina. As memórias ficam.",
        "bh",
      ],
    ],
  ),
];
// Correct city-only optional stop, without inventing an official establishment.
const cruzilia = days[2].events.find(
  (e) => e.title === "Cruzília, se der vontade",
);
if (cruzilia?.location)
  cruzilia.location = { name: "A definir", city: "Cruzília", state: "MG" };
// Local overrides keep all still-unknown bookings explicit and easy to fill.
// TODO DUDA: use data/customize.ts to add establishments, addresses, photos and reservations.
for (const d of days)
  for (const e of d.events) {
    if (e.type === "attraction" && e.location)
      e.location.name =
        e.title === "Parque das Águas"
          ? "Parque das Águas"
          : e.title === "Os Profetas de Congonhas"
            ? "Santuário do Bom Jesus de Matosinhos"
            : `Centro Histórico de ${e.location.city}`;
    if (e.title === "Um complexo de cachoeiras" && e.location)
      e.location.name = "A definir";
    if (e.title === "Praia do Meio" && e.location)
      e.location.name = "Praia do Meio";
    if (
      (e.title === "Praia e Cachadaço" ||
        e.title === "Praia ou piscina natural") &&
      e.location
    )
      e.location.name = "Praia do Cachadaço";
    const override = eventOverrides[e.id];
    if (override) Object.assign(e, override);
  }
export const events = days.flatMap((d) => d.events);
export const eventById = new Map(events.map((e) => [e.id, e]));
