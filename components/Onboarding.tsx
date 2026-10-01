"use client";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Map,
  CheckCircle,
  Camera,
  Navigation,
  CalendarDays,
} from "lucide-react";
export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector("button")?.focus();
  }, []);
  return (
    <div
      ref={root}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons =
          root.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      className="onboarding"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="onboarding-art">
        <img
          src="/journey.svg"
          alt="Ilustração de uma rua histórica entre as serras"
        />
        <div className="onboarding-seal">
          25<span>ANOS JUNTOS</span>
        </div>
      </div>
      <div className="onboarding-body">
        <span className="eyebrow">UMA VIAGEM, MUITAS MEMÓRIAS</span>
        {step === 0 ? (
          <>
            <h1 id="welcome-title">
              Cleide e Flávio,
              <br />a estrada espera
              <br />
              por vocês.
            </h1>
            <p>
              25 anos de caminhos compartilhados. Agora, nove dias para
              descobrir outros — das serras de Minas ao mar de Paraty.
            </p>
            <p>
              Esta viagem foi preparada com carinho. Aproveitem cada cidade,
              cada pausa e o prazer de estar juntos.
            </p>
            <button className="button" onClick={() => setStep(1)}>
              Conhecer nosso guia <ArrowRight size={20} />
            </button>
          </>
        ) : (
          <>
            <h1 id="welcome-title">
              Tudo aqui.
              <br />
              No ritmo de vocês.
            </h1>
            <ul className="onboarding-tips">
              {[
                [CalendarDays, "O roteiro de cada dia, sem pressa."],
                [Map, "Um mapa para conhecer cada etapa."],
                [Navigation, "As rotas abrem no Google Maps."],
                [CheckCircle, "Marquem juntos o que já viveram."],
                [Camera, "Guardem fotos de cada momento."],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Map;
                return (
                  <li key={i}>
                    <I size={22} />
                    <span>{text as string}</span>
                  </li>
                );
              })}
            </ul>
            <p className="caption">
              Na estrada, mapas, checks e fotos precisam de internet. O roteiro
              já aberto pode continuar disponível sem sinal.
            </p>
            <button className="button" onClick={onFinish}>
              Começar nossa viagem <ArrowRight size={20} />
            </button>
          </>
        )}
        <div className="onboarding-dots" aria-label={`Tela ${step + 1} de 2`}>
          <span className={step === 0 ? "active" : ""} />
          <span className={step === 1 ? "active" : ""} />
        </div>
      </div>
    </div>
  );
}
