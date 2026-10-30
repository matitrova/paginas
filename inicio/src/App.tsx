import { EMAIL_MATIAS, WHATSAPP_MATIAS_TEXTO, mail, wa } from "../../compartido/contacto";
import {
  ABONO, INCLUYE, MENSAJE, MENSAJE_DIAGNOSTICO, MENSAJE_OTRO_RUBRO, NOMBRE_TIPO, PASOS, PORTADA, PREGUNTAS, RUBROS, SECCIONES, captura,
  type Seccion,
} from "./textos";

// Cada tipo de página tiene su color: el fondo detrás del celular y la etiqueta dicen qué es antes de leerla
const TONOS: Record<Seccion["tipo"], { fondo: string; etiqueta: string }> = {
  cliente: { fondo: "bg-[#e7f6ec]", etiqueta: "bg-[#d3f0dc] text-[#14713a]" },
  app: { fondo: "bg-[#efe9f7]", etiqueta: "bg-[#e2d8f2] text-[#5b3a8f]" },
  ejemplo: { fondo: "bg-[#e6f1f7]", etiqueta: "bg-[#d4e8f3] text-[#1d5f86]" },
  propuesta: { fondo: "bg-[#fbefd9]", etiqueta: "bg-[#f7e2bb] text-[#8a5300]" },
};

// Lo que lee un lector de pantalla: que una propuesta o un ejemplo no parezca la página del negocio
const ALT: Record<Seccion["tipo"], (nombre: string) => string> = {
  cliente: (n) => `Captura de la página de ${n}`,
  app: (n) => `Captura de ${n}, una app hecha por Matías`,
  ejemplo: (n) => `Captura de la página de ejemplo ${n} (negocio inventado)`,
  propuesta: (n) => `Captura de la propuesta de página para ${n} (no es su página oficial)`,
};

const afuera = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {});

const Whatsapp = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
    <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 10 9.9 5.2 16 5.2S27 10 27 15.9 22.1 26.4 16 26.4zm6-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.5z" />
  </svg>
);

const Tilde = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`h-5 w-5 shrink-0 ${className}`}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </svg>
);

const Titulo = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-3xl font-bold tracking-[-0.02em] md:text-5xl">{children}</h2>;

function Barra() {
  return (
    <header className="sticky top-0 z-20 border-b border-linea bg-fondo">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-10">
        <a href="#arriba" className="font-display text-lg font-bold">Matías Trovato</a>
        <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="inline-flex items-center gap-2 rounded-full bg-wa px-4 py-2 text-sm font-semibold text-tinta transition hover:brightness-105">
          <Whatsapp className="h-4 w-4" />
          {WHATSAPP_MATIAS_TEXTO}
        </a>
      </div>
    </header>
  );
}

// La oferta: la frase del flyer, la garantía en grande y los dos botones. Al lado, los tres celulares del flyer.
function Portada() {
  return (
    <section id="arriba" className="grid scroll-mt-20 items-center gap-10 pt-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:pt-16">
      <div>
        <h1 className="font-display text-[2.85rem] leading-[0.98] font-bold tracking-[-0.04em] md:text-7xl">
          {PORTADA.titulo[0]}
          <br />
          <span className="text-acento-texto">{PORTADA.titulo[1]}</span>
          <br />
          {PORTADA.titulo[2]}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-suave md:text-xl">{PORTADA.bajada}</p>
        <p data-garantia className="mt-6 flex gap-3 rounded-2xl bg-panel p-4 leading-snug font-semibold ring-1 ring-acento/35 md:text-lg">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-acento text-white">
            <Tilde className="h-4 w-4" />
          </span>
          {PORTADA.garantia}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {PORTADA.extras.map((e) => (
            <li key={e} className="rounded-full bg-panel/70 px-3 py-1.5 ring-1 ring-linea">{e}</li>
          ))}
        </ul>
        <div className="mt-7 flex flex-col items-stretch gap-3 sm:items-start">
          <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="inline-flex items-center justify-center gap-3 rounded-full bg-wa px-7 py-3.5 font-semibold text-tinta transition hover:brightness-105">
            <Whatsapp className="h-5 w-5" />
            Pedí tu presupuesto
          </a>
          <a href={wa(MENSAJE_DIAGNOSTICO)} target="_blank" rel="noopener" data-contacto="whatsapp" data-diagnostico className="inline-flex items-center justify-center rounded-full bg-panel px-7 py-3.5 text-center font-semibold ring-1 ring-tinta/20 transition hover:ring-tinta/40">
            Te digo gratis cómo aparece tu negocio en Google
          </a>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 md:gap-4">
        {PORTADA.muestras.map((m) => (
          <figure key={m.id} className={`relative h-56 overflow-hidden rounded-3xl px-3 pt-4 sm:h-72 md:h-[22rem] md:px-5 md:pt-6 ${m.color}`}>
            <figcaption className="font-display text-sm leading-tight font-bold md:text-2xl">{m.titulo}</figcaption>
            <div className="telefono absolute top-14 left-1/2 w-[84%] -translate-x-1/2 text-[5px] sm:text-[6px] md:top-24 md:text-[8px]">
              <img src={captura(`${m.id}-movil`)} alt={m.alt} />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Rubros() {
  return (
    <section id="rubros" className="mt-20 scroll-mt-20 md:mt-28">
      <Titulo>Lo que hago en cada rubro</Titulo>
      <p className="mt-3 max-w-2xl text-suave md:text-lg">Estos son los rubros donde ya tengo algo para mostrarte. Si el tuyo no está, también trabajo con él.</p>
      <ul className="mt-7 grid gap-4 md:grid-cols-2">
        {RUBROS.map((r) => (
          <li key={r.id} data-rubro={r.id} className={`flex flex-col rounded-3xl p-6 md:p-8 ${r.color}`}>
            <h3 className="font-display text-2xl leading-tight font-bold md:text-3xl">{r.titulo}</h3>
            <p className="mt-2 leading-relaxed opacity-90">{r.texto}</p>
            <p className="mt-auto flex flex-wrap items-center gap-2 pt-6 text-sm">
              <span className="opacity-80">Mirá:</span>
              {r.ejemplos.map((e) => (
                <a key={e.nombre} href={e.href} {...afuera(e.href)} data-ejemplo={e.tipo} className="rounded-full px-3.5 py-1.5 font-semibold ring-1 ring-current/35 transition hover:bg-white/15">
                  {e.nombre} <span className="font-normal opacity-75">· {NOMBRE_TIPO[e.tipo]}</span>
                </a>
              ))}
            </p>
          </li>
        ))}
        <li data-rubro="otro" className="rounded-3xl border-2 border-dashed border-tinta/20 p-6 md:col-span-2 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <h3 className="font-display text-2xl leading-tight font-bold md:text-3xl">¿Tu rubro no está?</h3>
            <p className="mt-2 leading-relaxed text-suave">Trabajo con cualquier negocio: contame qué hacés y qué necesitás.</p>
          </div>
          <a href={wa(MENSAJE_OTRO_RUBRO)} target="_blank" rel="noopener" data-contacto="whatsapp" className="mt-5 inline-flex shrink-0 items-center gap-3 rounded-full bg-tinta px-6 py-3 font-semibold text-fondo transition hover:bg-acento md:mt-0">
            <Whatsapp className="h-5 w-5" />
            Contame tu rubro
          </a>
        </li>
      </ul>
    </section>
  );
}

function Pasos() {
  return (
    <section id="pasos" className="mt-20 scroll-mt-20 md:mt-28">
      <Titulo>Cómo trabajo</Titulo>
      <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

function Incluye() {
  return (
    <section id="incluye" className="mt-20 scroll-mt-20 md:mt-28">
      <Titulo>Qué incluye cada página</Titulo>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INCLUYE.map((i) => (
          <li key={i.titulo} className="rounded-2xl bg-panel p-6 ring-1 ring-linea">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-acento/12 text-acento">
              <Tilde />
            </span>
            <h3 className="font-display mt-4 text-xl font-bold">{i.titulo}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-suave">{i.texto}</p>
          </li>
        ))}
      </ul>
      <div id="abono" className="mt-5 grid scroll-mt-20 gap-8 rounded-3xl bg-tinta p-7 text-fondo md:grid-cols-[1fr_1.1fr] md:p-10">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-acento uppercase">Abono mensual · opcional</p>
          <h3 className="font-display mt-3 text-3xl leading-tight font-bold md:text-4xl">{ABONO.titulo}</h3>
          <p className="mt-3 text-fondo/75">{ABONO.texto}</p>
        </div>
        <div>
          <ul className="space-y-3">
            {ABONO.incluye.map((i) => (
              <li key={i} className="flex gap-3 leading-snug">
                <Tilde className="text-acento" />
                {i}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-fondo/15 pt-5 text-sm leading-relaxed text-fondo/75">
            {ABONO.pagos} {ABONO.dominio}
          </p>
        </div>
      </div>
    </section>
  );
}

// Cada trabajo en una tarjeta grande: el celular asoma desde un fondo de color y abajo va qué es.
// Si la sección tiene una sola página (el cliente), en pantallas grandes la tarjeta va a lo ancho.
// Las apps no tienen link: piden usuario para entrar.
function Tarjetas({ seccion }: { seccion: Seccion }) {
  const sola = seccion.trabajos.length === 1;
  const tono = TONOS[seccion.tipo];
  return (
    <section id={seccion.id} className="mt-12 scroll-mt-20 md:mt-16">
      <h3 className="font-display text-2xl font-bold md:text-3xl">{seccion.titulo}</h3>
      {seccion.nota && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-suave md:text-base">{seccion.nota}</p>}
      <ul className={`mt-6 grid gap-5 ${sola ? "" : seccion.trabajos.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {seccion.trabajos.map((t) => {
          const Caja = t.href ? "a" : "div";
          return (
            <li key={t.id}>
              <Caja
                {...(t.href ? { href: t.href, ...afuera(t.href) } : {})}
                data-trabajo={t.id}
                data-tipo={seccion.tipo}
                className={`group grid h-full overflow-hidden rounded-3xl bg-panel ring-1 ring-linea transition ${t.href ? "hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(23,23,27,0.5)]" : ""} ${sola ? "md:grid-cols-[0.9fr_1.1fr]" : ""}`}
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
                  <h4 className={`font-display mt-3 leading-tight font-bold ${sola ? "text-3xl md:text-4xl" : "text-2xl"}`}>{t.nombre}</h4>
                  <p className="mt-1 text-sm text-suave">{t.rubro}</p>
                  <p className="mt-3 text-[15px] leading-relaxed">{t.texto}</p>
                  {t.href && (
                    <span className="mt-auto pt-5">
                      <span className="inline-block rounded-full bg-tinta px-5 py-2.5 text-sm font-semibold text-fondo transition group-hover:bg-acento">Ver la página</span>
                    </span>
                  )}
                </div>
              </Caja>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Preguntas() {
  return (
    <section id="preguntas" className="mt-20 scroll-mt-20 md:mt-28">
      <Titulo>Preguntas frecuentes</Titulo>
      <div className="mt-7 max-w-3xl divide-y divide-linea rounded-3xl bg-panel ring-1 ring-linea">
        {PREGUNTAS.map((q) => (
          <details key={q.p} className="group px-6 py-5 md:px-8">
            <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
              {q.p}
              <span aria-hidden className="text-2xl leading-none text-acento transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-suave">{q.r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Barra />
      <main className="mx-auto max-w-md px-5 pb-12 md:max-w-6xl md:px-10">
        <Portada />
        <Rubros />
        <Pasos />
        <Incluye />

        <section id="trabajos" className="mt-20 scroll-mt-20 md:mt-28">
          <Titulo>Lo que ya hice</Titulo>
          {SECCIONES.map((s) => (
            <Tarjetas key={s.id} seccion={s} />
          ))}
        </section>

        <Preguntas />

        <section className="mt-20 rounded-3xl bg-tinta p-8 text-center text-fondo md:mt-28 md:p-14">
          <h2 className="font-display text-3xl font-bold md:text-5xl">¿Querés una para tu negocio?</h2>
          <p className="mx-auto mt-3 max-w-xl text-fondo/75">Presupuesto sin compromiso: escribime y te paso el precio según lo que necesites.</p>
          <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="mt-7 inline-flex items-center gap-3 rounded-full bg-wa px-7 py-3.5 font-semibold text-tinta transition hover:brightness-105">
            <Whatsapp className="h-5 w-5" />
            Escribime por WhatsApp
          </a>
          <p className="mt-5 text-sm text-fondo/75">
            O por mail:{" "}
            <a href={mail(MENSAJE)} data-contacto="mail" className="font-semibold text-fondo underline decoration-fondo/40 underline-offset-4 hover:decoration-fondo">
              {EMAIL_MATIAS}
            </a>
          </p>
        </section>

        <footer className="mt-10 text-center text-xs text-suave">
          Matías Trovato · Páginas web y apps ·{" "}
          <a href="https://matitrova.github.io" className="underline underline-offset-2">matitrova.github.io</a>
        </footer>
      </main>
    </>
  );
}
