import { EMAIL_MATIAS, WHATSAPP_MATIAS_TEXTO, mail, wa } from "../../compartido/contacto";
import { INCLUYE, MENSAJE, PASOS, SECCIONES, captura, type Seccion } from "./textos";

// Cada tipo de página tiene su color: el fondo detrás del celular y la etiqueta dicen qué es antes de leerla
const TONOS: Record<Seccion["tipo"], { fondo: string; etiqueta: string }> = {
  cliente: { fondo: "bg-[#e7f6ec]", etiqueta: "bg-[#d3f0dc] text-[#14713a]" },
  ejemplo: { fondo: "bg-[#e6f1f7]", etiqueta: "bg-[#d4e8f3] text-[#1d5f86]" },
  propuesta: { fondo: "bg-[#fbefd9]", etiqueta: "bg-[#f7e2bb] text-[#8a5300]" },
};

// Lo que lee un lector de pantalla: que una propuesta o un ejemplo no parezca la página del negocio
const ALT: Record<Seccion["tipo"], (nombre: string) => string> = {
  cliente: (n) => `Captura de la página de ${n}`,
  ejemplo: (n) => `Captura de la página de ejemplo ${n} (negocio inventado)`,
  propuesta: (n) => `Captura de la propuesta de página para ${n} (no es su página oficial)`,
};

const Whatsapp = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
    <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 10 9.9 5.2 16 5.2S27 10 27 15.9 22.1 26.4 16 26.4zm6-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.5z" />
  </svg>
);

const Sobre = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden className="h-6 w-6">
    <rect x="4" y="7" width="24" height="18" rx="3.5" />
    <path d="M5 9l11 8.5L27 9" strokeLinecap="round" />
  </svg>
);

function Contacto() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="flex items-center justify-center gap-3 rounded-2xl bg-wa px-5 py-4 font-semibold text-tinta transition hover:brightness-105">
        <Whatsapp />
        <span className="text-left leading-tight">
          WhatsApp
          <span className="block text-sm font-medium opacity-75">{WHATSAPP_MATIAS_TEXTO}</span>
        </span>
      </a>
      <a href={mail(MENSAJE)} data-contacto="mail" className="flex items-center justify-center gap-3 rounded-2xl bg-panel px-5 py-4 font-semibold ring-1 ring-linea transition hover:ring-tinta/30">
        <Sobre />
        <span className="min-w-0 text-left leading-tight">
          Mail
          <span className="block truncate text-sm font-medium text-suave">{EMAIL_MATIAS}</span>
        </span>
      </a>
    </div>
  );
}

// Cada trabajo en una tarjeta grande: el celular asoma desde un fondo de color y abajo va qué es.
// Si la sección tiene una sola página (el cliente), en pantallas grandes la tarjeta va a lo ancho.
function Tarjetas({ seccion }: { seccion: Seccion }) {
  const sola = seccion.trabajos.length === 1;
  const tono = TONOS[seccion.tipo];
  return (
    <section id={seccion.id} className="mt-16 md:mt-24">
      <h2 className="font-display text-3xl font-bold md:text-4xl">{seccion.titulo}</h2>
      {seccion.nota && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-suave md:text-base">{seccion.nota}</p>}
      <ul className={`mt-6 grid gap-5 ${sola ? "" : seccion.trabajos.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {seccion.trabajos.map((t) => (
          <li key={t.id}>
            <a
              href={t.href}
              data-trabajo={t.id}
              data-tipo={seccion.tipo}
              className={`group grid h-full overflow-hidden rounded-3xl bg-panel ring-1 ring-linea transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(23,23,27,0.5)] ${sola ? "md:grid-cols-[0.9fr_1.1fr]" : ""}`}
            >
              <div className={`flex h-80 items-start justify-center overflow-hidden pt-8 ${tono.fondo} ${sola ? "md:h-auto md:min-h-96" : ""}`}>
                <div className="telefono w-44 shrink-0 text-[8px] transition duration-500 group-hover:-translate-y-2 md:w-48">
                  <img src={captura(`${t.id}-movil`)} alt={ALT[seccion.tipo](t.nombre)} loading="lazy" />
                </div>
              </div>
              <div className={`flex flex-col p-6 ${sola ? "md:justify-center md:p-10" : ""}`}>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${tono.etiqueta}`}>{seccion.etiqueta}</span>
                  <span className="text-sm text-suave">{seccion.detalle}</span>
                </p>
                <h3 className={`font-display mt-3 leading-tight font-bold ${sola ? "text-3xl md:text-4xl" : "text-2xl"}`}>{t.nombre}</h3>
                <p className="mt-1 text-sm text-suave">{t.rubro}</p>
                <p className="mt-3 text-[15px] leading-relaxed">{t.texto}</p>
                <span className="mt-auto pt-5">
                  <span className="inline-block rounded-full bg-tinta px-5 py-2.5 text-sm font-semibold text-fondo transition group-hover:bg-acento">Ver la página</span>
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Incluye() {
  return (
    <section id="incluye" className="mt-20 md:mt-28">
      <h2 className="font-display text-3xl font-bold md:text-4xl">Qué incluye cada página</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INCLUYE.map((i) => (
          <li key={i.titulo} className="rounded-2xl bg-panel p-6 ring-1 ring-linea">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-acento/12 text-acento">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 10.5l3.5 3.5 7.5-8" />
              </svg>
            </span>
            <h3 className="font-display mt-4 text-xl font-bold">{i.titulo}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-suave">{i.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pasos() {
  return (
    <section id="pasos" className="mt-20 md:mt-28">
      <h2 className="font-display text-3xl font-bold md:text-4xl">Cómo trabajo</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="rounded-2xl bg-panel p-6 ring-1 ring-linea">
            <span className="font-display text-5xl leading-none font-bold text-acento">{i + 1}</span>
            <h3 className="font-display mt-4 text-xl font-bold">{p.titulo}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-suave">{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function App() {
  return (
    <main className="mx-auto max-w-md px-5 pt-14 pb-12 md:max-w-6xl md:px-10 md:pt-20">
      <header className="text-center md:mx-auto md:max-w-xl">
        <p aria-hidden className="font-display mx-auto grid h-24 w-24 place-items-center rounded-full bg-acento text-3xl font-bold text-white shadow-[0_18px_40px_-16px_rgba(255,90,31,0.7)]">
          MT
        </p>
        <h1 className="font-display mt-5 text-4xl font-bold md:text-5xl">Matías Trovato</h1>
        <p className="mt-2 text-lg text-suave">
          Páginas web para comercios de <span className="font-semibold text-acento">Merlo, San Luis</span>
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-tinta/85 md:text-base">Te hago la página de tu negocio, con tus fotos y un botón para que te escriban por WhatsApp.</p>
        <Contacto />
      </header>

      {SECCIONES.map((s) => (
        <Tarjetas key={s.id} seccion={s} />
      ))}

      <Incluye />
      <Pasos />

      <section className="mt-20 rounded-3xl bg-tinta p-8 text-center text-fondo md:mt-28 md:p-14">
        <h2 className="font-display text-3xl font-bold md:text-5xl">¿Querés una para tu negocio?</h2>
        <p className="mx-auto mt-3 max-w-xl text-fondo/75">Presupuesto sin compromiso: escribime y te paso el precio según lo que necesites.</p>
        <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="mt-7 inline-flex items-center gap-3 rounded-full bg-wa px-7 py-3.5 font-semibold text-tinta transition hover:brightness-105">
          <Whatsapp className="h-5 w-5" />
          Escribime por WhatsApp
        </a>
      </section>

      <footer className="mt-10 text-center text-xs text-suave">Matías Trovato · Merlo, San Luis</footer>
    </main>
  );
}
