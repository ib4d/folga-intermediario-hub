"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

type Language = "es" | "en" | "pl";

const copy = {
  es: {
    roiTitle: "Calcula tu escenario", roiIntro: "Introduce tus propios valores. El resultado estima capacidad de tiempo y valor laboral potencial; no representa ahorro garantizado ni una promesa del producto.",
    cases: "Casos gestionados al mes", minutes: "Minutos actuales por caso", hourly: "Coste laboral por hora (€)",
    hours: "Horas mensuales potencialmente liberadas", value: "Valor laboral teórico / mes", assumptions: "Supuesto editable: minutos que estimas que podrías liberar por caso.",
    checklistTitle: "Diagnóstico operativo", checklistIntro: "Marca lo que ya tienes definido. La lista permanece en este navegador y no se envía ni se guarda.",
    items: ["Una persona responsable por etapa", "Lista vigente de documentos por proceso", "Reglas internas para acceso y almacenamiento", "Ruta de revisión humana para datos extraídos", "Procedimiento para excepciones y vencimientos", "Handoff definido entre recruiting, legal y logística", "Prueba con datos sintéticos antes de cargar datos reales", "Criterios acordados para medir un piloto"],
    progress: "Puntos definidos", reset: "Limpiar selección", next: "Siguiente paso sugerido", nextText: "Elige uno de los puntos sin marcar y asígnale una persona responsable y una fecha de revisión.",
    privateNote: "Todo se calcula localmente. No introduzcas datos personales ni detalles de candidatos.",
  },
  en: {
    roiTitle: "Model your scenario", roiIntro: "Use your own values. The result estimates time capacity and potential labor value; it is not guaranteed savings or a product promise.",
    cases: "Cases handled per month", minutes: "Current minutes per case", hourly: "Labor cost per hour (€)",
    hours: "Potential monthly hours freed", value: "Theoretical labor value / month", assumptions: "Editable assumption: minutes you estimate could be freed per case.",
    checklistTitle: "Operational readiness", checklistIntro: "Mark what you have defined. This list stays in this browser and is not sent or saved.",
    items: ["An owner for each workflow stage", "A current document list for each process", "Internal access and storage rules", "A human review path for extracted data", "A process for exceptions and expiry dates", "A handoff between recruiting, legal, and logistics", "A synthetic-data trial before real data", "Agreed measures for evaluating a pilot"],
    progress: "Defined items", reset: "Clear selections", next: "Suggested next step", nextText: "Choose one unchecked item and assign an owner and a review date.",
    privateNote: "Everything is calculated locally. Do not enter personal or candidate information.",
  },
  pl: {
    roiTitle: "Oblicz własny scenariusz", roiIntro: "Wpisz własne wartości. Wynik szacuje potencjalny czas i jego wartość pracy; nie oznacza gwarantowanych oszczędności ani obietnicy produktu.",
    cases: "Sprawy miesięcznie", minutes: "Obecne minuty na sprawę", hourly: "Koszt pracy za godzinę (€)",
    hours: "Potencjalnie uwolnione godziny w miesiącu", value: "Teoretyczna wartość pracy / miesiąc", assumptions: "Edytowalne założenie: liczba minut, które według Ciebie można uwolnić na sprawę.",
    checklistTitle: "Diagnoza operacyjna", checklistIntro: "Zaznacz ustalone elementy. Lista pozostaje w tej przeglądarce i nie jest wysyłana ani zapisywana.",
    items: ["Osoba odpowiedzialna za każdy etap", "Aktualna lista dokumentów dla procesu", "Wewnętrzne zasady dostępu i przechowywania", "Ludzka weryfikacja odczytanych danych", "Procedura wyjątków i terminów ważności", "Przekazanie między rekrutacją, prawem i logistyką", "Test na danych syntetycznych przed danymi rzeczywistymi", "Uzgodnione kryteria oceny pilotażu"],
    progress: "Ustalone punkty", reset: "Wyczyść wybór", next: "Sugerowany kolejny krok", nextText: "Wybierz niezaznaczony punkt i przypisz osobę odpowiedzialną oraz termin przeglądu.",
    privateNote: "Wszystko jest obliczane lokalnie. Nie wpisuj danych osobowych ani informacji o kandydatach.",
  },
} as const;

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const currencyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function ResourcesWorkbench({ language }: { language: Language }) {
  const c = copy[language];
  const [monthlyCases, setMonthlyCases] = useState(80);
  const [minutesPerCase, setMinutesPerCase] = useState(15);
  const [hourlyCost, setHourlyCost] = useState(20);
  const [checked, setChecked] = useState<boolean[]>(() => c.items.map(() => false));
  const monthlyHours = useMemo(() => (monthlyCases * minutesPerCase) / 60, [monthlyCases, minutesPerCase]);
  const laborValue = monthlyHours * hourlyCost;

  function toggleItem(index: number) {
    setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  }

  return <div className="ori-resource-tools">
    <section className="ori-resource-tool" aria-labelledby="roi-title">
      <div className="ori-resource-tool-heading"><span>01 / WHAT-IF</span><h2 id="roi-title">{c.roiTitle}</h2><p>{c.roiIntro}</p></div>
      <div className="ori-resource-calculator">
        <div className="ori-resource-inputs">
          <label>{c.cases}<input type="number" min="0" max="100000" step="1" value={monthlyCases} onChange={(event) => setMonthlyCases(Math.min(100000, Math.max(0, Number(event.target.value) || 0)))} /></label>
          <label>{c.minutes}<input type="number" min="0" max="480" step="1" value={minutesPerCase} onChange={(event) => setMinutesPerCase(Math.min(480, Math.max(0, Number(event.target.value) || 0)))} /></label>
          <label>{c.hourly}<input type="number" min="0" max="10000" step="1" value={hourlyCost} onChange={(event) => setHourlyCost(Math.min(10000, Math.max(0, Number(event.target.value) || 0)))} /></label>
        </div>
        <div className="ori-resource-results" aria-live="polite">
          <article><small>{c.hours}</small><strong>{numberFormat.format(monthlyHours)} h</strong></article>
          <article><small>{c.value}</small><strong>{currencyFormat.format(laborValue)}</strong></article>
        </div>
        <p className="ori-resource-assumption">{c.assumptions}</p>
      </div>
    </section>

    <section className="ori-resource-tool" aria-labelledby="readiness-title">
      <div className="ori-resource-tool-heading"><span>02 / SELF-ASSESSMENT</span><h2 id="readiness-title">{c.checklistTitle}</h2><p>{c.checklistIntro}</p></div>
      <div className="ori-resource-checklist">
        <div className="ori-resource-checklist-top"><strong>{checked.filter(Boolean).length} / {c.items.length}</strong><span>{c.progress}</span><button type="button" onClick={() => setChecked(c.items.map(() => false))}><RotateCcw size={14} />{c.reset}</button></div>
        <ul>{c.items.map((item, index) => <li key={item}><label><input type="checkbox" checked={checked[index]} onChange={() => toggleItem(index)} /><span>{item}</span></label></li>)}</ul>
        <div className="ori-resource-next"><small>{c.next}</small><p>{c.nextText}</p></div>
      </div>
    </section>
    <p className="ori-resource-privacy">{c.privateNote}</p>
  </div>;
}
