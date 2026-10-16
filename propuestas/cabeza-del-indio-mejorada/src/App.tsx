import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import CintaPropuesta, { NOTA_FOTOS } from "../../../compartido/CintaPropuesta";
import { linda } from "../../../compartido/fechas";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import { Mesa, Postal } from "./PostalesArrastrables";
import TextoQueAparece from "./TextoQueAparece";
import {
  ALMACEN,
  CHIVITO,
  ENTRADAS,
  ESLOGAN,
  FICHA,
  FRASE,
  FUEGOS,
  INSTAGRAM,
  INSTAGRAM_LABERINTO,
  LABERINTO,
  MAPA,
  NEGOCIO,
  NOVEDAD,
  PARADAS,
  PLATOS,
  POSTALES,
  PREGUNTAS,
  REFUGIO,
  REFUGIO_DATOS,
  REFUGIO_OPCION,
  RESERVAS,
  TELEFONO,
  TELEFONO_TEXTO,
  foto,
} from "./textos";

const PAPEL = "bg-[#fffdf7]";
const Adorno = () => (
  <p aria-hidden className="text-xl text-acento">
    ✦
  </p>
);
const Guarda = () => <div aria-hidden className="guarda" />;

function Encabezado() {
  return (
    <header className="absolute inset-x-0 top-8 z-30 flex items-center justify-between px-5 py-4 md:px-12">
      <a href="#" className="leading-none text-fondo md:text-tinta">
        <span className="font-display block text-2xl">Cabeza del Indio</span>
        <span className="mt-1 block text-[11px] font-bold tracking-[0.2em] uppercase opacity-80">Mirador · Villa de Merlo</span>
      </a>
      <a href="#reserva" className="rounded-full bg-acento px-5 py-2.5 text-sm font-bold text-fondo transition hover:brightness-110">
        Reservar
      </a>
    </header>
  );
}

// El sello que gira: las tres cocciones de la casa
function Sello({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <defs>
        <path id="ronda" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
      </defs>
      <circle cx="100" cy="100" r="99" className="fill-acento" />
      <circle cx="100" cy="100" r="58" className="fill-none stroke-fondo/50" strokeDasharray="2 5" />
      <text className="sello-gira fill-fondo" fontSize="14" fontWeight="700">
        <textPath href="#ronda" textLength="470">
          DISCO DE ARADO · HORNO DE BARRO · POZO ·
        </textPath>
      </text>
      <text x="100" y="108" textAnchor="middle" className="font-display fill-fondo" fontSize="58">
        3
      </text>
      <text x="100" y="131" textAnchor="middle" className="fill-fondo" fontSize="13" fontWeight="700" letterSpacing="4">
        FUEGOS
      </text>
    </svg>
  );
}

// En celular la foto va arriba, a la vista, y el texto debajo: el plato no queda tapado.
// En pantallas grandes, mitad cartel y mitad foto, con el sello en la costura.
function Portada() {
  return (
    <section id="portada" className="relative flex flex-col bg-tinta md:grid md:min-h-[100svh] md:grid-cols-2 md:bg-transparent">
      <img src={foto("portada")} alt="Un plato de carne y verduras servido en una olla de barro" fetchPriority="high" className="h-[42svh] w-full object-cover object-[50%_70%] md:order-2 md:h-[100svh] md:object-center" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-tinta/70 to-transparent md:hidden" />

      <div className="relative px-5 pt-10 pb-12 text-fondo md:flex md:flex-col md:justify-center md:px-12 md:pt-32 md:pb-16 md:text-tinta">
        <Sello className="absolute -top-12 right-4 z-10 w-24 md:top-auto md:right-0 md:bottom-12 md:w-40 md:translate-x-1/2" />
        <p className="etiqueta !text-sm !text-fondo/90 md:!text-xs md:!text-acento">Restaurante de campo · Casa de té · Laberinto</p>
        <h1 className="font-display mt-4 text-[2.3rem] leading-[1.04] md:mt-5 md:text-6xl lg:text-7xl">{ESLOGAN}</h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-fondo/85 md:mt-6 md:text-suave">Cocina criolla, mirador 360 y piletones naturales, en el Camino de Pasos Malos.</p>
        <div className="mt-7 flex flex-wrap gap-3 md:mt-8">
          <a href="#reserva" className="rounded-full bg-acento px-6 py-3.5 font-bold text-fondo transition hover:brightness-110">
            Reservar mesa
          </a>
          <a href="#ficha" className="rounded-full border-2 border-current px-6 py-3 font-bold transition hover:bg-tinta hover:text-fondo">
            Horarios y cómo llegar
          </a>
        </div>
      </div>
    </section>
  );
}

// Dónde y cuándo, arriba de todo y con lo publicado. No calcula si hoy abre: no hay horario del restaurante.
function Ficha() {
  return (
    <section id="ficha" className="grano bg-panel px-5 py-10 md:px-10 md:py-14">
      <div className={`${PAPEL} mx-auto max-w-6xl border-2 border-dashed border-tinta/40 p-6 md:p-8`}>
        <dl className="grid gap-5 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {FICHA.map((f) => (
            <div key={f.titulo}>
              <dt className="etiqueta">{f.titulo}</dt>
              <dd className="mt-1 text-base leading-snug">{f.texto}</dd>
            </div>
          ))}
        </dl>
        <a href="#llegar" className="mt-6 inline-flex min-h-11 items-center font-bold underline">
          Ver cómo llegar →
        </a>
      </div>
    </section>
  );
}

// Los platos pasan como en un cartel de pulpería. Va dos veces seguidas para que la cinta no tenga corte.
function Platos() {
  const tira = (
    <span className="flex shrink-0 items-center">
      {PLATOS.map((p) => (
        <span key={p} className="flex items-center">
          <span className="px-6">{p}</span>
          <span className="text-fondo/50">✦</span>
        </span>
      ))}
    </span>
  );
  return (
    <div data-libre aria-label={`Platos: ${PLATOS.join(", ")}`} className="overflow-hidden bg-acento py-4 text-fondo">
      <p aria-hidden className="cinta-platos font-display flex w-max text-2xl whitespace-nowrap md:text-4xl">
        {tira}
        {tira}
      </p>
    </div>
  );
}

// Los dibujos de los tres fuegos se trazan solos cuando aparecen
const DIBUJOS = {
  disco: "M8 30a20 8 0 1 0 40 0a20 8 0 1 0-40 0M2 30h6M48 30h6",
  horno: "M4 46h48M10 46V34a18 18 0 0 1 36 0v12M22 46v-6a6 6 0 0 1 12 0v6",
  pozo: "M4 22h48M14 40q3-6 6 0t6 0M26 34q3-6 6 0t6 0M20 46q3-6 6 0t6 0",
};

function TresFuegos() {
  const quieto = useReducedMotion();
  return (
    <div className={`${PAPEL} relative z-10 col-span-2 border-2 border-tinta p-4 md:p-8`}>
      <div className="grid grid-cols-3 gap-3 text-center">
        {FUEGOS.map((f) => (
          <div key={f.fuego}>
            <svg viewBox="0 0 56 56" aria-hidden className="mx-auto h-14 w-14 text-tinta">
              <motion.path
                d={DIBUJOS[f.dibujo]}
                stroke="currentColor"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                initial={quieto ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2 }}
              />
            </svg>
            <p className="etiqueta mt-3 !text-[0.65rem] md:!text-xs">{f.fuego}</p>
            <p className="mt-1 leading-tight font-bold md:text-xl">{f.plato}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 border-t-2 border-dotted border-tinta/30 pt-4 text-left text-suave">{CHIVITO}</p>
      <p className="mt-2 text-left text-sm text-suave">{ALMACEN}</p>
    </div>
  );
}

// El día contado por horas. En celular primero va el texto y al costado una polaroid chica;
// una mecha de color va llenando la línea punteada mientras se baja.
function Dia() {
  const lista = useRef<HTMLOListElement>(null);
  const quieto = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: lista, offset: ["start 70%", "end 70%"] });

  return (
    <section id="dia" className="grano bg-panel">
      <Guarda />
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
        <header className="md:text-center">
          <p className="etiqueta">Sin apuro</p>
          <h2 className="font-display mt-4 max-w-3xl text-5xl leading-[1.02] md:mx-auto md:text-8xl">Un día entero acá arriba</h2>
          <p className="mx-auto mt-6 hidden max-w-xl text-lg text-suave md:block">No es solo un restaurante: es un lugar para recorrer, comer y quedarse.</p>
        </header>

        <ol ref={lista} className="relative mt-14 md:mt-24">
          <span aria-hidden className="absolute top-2 bottom-0 left-2.5 border-l-2 border-dashed border-tinta/35 md:left-1/2" />
          <motion.span aria-hidden style={{ scaleY: quieto ? 1 : scrollYProgress }} className="absolute top-2 bottom-0 left-2.5 origin-top border-l-2 border-acento md:left-1/2" />
          {PARADAS.map((p, i) => (
            <motion.li
              key={p.titulo}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6 }}
              className="relative grid grid-cols-[1fr_7rem] gap-x-4 gap-y-6 pb-16 pl-11 last:pb-0 md:grid-cols-2 md:items-center md:gap-x-28 md:pl-0"
            >
              <span aria-hidden className="absolute top-2 left-2.5 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-panel bg-acento md:top-[30%] md:left-1/2" />
              <div className={`col-start-2 row-start-1 min-w-0 md:row-start-1 ${i % 2 ? "md:col-start-2" : "md:col-start-1"}`}>
                <motion.figure
                  initial={{ rotate: 0, y: 40, opacity: 0 }}
                  whileInView={{ rotate: i % 2 ? 2 : -2, y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`${PAPEL} relative mx-auto w-[7rem] p-1.5 shadow-[0_22px_44px_-22px_rgba(42,28,18,0.7)] md:w-auto md:max-w-sm md:p-2.5`}
                >
                  <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 -rotate-3 bg-acento/30 md:-top-3 md:h-6 md:w-24" />
                  <img src={p.foto} alt={p.alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </motion.figure>
              </div>
              <div className={`col-start-1 row-start-1 min-w-0 md:row-start-1 ${i % 2 ? "md:col-start-1 md:text-right" : "md:col-start-2"}`}>
                <p className="font-display text-[1.75rem] leading-none text-acento md:text-[clamp(3rem,5.5vw,5.5rem)]">{p.hora}</p>
                {/\d/.test(p.hora) && <p className="etiqueta mt-4">{p.etiqueta}</p>}
                <h3 className="mt-3 text-2xl leading-tight font-bold tracking-tight md:text-4xl">{p.titulo}</h3>
                <p className={`mt-3 max-w-md text-lg leading-relaxed text-suave ${i % 2 ? "md:ml-auto" : ""}`}>{p.texto}</p>
                {p.dato && <p className="mt-4 inline-block rounded-full border-2 border-tinta px-4 py-1.5 text-sm font-bold">De {p.dato}</p>}
              </div>
              {p.fuegos && <TresFuegos />}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Laberinto() {
  return (
    <section id="laberinto" className="bg-monte text-fondo">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:py-32">
        <div>
          <p className="etiqueta !text-fondo/70">Para ir en familia</p>
          <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-6xl">El laberinto temático</h2>
          <ul className="mt-8 divide-y divide-fondo/20 border-y border-fondo/20 text-lg">
            {LABERINTO.map((l) => (
              <li key={l} className="py-4">
                {l}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <img src={foto("pileton")} alt="Un piletón de agua verde del arroyo entre las piedras" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            <figure className="mt-8">
              <img src={foto("tirolesa")} alt="Un chico cruza en tirolesa entre los árboles" loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <figcaption className="mt-2 text-sm text-fondo/80 italic">{NOVEDAD}</figcaption>
            </figure>
          </div>
        </div>

        <aside className="self-start border-2 border-dashed border-tinta/40 bg-fondo p-7 text-tinta md:sticky md:top-16 md:p-9">
          <p className="etiqueta">Entrada al laberinto y piletones</p>
          <dl className="mt-6 space-y-4">
            {ENTRADAS.map(([quien, valor]) => (
              <div key={quien} className="flex items-baseline gap-3">
                <dt className="text-lg font-semibold">{quien}</dt>
                <span className="flex-1 border-b-2 border-dotted border-tinta/30" />
                <dd className="text-xl font-bold">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-suave">Valores y horario (de 10 a 19) publicados en enero de 2026, en temporada de verano. Confirmá antes de ir.</p>
          <a href={INSTAGRAM_LABERINTO} target="_blank" rel="noopener" className="mt-3 inline-flex min-h-11 items-center gap-1 font-bold underline">
            @laberinto_tematico →
          </a>
        </aside>
      </div>
    </section>
  );
}

// El refugio: la foto del interior arriba y el texto montado sobre la vista desde la ventana
function Refugio({ alElegir }: { alElegir: (que: string) => void }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
      {/* La captura trae un óvalo blanco abajo al centro: se recorta agrandando la foto desde arriba */}
      <div className="overflow-hidden">
        <img src={foto("refugio")} alt="El interior del refugio: cama de troncos, salamandra y paredes de ladrillo y madera" loading="lazy" className="aspect-[4/3] w-full origin-top scale-[1.12] object-cover md:aspect-[5/2]" />
      </div>
      <div className="relative mt-12 flex min-h-[32rem] flex-col justify-end overflow-hidden p-6 text-fondo md:min-h-[28rem] md:justify-center md:p-14">
        <img src={foto("ventana")} alt="El monte y el valle vistos desde la ventana del refugio" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-tinta/90 via-tinta/55 to-transparent md:bg-gradient-to-r" />
        <div className="relative">
          <p className="etiqueta !text-fondo/80">Para quedarse</p>
          <h2 className="font-display mt-4 max-w-xl text-5xl leading-[1.02] md:text-8xl">El lujo de no hacer nada</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-fondo/85">{REFUGIO}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {REFUGIO_DATOS.map((d) => (
              <li key={d} className="rounded-full border-2 border-fondo/70 px-3 py-1 text-sm font-bold">
                {d}
              </li>
            ))}
          </ul>
          <a href="#reserva" onClick={() => alElegir(REFUGIO_OPCION)} className="mt-7 inline-block rounded-full bg-fondo px-6 py-3.5 font-bold text-tinta transition hover:bg-acento hover:text-fondo">
            Consultar fechas
          </a>
        </div>
      </div>
    </section>
  );
}

// La reserva como una comanda: lo que se reserva se tilda, y el refugio pide llegada y noches.
function Reserva({ que, setQue, alEnviar }: { que: string; setQue: (que: string) => void; alEnviar: (mensaje: string) => void }) {
  const refugio = que === REFUGIO_OPCION;
  const renglon = "mt-1 w-full border-0 border-b-2 border-dotted border-tinta/45 bg-transparent px-0 py-2 text-lg text-tinta outline-none focus:border-solid focus:border-acento";
  const rotulo = "block text-xs font-bold tracking-[0.18em] text-suave uppercase";

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const lineas = ["Hola! Quiero reservar en Cabeza del Indio.", "", `Reserva: ${que}`];
    lineas.push(refugio ? `Llegada: ${linda(v("dia"))} · Noches: ${v("noches")}` : `Día: ${linda(v("dia"))}`);
    if (!refugio && v("hora")) lineas.push(`Hora aproximada: ${v("hora")}`);
    lineas.push(`Personas: ${v("personas")}`, `A nombre de: ${v("nombre")}`, "", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="reserva" className="bg-tinta bg-[radial-gradient(ellipse_at_bottom,rgb(168_64_31/0.35),transparent_65%)] py-24 text-fondo md:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 md:grid-cols-[0.85fr_1.15fr] md:items-center md:px-10">
        <div>
          <h2 className="font-display text-5xl leading-[1.02] md:text-6xl">Guardate un lugar</h2>
          <p className="mt-8 text-fondo/75">Reservá por WhatsApp o llamando al</p>
          <a href={TELEFONO} className="font-display mt-1 inline-flex min-h-11 items-center text-4xl md:text-5xl">
            {TELEFONO_TEXTO}
          </a>
          <p className="mt-2">
            <a href={INSTAGRAM} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center font-bold underline">
              @cabeza_del_indio
            </a>
          </p>
        </div>

        <div className="rotate-1 drop-shadow-[0_26px_30px_rgba(0,0,0,0.35)]">
          <form onSubmit={enviar} className={`comanda ${PAPEL} grid gap-6 px-6 py-10 text-tinta sm:grid-cols-2 md:px-10 md:py-12`}>
            <div className="sm:col-span-2">
              <div className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="font-display text-3xl md:text-4xl">Comanda</p>
                <p className="text-xs font-bold tracking-[0.2em] text-suave uppercase">Cabeza del Indio</p>
              </div>
              <Guarda />
            </div>
            <fieldset className="sm:col-span-2">
              <legend className={rotulo}>Qué reservás</legend>
              <div className="mt-2 grid gap-1">
                {RESERVAS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-3 border-b-2 border-dotted border-tinta/30 py-2.5 text-lg font-semibold">
                    <input type="radio" name="que" value={r} checked={que === r} onChange={() => setQue(r)} className="peer sr-only" />
                    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center border-2 border-tinta peer-focus-visible:ring-2 peer-focus-visible:ring-acento peer-checked:[&>svg]:opacity-100 [&>svg]:opacity-0">
                      <svg viewBox="0 0 22 22" className="h-4 w-4 text-acento transition-opacity">
                        <path d="M3 11l5 5L19 4" stroke="currentColor" strokeWidth="3" fill="none" />
                      </svg>
                    </span>
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              <span className={rotulo}>{refugio ? "Llegada" : "Día"}</span>
              <input type="date" name="dia" required className={renglon} />
            </label>
            {refugio ? (
              <label>
                <span className={rotulo}>Noches</span>
                <select name="noches" defaultValue="1" className={renglon}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span className={rotulo}>Hora aproximada (opcional)</span>
                <input type="time" name="hora" className={renglon} />
              </label>
            )}
            <label>
              <span className={rotulo}>Personas</span>
              <select key={refugio ? "r" : "m"} name="personas" defaultValue="2" className={renglon}>
                {(refugio ? ["1", "2"] : [...Array.from({ length: 12 }, (_, k) => String(k + 1)), "Más de 12"]).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={rotulo}>A nombre de</span>
              <input name="nombre" required autoComplete="given-name" className={renglon} />
            </label>
            <button type="submit" className="rounded-full bg-acento px-6 py-4 font-bold text-fondo transition hover:brightness-110 sm:col-span-2">
              Reservar por WhatsApp
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Llegar() {
  return (
    <section id="llegar" className="mx-auto grid max-w-6xl gap-10 px-5 py-24 md:grid-cols-2 md:items-center md:px-10 md:py-32">
      <img src={foto("camino")} alt="El camino asfaltado de Pasos Malos, con un cartel de madera al costado y la sierra de fondo" loading="lazy" className="-mx-5 aspect-[4/5] w-[calc(100%+2.5rem)] max-w-none object-cover object-[50%_75%] md:mx-0 md:w-full" />
      <div>
        <p className="etiqueta">Cómo llegar</p>
        <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-6xl">Camino de Pasos Malos</h2>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-suave">A unos 5 km del centro de Villa de Merlo, al pie de las Sierras de los Comechingones.</p>
        <a href={MAPA} target="_blank" rel="noopener" className="mt-8 block w-full rounded-full bg-acento px-6 py-4 text-center font-bold text-fondo transition hover:brightness-110 md:inline-block md:w-auto">
          Cómo llegar desde donde estás
        </a>
      </div>
    </section>
  );
}

// Las preguntas como una carta: centradas, a la vista y separadas por un adorno
function Preguntas({ alEnviar }: { alEnviar: (mensaje: string) => void }) {
  return (
    <section className="mx-auto max-w-2xl px-5 pb-24 text-center md:px-10 md:pb-32">
      <h2 className="font-display text-5xl leading-[1.02] md:text-6xl">Preguntas de la casa</h2>
      <div className="mt-10 grid gap-6 md:gap-8">
        {PREGUNTAS.map(({ p, r }) => (
          <div key={p} className="grid gap-6 md:gap-8">
            <Adorno />
            <div>
              <h3 className="text-xl leading-tight font-bold md:text-2xl">{p}</h3>
              <p className="mt-3 text-lg leading-relaxed text-suave">{r}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => alEnviar("Hola! ¿Me pasan la carta y los precios actuales?\n\nGracias!")} className="mt-12 rounded-full bg-acento px-6 py-4 font-bold text-fondo transition hover:brightness-110">
        Consultar precios por WhatsApp
      </button>
    </section>
  );
}

// Al final, las postales sobre una mesa: se pueden agarrar y mover
const LUGARES = [
  { left: "9%", top: "4%", giro: -8 },
  { left: "36%", top: "0%", giro: 6 },
  { left: "12%", top: "30%", giro: -3 },
  { left: "38%", top: "27%", giro: 9 },
] as const;

function Postales() {
  return (
    <section className="grano overflow-hidden bg-panel pb-24 md:pb-32">
      <Guarda />
      <header className="px-5 pt-20 text-center md:pt-28">
        <h2 className="font-display text-5xl leading-[1.02] md:text-6xl">Postales de la sierra</h2>
        <p className="mx-auto mt-4 max-w-md text-lg">Agarralas y movelas.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-suave">{NOTA_FOTOS}</p>
      </header>
      <Mesa className="mx-auto mt-10 h-[30rem] max-w-3xl px-5 md:h-[34rem]">
        {(limites) =>
          POSTALES.map((f, i) => (
            <Postal key={f.src} limites={limites} giro={LUGARES[i].giro} lugar={LUGARES[i]} className="w-[52vw] max-w-[15rem] md:w-60">
              <img src={f.src} alt={f.alt} draggable={false} className="pointer-events-none aspect-[4/5] w-full object-cover" />
              <p data-libre className="font-display py-3 text-center text-sm md:text-lg">{f.leyenda}</p>
            </Postal>
          ))
        }
      </Mesa>
    </section>
  );
}

// En celular, una barra fija con Reservar y Cómo llegar; no aparece sobre la portada ni sobre la reserva
function BarraCelular() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const vistas = new Map<string, boolean>();
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => vistas.set(e.target.id, e.isIntersecting));
      setVisible(!vistas.get("portada") && !vistas.get("reserva"));
    });
    ["portada", "reserva"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-barra
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="fixed inset-x-0 bottom-0 z-40 flex gap-2 bg-tinta px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <a href="#reserva" className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-acento font-bold text-fondo">
            Reservar
          </a>
          <a href={MAPA} target="_blank" rel="noopener" className="inline-flex h-12 flex-1 items-center justify-center rounded-full border-2 border-fondo/70 font-bold text-fondo">
            Cómo llegar
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Pie() {
  return (
    <footer className="bg-tinta px-5 pt-12 pb-28 text-sm text-fondo/70 md:px-10 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-3xl text-fondo">Cabeza del Indio</p>
        <p className="mt-1">Camino de Pasos Malos · Villa de Merlo, San Luis</p>
        <p className="mt-6 max-w-2xl">
          <b className="text-fondo">Esto es una propuesta de diseño, no la página oficial.</b> Los datos y las fotos salen de las publicaciones de @cabeza_del_indio y @laberinto_tematico (2026). {NOTA_FOTOS} Si el negocio no la quiere, se da de baja.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [que, setQue] = useState(RESERVAS[0]);
  return (
    // Con las animaciones desactivadas en el sistema, nada se desplaza: solo aparece
    <MotionConfig reducedMotion="user">
      <CintaPropuesta negocio={NEGOCIO} />
      <Encabezado />
      <main>
        <Portada />
        <Ficha />
        <Platos />
        <Guarda />
        <TextoQueAparece partes={FRASE} />
        <Dia />
        <Laberinto />
        <Refugio alElegir={setQue} />
        <Reserva que={que} setQue={setQue} alEnviar={setMensaje} />
        <Llegar />
        <Preguntas alEnviar={setMensaje} />
        <Postales />
      </main>
      <Pie />
      <BarraCelular />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="propuesta" tipo="propuesta" alCerrar={() => setMensaje(null)} />
    </MotionConfig>
  );
}
