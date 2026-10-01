"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Compass,
  Heart,
  Map,
  MapPin,
  Route,
  Stamp,
  Sun,
  WifiOff,
  X,
} from "lucide-react";
import { days, events } from "@/data/events";
import { preparation, trip } from "@/data/trip";
import type { TripEvent, Photo, SharedState } from "@/data/types";
import {
  activeDay,
  countdown,
  localDate,
  nextEvent,
  tripPhase,
} from "@/lib/time";
import EventCard, { CompletionButton } from "./EventCard";
import IllustratedRouteMap from "./IllustratedRouteMap";
import Onboarding from "./Onboarding";
import PlaceDetails from "./PlaceDetails";
import { PhotoGallery } from "./PhotoGallery";
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">O mapa está chegando…</div>,
});
type Tab = "today" | "itinerary" | "map" | "trip";
const weekdays = [
  "DOM",
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB",
  "DOM",
  "SEG",
];
export default function TravelApp({
  authorized,
  sharedConfigured,
  driveConfigured,
}: {
  authorized: boolean;
  sharedConfigured: boolean;
  driveConfigured: boolean;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(trip.start);
  const [dayIndex, setDayIndex] = useState(0);
  const [onboarding, setOnboarding] = useState(false);
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<SharedState>({
    checks: {},
    photos: [],
    configured: sharedConfigured,
    photosConfigured: driveConfigured,
  });
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const pendingRef = useRef(new Set<string>());
  const generation = useRef(0);
  const [message, setMessage] = useState("");
  const [sync, setSync] = useState<"loading" | "ok" | "error" | "unconfigured">(
    authorized ? "loading" : "unconfigured",
  );
  const [selected, setSelected] = useState<TripEvent | null>(null);
  const [expandedMap, setExpandedMap] = useState(false);
  const [tripSection, setTripSection] = useState<
    "preparation" | "stays" | "memories" | "info"
  >("preparation");
  useEffect(() => {
    const refreshDate = () => {
      const d = localDate();
      setDate(d);
    };
    const d = localDate();
    // Device-only welcome flag is read after hydration; private state stays on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(d);
    setDayIndex(days.indexOf(activeDay(days, d)));
    try {
      setOnboarding(localStorage.getItem("bodas-welcome") !== "done");
    } catch {
      setOnboarding(true);
    }
    const onlineChange = () => setOnline(navigator.onLine);
    onlineChange();
    window.addEventListener("online", onlineChange);
    window.addEventListener("offline", onlineChange);
    const interval = setInterval(refreshDate, 60000);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onlineChange);
      window.removeEventListener("offline", onlineChange);
    };
  }, []);
  const synchronize = useCallback(async () => {
    if (!authorized || pendingRef.current.size) return;
    const version = generation.current;
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (version === generation.current && !pendingRef.current.size) {
        setState(data);
        setSync(data.configured ? "ok" : "unconfigured");
      }
    } catch {
      setSync("error");
    }
  }, [authorized]);
  useEffect(() => {
    queueMicrotask(() => void synchronize());
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void synchronize();
    }, 12000);
    const onFocus = () => void synchronize();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [synchronize]);
  async function toggle(id: string) {
    if (pendingRef.current.has(id)) return;
    if (!authorized || !state.configured) {
      setMessage(
        "Os checks compartilhados precisam ser configurados pela Duda.",
      );
      return;
    }
    if (!navigator.onLine) {
      setMessage("Sem sinal agora. Tente marcar quando a conexão voltar.");
      return;
    }
    const previous = Boolean(state.checks[id]);
    pendingRef.current.add(id);
    generation.current++;
    setPending((p) => ({ ...p, [id]: true }));
    setState((s) => ({ ...s, checks: { ...s.checks, [id]: !previous } }));
    try {
      const response = await fetch("/api/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !previous }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
    } catch {
      setState((s) => ({ ...s, checks: { ...s.checks, [id]: previous } }));
      setMessage(
        "Não conseguimos guardar o check. Ele voltou como estava. Tente novamente.",
      );
    } finally {
      pendingRef.current.delete(id);
      generation.current++;
      setPending((p) => ({ ...p, [id]: false }));
    }
  }
  function finishWelcome() {
    try {
      localStorage.setItem("bodas-welcome", "done");
    } catch {}
    setOnboarding(false);
  }
  function navigate(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const select = useCallback((event: TripEvent) => setSelected(event), []);
  const uploaded = (p: Photo) => {
    generation.current++;
    setState((s) => ({
      ...s,
      photos: s.photos.some((x) => x.id === p.id) ? s.photos : [...s.photos, p],
    }));
  };
  const deleted = (id: string) => {
    generation.current++;
    setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
  };
  const phase = tripPhase(date);
  const today = activeDay(days, date);
  const currentIndex = days.indexOf(today);
  const currentDay = days[dayIndex];
  const next = nextEvent(today.events, state.checks);
  const completedLocations = today.events.filter(
    (e) => state.checks[e.id] && (e.location || e.route),
  );
  const lastPlace = completedLocations.at(-1);
  const plannedCity =
    lastPlace?.route?.destination.split(",")[0] ??
    lastPlace?.location?.city ??
    today.events.find((e) => e.route)?.route?.origin.split(",")[0] ??
    today.city;

  const finished = events.filter((e) => state.checks[e.id]).length;
  const dayFinished = currentDay.events.filter(
    (e) => state.checks[e.id],
  ).length;

  return (
    <>
      {onboarding && <Onboarding onFinish={finishWelcome} />}
      <div className="app-shell" inert={onboarding}>
        <header className="app-header">
          <button
            className="brand"
            onClick={() => navigate("today")}
            aria-label="Bodas de Prata, início"
          >
            <span className="brand-mark">
              25<span>ANOS</span>
            </span>
            <span>
              Bodas de Prata<small>CLEIDE & FLÁVIO</small>
            </span>
          </button>
          <span className="header-date">
            08—16 NOV<small>2026</small>
          </span>
        </header>
        {!authorized && (
          <div className="development-note">
            Prévia do roteiro · checks e fotos precisam do acesso privado.
          </div>
        )}
        {!online && (
          <div className="connection-banner" role="status">
            <WifiOff size={17} /> Sem sinal. Aproveitem o roteiro; sincronizamos
            ao reconectar.
          </div>
        )}
        {sync === "error" && online && (
          <div className="connection-banner">
            Não conseguimos atualizar os checks e fotos.
            <button onClick={() => void synchronize()}>Tentar novamente</button>
          </div>
        )}
        <main id="main-content">
          {tab === "today" && (
            <>
              <section className="hero">
                <img
                  src="/journey.svg"
                  alt="Ilustração de casarios históricos e uma igreja entre as serras de Minas"
                />
                <div className="hero-shade" />
                <div className="hero-copy">
                  <span className="eyebrow">
                    DA SERRA AO MAR · ESTRADA REAL
                  </span>
                  <h1>
                    O melhor caminho
                    <br />é ao seu lado.
                  </h1>
                  <p>Cleide & Flávio · 25 anos juntos</p>
                </div>
                <span className="hero-stamp">
                  MINAS
                  <br />
                  <span>↓</span>
                  <br />
                  PARATY
                </span>
              </section>
              <div className="page-body">
                <div className="greeting-line">
                  <span>
                    <Sun size={17} />
                    {phase === "before"
                      ? "Nossa viagem está chegando"
                      : phase === "after"
                        ? "Memórias de uma linda viagem"
                        : new Intl.DateTimeFormat("pt-BR", {
                            timeZone: trip.timezone,
                            day: "numeric",
                            month: "long",
                          }).format(new Date(date + "T12:00:00-03:00"))}
                  </span>
                  <span className="quiet-tag">
                    {phase === "before"
                      ? `Faltam ${countdown(date)} dias`
                      : phase === "after"
                        ? "9 dias de história"
                        : `Dia ${currentIndex + 1} de 9`}
                  </span>
                </div>
                <h2 className="home-title">
                  {phase === "before"
                    ? "Vamos preparar a estrada?"
                    : phase === "after"
                      ? "A estrada fica na memória."
                      : `Hoje, ${plannedCity}.`}
                </h2>
                <p className="muted">
                  {phase === "before"
                    ? "Tudo organizado para vocês irem sem pressa."
                    : phase === "after"
                      ? "Revisitem os lugares e os momentos que guardaram juntos."
                      : today.title}
                </p>
                {phase === "before" ? (
                  <button
                    className="preparation-cta"
                    onClick={() => {
                      setTripSection("preparation");
                      navigate("trip");
                    }}
                  >
                    <span className="round-icon">
                      <Check size={21} />
                    </span>
                    <span>
                      <strong>Antes de pegar a estrada</strong>
                      <small>Documentos, reservas e pequenos cuidados</small>
                    </span>
                    <ChevronRight size={19} />
                  </button>
                ) : phase === "after" ? (
                  <button
                    className="preparation-cta"
                    onClick={() => {
                      setTripSection("memories");
                      navigate("trip");
                    }}
                  >
                    <Camera size={24} />
                    <span>
                      <strong>Memórias da viagem</strong>
                      <small>{state.photos.length} fotos guardadas</small>
                    </span>
                    <ChevronRight />
                  </button>
                ) : null}
                <div className="trip-progress">
                  <div>
                    <span>Nosso caminho</span>
                    <strong>
                      {finished} de {events.length} momentos
                    </strong>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{ width: `${(finished / events.length) * 100}%` }}
                    />
                  </div>
                  <p>Um check para cada lembrança vivida.</p>
                </div>
                {phase !== "after" && (
                  <>
                    <div className="section-heading">
                      <h3>
                        {phase === "before"
                          ? "O primeiro dia"
                          : "O que vem a seguir"}
                      </h3>
                      <button
                        className="text-button"
                        onClick={() => {
                          setDayIndex(currentIndex);
                          navigate("itinerary");
                        }}
                      >
                        Ver o dia <ArrowRight size={16} />
                      </button>
                    </div>
                    {next ? (
                      <EventCard
                        key={next.id}
                        event={next}
                        done={Boolean(state.checks[next.id])}
                        pending={Boolean(pending[next.id])}
                        next={true}
                        onToggle={() => void toggle(next.id)}
                        onDetails={() => select(next)}
                        photoCount={
                          state.photos.filter((p) => p.eventId === next.id)
                            .length
                        }
                      />
                    ) : (
                      <p className="notice">
                        Todos os momentos deste dia foram concluídos. Aproveitem
                        o tempo de vocês.
                      </p>
                    )}
                    <div className="upcoming-list">
                      {today.events
                        .filter((e) => !state.checks[e.id] && e.id !== next?.id)
                        .slice(0, 2)
                        .map((e) => (
                          <button key={e.id} onClick={() => select(e)}>
                            <span className="upcoming-time">
                              ~ {e.startTime}
                            </span>
                            <span>
                              <strong>{e.title}</strong>
                              <small>
                                {e.location?.city ?? "No ritmo de vocês"}
                              </small>
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))}
                    </div>
                  </>
                )}
                <section className="journey-preview">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        NOVE DIAS, UM NOVO CAPÍTULO
                      </span>
                      <h3>A nossa jornada</h3>
                    </div>
                    <Route size={23} />
                  </div>
                  <button
                    className="map-preview-button"
                    onClick={() => {
                      navigate("map");
                      setExpandedMap(true);
                    }}
                    aria-label="Expandir mapa ilustrado da viagem"
                  >
                    <IllustratedRouteMap />
                  </button>
                  <div className="journey-footer">
                    <span>
                      Das ladeiras de Minas
                      <br />
                      às águas de Paraty.
                    </span>
                    <button
                      className="text-button"
                      onClick={() => navigate("map")}
                    >
                      Explorar mapa <ArrowUpRight size={17} />
                    </button>
                  </div>
                </section>
                <button
                  className="anniversary-note"
                  onClick={() => {
                    setDayIndex(6);
                    navigate("itinerary");
                  }}
                >
                  <span className="anniversary-number">25</span>
                  <span>
                    <small>14 DE NOVEMBRO</small>
                    <strong>
                      Uma vida juntos.
                      <br />
                      Um dia só de vocês.
                    </strong>
                  </span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </>
          )}
          {tab === "itinerary" && (
            <div className="page-body">
              <span className="eyebrow">CADA DIA, UMA DESCOBERTA</span>
              <h1>Nosso roteiro</h1>
              <p className="muted">
                Horários aproximados. Há espaço para pausas e para mudar de
                ideia.
              </p>
              <div className="day-selector" aria-label="Escolher dia da viagem">
                {days.map((d, i) => (
                  <button
                    className={`${i === dayIndex ? "selected" : ""} ${i === 6 ? "anniversary-day" : ""}`}
                    key={d.id}
                    onClick={() => setDayIndex(i)}
                    aria-pressed={i === dayIndex}
                  >
                    <span>{weekdays[i]}</span>
                    <strong>{8 + i}</strong>
                    <small>NOV</small>
                    {i === 6 && <span className="day-dot" />}
                  </button>
                ))}
              </div>
              <section
                className={`day-heading ${dayIndex === 6 ? "special-day" : ""}`}
              >
                <span className="eyebrow">
                  DIA {dayIndex + 1} DE 9{" "}
                  {dayIndex === 6 ? "· BODAS DE PRATA" : ""}
                </span>
                <h2>{currentDay.title}</h2>
                <p>{currentDay.subtitle}</p>
                <div className="day-count">
                  {dayFinished} de {currentDay.events.length} momentos vividos
                </div>
              </section>
              <p className="schedule-note">
                <Sun size={17} /> Os horários são um guia, não uma cobrança.
                {dayIndex === 5
                  ? " A escuna depende da reserva."
                  : dayIndex === 6
                    ? " Guardem a noite para o jantar às 20h30."
                    : ""}
              </p>
              <div className="timeline">
                {currentDay.events.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    done={Boolean(state.checks[e.id])}
                    pending={Boolean(pending[e.id])}
                    next={
                      e.id === nextEvent(currentDay.events, state.checks)?.id
                    }
                    onToggle={() => void toggle(e.id)}
                    onDetails={() => select(e)}
                    photoCount={
                      state.photos.filter((p) => p.eventId === e.id).length
                    }
                  />
                ))}
              </div>
            </div>
          )}
          {tab === "map" && (
            <div className="page-body">
              <span className="eyebrow">ENTRE SERRAS, HISTÓRIA E MAR</span>
              <h1>Por onde vamos</h1>
              <p className="muted">
                Toquem nos pontos para descobrir cada etapa.
              </p>
              <MapView
                events={events}
                checks={state.checks}
                onSelect={select}
              />
              <section className="map-city-list">
                <h3>Encontre no roteiro</h3>
                <div className="city-chips">
                  {days.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDayIndex(i);
                        navigate("itinerary");
                      }}
                    >
                      {8 + i} NOV · {d.city}
                    </button>
                  ))}
                </div>
              </section>
              <section className="journey-preview">
                <div className="section-heading">
                  <h3>O desenho da nossa viagem</h3>
                  <button
                    className="text-button"
                    onClick={() => setExpandedMap(true)}
                  >
                    Ampliar <ArrowUpRight size={16} />
                  </button>
                </div>
                <IllustratedRouteMap
                  onCity={(key) => {
                    const name = key === "bh" ? "Belo Horizonte" : undefined;
                    const target = events.find(
                      (e) =>
                        e.location?.city ===
                        (name ??
                          (
                            {
                              ouro: "Ouro Preto",
                              congonhas: "Congonhas",
                              tiradentes: "Tiradentes",
                              saojoao: "São João del-Rei",
                              bichinho: "Bichinho",
                              carrancas: "Carrancas",
                              saolourenco: "São Lourenço",
                              passaquatro: "Passa Quatro",
                              guaratingueta: "Guaratinguetá",
                              cunha: "Cunha",
                              paraty: "Paraty",
                              trindade: "Trindade",
                            } as Record<string, string>
                          )[key]),
                    );
                    if (target) select(target);
                  }}
                />
              </section>
              <div className="info-box">
                <h3>
                  <MapPin size={19} /> Navegação na estrada
                </h3>
                <p>
                  O Google Maps cuida do caminho. Aqui, vocês encontram as
                  etapas e abrem a rota certa — sem precisar compartilhar a
                  localização com o site.
                </p>
                <button
                  className="text-button"
                  onClick={() => select(days[8].events.find((e) => e.route)!)}
                >
                  Ver os trechos da volta <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
          {tab === "trip" && (
            <div className="page-body">
              <span className="eyebrow">O QUE LEVAR. O QUE GUARDAR.</span>
              <h1>Nossa viagem</h1>
              <p className="muted">
                De 8 a 16 de novembro de 2026.
                <br />
                Feita com carinho, para Cleide e Flávio.
              </p>
              <div className="trip-tabs">
                {(
                  [
                    ["preparation", "Antes de sair"],
                    ["stays", "Hospedagens"],
                    ["memories", "Memórias"],
                    ["info", "Informações"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    className={tripSection === key ? "active" : ""}
                    aria-pressed={tripSection === key}
                    onClick={() => setTripSection(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tripSection === "preparation" && (
                <>
                  <h2>Antes de pegar a estrada</h2>
                  <p className="muted">
                    Pequenos cuidados para aproveitar o caminho.
                  </p>
                  <div className="checklist">
                    {preparation.map((p) => (
                      <article key={p.id}>
                        <h3>{p.title}</h3>
                        <p>{p.description}</p>
                        <CompletionButton
                          done={Boolean(state.checks[`prep-${p.id}`])}
                          pending={Boolean(pending[`prep-${p.id}`])}
                          onToggle={() => void toggle(`prep-${p.id}`)}
                        />
                      </article>
                    ))}
                  </div>
                  <div className="info-box">
                    <Stamp size={23} />
                    <h3>Passaporte da Estrada Real</h3>
                    <p>
                      Os pontos oficiais de retirada e carimbo ainda precisam
                      ser confirmados. Cada cidade tem um momento no roteiro
                      para guardar o carimbo e sua foto.
                    </p>
                  </div>
                </>
              )}
              {tripSection === "stays" && (
                <>
                  <h2>Um lugar para descansar</h2>
                  <p className="muted">
                    As reservas serão preenchidas aqui pela Duda.
                  </p>
                  {events
                    .filter((e) => e.type === "accommodation")
                    .map((e) => (
                      <button
                        key={e.id}
                        className="stay-card"
                        onClick={() => select(e)}
                      >
                        <span>
                          <span className="eyebrow">
                            {e.dayId.replace("day-", "")}/11 ·{" "}
                            {e.location?.city}
                          </span>
                          <strong>Pousada a definir</strong>
                          <small>Ver check-in e informações</small>
                        </span>
                        <ChevronRight />
                      </button>
                    ))}
                </>
              )}
              {tripSection === "memories" && (
                <>
                  <h2>Memórias da viagem</h2>
                  <p className="muted">
                    As fotos de cada momento, reunidas aqui.
                  </p>
                  {!state.photos.length ? (
                    <div className="empty-state">
                      <Camera size={34} />
                      <h3>As memórias estão por vir.</h3>
                      <p>
                        Adicionem fotos nos detalhes de cada momento. Elas
                        aparecerão aqui, organizadas por dia.
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => navigate("itinerary")}
                      >
                        Explorar o roteiro <ArrowRight size={18} />
                      </button>
                    </div>
                  ) : (
                    days.map((d) => {
                      const withPhotos = d.events.filter((e) =>
                        state.photos.some((p) => p.eventId === e.id),
                      );
                      return withPhotos.length ? (
                        <section className="memory-day" key={d.id}>
                          <span className="eyebrow">{d.date.slice(8)} NOV</span>
                          {withPhotos.map((e) => (
                            <div key={e.id}>
                              <h3>{e.title}</h3>
                              <PhotoGallery
                                photos={state.photos.filter(
                                  (p) => p.eventId === e.id,
                                )}
                                onDeleted={deleted}
                              />
                            </div>
                          ))}
                        </section>
                      ) : null;
                    })
                  )}
                </>
              )}
              {tripSection === "info" && (
                <>
                  <div className="info-box">
                    <h2>Um guia no bolso</h2>
                    <p>
                      Os horários são aproximados. A escuna segue a reserva, e o
                      jantar das Bodas está planejado para 14/11 às 20h30.
                    </p>
                    <p>
                      Antes de sair, baixem os mapas offline no Google Maps.
                      Checks e fotos precisam de conexão; o roteiro já visitado
                      pode ficar disponível sem sinal.
                    </p>
                    <p>
                      Para adicionar à tela inicial: no iPhone, use Compartilhar
                      → Adicionar à Tela de Início; no Android, abra o menu do
                      navegador e procure Instalar ou Adicionar à tela inicial.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setOnboarding(true)}
                  >
                    Rever as boas-vindas
                  </button>
                  <p className="caption">
                    Dias e horários seguem o fuso de São Paulo. Este guia é
                    privado e não envia notificações.
                  </p>
                  <p className="caption">
                    {sync === "ok"
                      ? "Checks e fotos atualizados neste dispositivo."
                      : sync === "loading"
                        ? "Buscando os momentos compartilhados…"
                        : sync === "error"
                          ? "Não foi possível atualizar os momentos compartilhados."
                          : "Checks compartilhados ainda não configurados."}
                  </p>
                </>
              )}
            </div>
          )}
          <footer className="page-footer">
            <Heart size={14} />
            <span>Uma viagem preparada com carinho.</span>
          </footer>
        </main>
        <nav className="bottom-nav" aria-label="Navegação principal">
          {(
            [
              { id: "today", label: "Hoje", icon: Sun },
              { id: "itinerary", label: "Roteiro", icon: CalendarDays },
              { id: "map", label: "Mapa", icon: Map },
              { id: "trip", label: "Viagem", icon: Compass },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={22} strokeWidth={tab === id ? 2 : 1.6} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <PlaceDetails
        event={selected}
        done={Boolean(selected && state.checks[selected.id])}
        pending={Boolean(selected && pending[selected.id])}
        photos={state.photos.filter((p) => p.eventId === selected?.id)}
        uploadEnabled={authorized && state.configured && state.photosConfigured}
        onClose={() => setSelected(null)}
        onToggle={() => selected && void toggle(selected.id)}
        onUploaded={uploaded}
        onDeleted={deleted}
      />
      {message && (
        <div className="toast" role="alert">
          <span>{message}</span>
          <button
            className="icon-button"
            onClick={() => setMessage("")}
            aria-label="Fechar aviso"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {expandedMap && <ExpandedMap onClose={() => setExpandedMap(false)} />}
    </>
  );
}
function ExpandedMap({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="expanded-map-dialog" onCancel={onClose}>
      <div className="sheet-top">
        <h2>Nossa jornada</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar mapa ilustrado"
        >
          <X />
        </button>
      </div>
      <p className="caption">
        Role para explorar. A rota é ilustrativa, com cidades em posições
        geográficas aproximadas.
      </p>
      <div className="expanded-map-scroll">
        <IllustratedRouteMap />
      </div>
    </dialog>
  );
}
