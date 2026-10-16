import { MotionConfig, motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import CintaPropuesta, { NOTA_FOTOS } from "../../../compartido/CintaPropuesta";
import { linda } from "../../../compartido/fechas";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import { ENTRADAS, ESLOGAN, FRASE, HORARIOS, INSTAGRAM, INSTAGRAM_LABERINTO, LABERINTO, MAPA, NEGOCIO, NOVEDAD, PARADAS, PLATOS, POSTALES, PREGUNTAS, REFUGIO, RESERVAS, WHATSAPP_TEXTO, foto } from "./textos";

const PAPEL = "bg-[#fffdf7]";
const Adorno = () => (
  <p aria-hidden className="text-xl text-acento">
    ✦
  </p>
);

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

// En celular la foto va de fondo; en pantallas grandes, mitad cartel y mitad foto.
function Portada() {
  return (
    <section className="relative grid min-h-[100svh] md:grid-cols-2">
      <img src={foto("portada")} alt="Un plato de carne y verduras servido en una olla de barro" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover md:static md:order-2 md:h-[100svh]" />
      <div className="absolute inset-0 bg-gradient-to-t from-tinta via-tinta/60 to-tinta/30 md:hidden" />

      <div className="relative flex flex-col justify-end px-5 pt-44 pb-12 text-fondo md:justify-center md:px-12 md:pt-32 md:pb-16 md:text-tinta">
        <p className="etiqueta !text-fondo/85 md:!text-acento">Restaurante de campo · Casa de té · Laberinto</p>
        <h1 className="font-display mt-5 text-[2.7rem] leading-[1.04] md:text-6xl lg:text-7xl">{ESLOGAN}</h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-fondo/85 md:text-suave">Cocina criolla, mirador 360 y piletones naturales, en el Camino de Pasos Malos.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#reserva" className="rounded-full bg-acento px-6 py-3.5 font-bold text-fondo transition hover:brightness-110">
            Reservar mesa
          </a>
          <a href="#dia" className="rounded-full border-2 border-current px-6 py-3 font-bold transition hover:bg-tinta hover:text-fondo">
            Ver el día completo
          </a>
        </div>
      </div>

      <Sello className="absolute top-28 right-4 z-10 w-24 md:top-auto md:right-auto md:bottom-12 md:left-1/2 md:w-40 md:-translate-x-1/2" />
    </section>
  );
}

// En vez de números sueltos, una sola frase enorme con los datos en color.
function Frase() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-36">
      <p className="font-display text-[2.5rem] leading-[1.08] md:text-7xl md:leading-[1.05]">
        {FRASE.map(([texto, destacado]) => (
          <span key={texto} className={destacado ? "text-acento" : undefined}>
            {texto}
          </span>
        ))}
      </p>
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

// El día contado por horas: una línea punteada con cuatro paradas y las fotos como postales, una a cada lado.
function Dia() {
  return (
    <section id="dia" className="border-t-2 border-tinta bg-panel">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
        <header className="text-center">
          <Adorno />
          <p className="etiqueta mt-4">Sin apuro</p>
          <h2 className="font-display mx-auto mt-4 max-w-3xl text-5xl leading-[1.02] md:text-7xl">Un día entero acá arriba</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-suave">No es solo un restaurante: es un lugar para recorrer, comer y quedarse.</p>
        </header>

        <ol className="relative mt-16 md:mt-24">
          <span aria-hidden className="absolute top-2 bottom-0 left-2.5 border-l-2 border-dashed border-tinta/35 md:left-1/2" />
          {PARADAS.map((p, i) => (
            <motion.li
              key={p.titulo}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative grid gap-7 pb-20 pl-11 last:pb-0 md:grid-cols-2 md:items-center md:gap-28 md:pl-0"
            >
              <span aria-hidden className="absolute top-2 left-2.5 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-panel bg-acento md:top-1/2 md:left-1/2 md:-translate-y-1/2" />
              <div className={`min-w-0 ${i % 2 ? "md:order-2" : ""}`}>
                <figure className={`${PAPEL} relative mx-auto max-w-sm p-2.5 shadow-[0_22px_44px_-22px_rgba(42,28,18,0.7)] ${i % 2 ? "rotate-2" : "-rotate-2"}`}>
                  <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-acento/30" />
                  <img src={p.foto} alt={p.alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </figure>
              </div>
              <div className={`min-w-0 ${i % 2 ? "md:text-right" : ""}`}>
                <p className="font-display text-5xl leading-none text-acento md:text-8xl">{p.hora}</p>
                <p className="etiqueta mt-4">{p.etiqueta}</p>
                <h3 className="font-display mt-2 text-3xl leading-[1.05] md:text-5xl">{p.titulo}</h3>
                <p className={`mt-4 max-w-md text-lg leading-relaxed text-suave ${i % 2 ? "md:ml-auto" : ""}`}>{p.texto}</p>
                {p.dato && <p className="mt-4 inline-block rounded-full border-2 border-tinta px-4 py-1.5 text-sm font-bold">De {p.dato} h</p>}
              </div>
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
          <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-7xl">El laberinto temático</h2>
          <ul className="mt-8 divide-y divide-fondo/20 border-y border-fondo/20 text-lg">
            {LABERINTO.map((l) => (
              <li key={l} className="py-4">
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg">{NOVEDAD}</p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <img src={foto("carpintero")} alt="Escultura de un pájaro carpintero con un cartel de madera" loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />
            <img src={foto("tirolesa")} alt="Un chico cruza en tirolesa entre los árboles" loading="lazy" className="mt-8 aspect-[4/5] w-full rounded-2xl object-cover" />
          </div>
        </div>

        <aside className="self-start rounded-2xl border-2 border-dashed border-tinta/40 bg-fondo p-7 text-tinta md:sticky md:top-16 md:p-9">
          <p className="etiqueta">Entrada al laberinto y piletones</p>
          <dl className="mt-6 space-y-5">
            {ENTRADAS.map(([quien, valor]) => (
              <div key={quien} className="flex items-baseline gap-3">
                <dt className="text-lg font-semibold">{quien}</dt>
                <span className="flex-1 border-b-2 border-dotted border-tinta/30" />
                <dd className="font-display text-3xl text-acento md:text-4xl">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-7 text-sm leading-relaxed text-suave">Valores 2026, publicados en enero. Confirmá el valor actual antes de ir.</p>
          <a href={INSTAGRAM_LABERINTO} target="_blank" rel="noopener" className="mt-5 inline-block font-bold text-tinta underline">
            @laberinto_tematico
          </a>
        </aside>
      </div>
    </section>
  );
}

function Refugio() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
      <img src={foto("refugio")} alt="El interior del refugio: cama de troncos, salamandra y paredes de ladrillo y madera" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover md:aspect-[5/2]" />
      <div className="mt-12 grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <p className="etiqueta">Para quedarse</p>
          <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-7xl">El lujo de no hacer nada</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-suave">{REFUGIO}</p>
          <a href="#reserva" className="mt-8 inline-block rounded-full bg-tinta px-6 py-3.5 font-bold text-fondo transition hover:bg-acento">
            Consultar fechas
          </a>
        </div>
        <img src={foto("ventana")} alt="El monte y el valle vistos desde la ventana del refugio" loading="lazy" className="aspect-[16/9] w-full rounded-2xl object-cover" />
      </div>
    </section>
  );
}

// Las fotos como polaroids desparramadas; se enderezan al pasarles por arriba o al tocarlas.
function Postales() {
  const giros = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2", "rotate-1", "-rotate-3"];
  return (
    <section className="overflow-hidden border-y-2 border-tinta bg-panel py-24 md:py-32">
      <header className="px-5 text-center">
        <Adorno />
        <p className="etiqueta mt-4">El predio</p>
        <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-7xl">Postales de la sierra</h2>
        <p className="mx-auto mt-5 max-w-md text-sm text-suave">{NOTA_FOTOS}</p>
      </header>
      <ul className="mx-auto mt-14 flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-9 px-5 md:gap-x-8 md:gap-y-12 md:px-10">
        {POSTALES.map((f, i) => (
          <li
            key={f.src}
            tabIndex={0}
            className={`${PAPEL} w-[45%] p-2 shadow-[0_18px_36px_-18px_rgba(42,28,18,0.7)] transition duration-300 outline-none hover:z-10 hover:scale-105 hover:rotate-0 focus:z-10 focus:scale-105 focus:rotate-0 md:w-[21%] md:p-3 ${giros[i]} ${i % 2 ? "mt-7" : ""}`}
          >
            <img src={f.src} alt={f.alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />
            <p className="font-display pt-3 pb-1.5 text-center text-sm md:text-lg">{f.leyenda}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// La reserva como una comanda: un talonario de papel donde se marca qué se reserva.
function Reserva({ alEnviar }: { alEnviar: (mensaje: string) => void }) {
  const renglon = "mt-1 w-full border-0 border-b-2 border-dotted border-tinta/45 bg-transparent px-0 py-2 text-lg text-tinta outline-none focus:border-solid focus:border-acento";
  const rotulo = "block text-xs font-bold tracking-[0.18em] text-suave uppercase";

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const lineas = ["Hola! Quiero reservar en Cabeza del Indio.", "", `Reserva: ${v("que")}`, `Día: ${linda(v("dia"))}`, `Personas: ${v("personas")}`];
    if (v("nombre")) lineas.push(`A nombre de: ${v("nombre")}`);
    lineas.push("", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="reserva" className="bg-monte py-24 text-fondo md:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 md:grid-cols-[0.85fr_1.15fr] md:items-center md:px-10">
        <div>
          <p className="etiqueta !text-fondo/70">Reservas</p>
          <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-7xl">Guardate un lugar</h2>
          <dl className="mt-10 divide-y divide-fondo/20 border-y border-fondo/20">
            {HORARIOS.map((h) => (
              <div key={h.titulo} className="py-5">
                <dt className="font-bold">{h.titulo}</dt>
                <dd className="mt-1 text-fondo/75">{h.texto}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rotate-1 drop-shadow-[0_26px_30px_rgba(0,0,0,0.35)]">
          <form onSubmit={enviar} className={`comanda ${PAPEL} grid gap-6 px-6 py-10 text-tinta sm:grid-cols-2 md:px-10 md:py-12`}>
            <div className="flex items-baseline justify-between border-b-2 border-tinta pb-4 sm:col-span-2">
              <p className="font-display text-3xl md:text-4xl">Comanda</p>
              <p className="text-xs font-bold tracking-[0.2em] text-suave uppercase">Cabeza del Indio</p>
            </div>
            <fieldset className="sm:col-span-2">
              <legend className={rotulo}>Qué reservás</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {RESERVAS.map((r, i) => (
                  <label key={r} className="cursor-pointer">
                    <input type="radio" name="que" value={r} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="block rounded-full border-2 border-tinta px-4 py-2 font-bold transition peer-checked:bg-tinta peer-checked:text-fondo peer-focus-visible:ring-2 peer-focus-visible:ring-acento">{r}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              <span className={rotulo}>Día</span>
              <input type="date" name="dia" required className={renglon} />
            </label>
            <label>
              <span className={rotulo}>Personas</span>
              <select name="personas" defaultValue="2" className={renglon}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className={rotulo}>A nombre de</span>
              <input name="nombre" autoComplete="given-name" className={renglon} />
            </label>
            <button type="submit" className="rounded-full bg-acento px-6 py-4 font-bold text-fondo transition hover:brightness-110 sm:col-span-2">
              Reservar por WhatsApp
            </button>
            <p className="text-sm text-suave sm:col-span-2">
              También por WhatsApp o teléfono al {WHATSAPP_TEXTO}, o en{" "}
              <a href={INSTAGRAM} target="_blank" rel="noopener" className="text-tinta underline">
                @cabeza_del_indio
              </a>
              .
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function Llegar() {
  return (
    <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 py-24 md:grid-cols-2 md:px-10 md:py-32">
      <div>
        <p className="etiqueta">Cómo llegar</p>
        <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-7xl">Camino de Pasos Malos</h2>
      </div>
      <div>
        <p className="max-w-md text-lg leading-relaxed text-suave">A unos 5 km del centro de Villa de Merlo, San Luis, subiendo por el Camino de Pasos Malos, al pie de las Sierras de los Comechingones.</p>
        <a href={MAPA} target="_blank" rel="noopener" className="mt-8 inline-block rounded-full border-2 border-tinta px-6 py-3 font-bold transition hover:bg-tinta hover:text-fondo">
          Abrir en Google Maps
        </a>
      </div>
    </section>
  );
}

// Las preguntas como una carta: centradas, a la vista y separadas por un adorno.
function Preguntas() {
  return (
    <section className="mx-auto max-w-2xl px-5 pb-24 text-center md:px-10 md:pb-32">
      <p className="etiqueta">Antes de venir</p>
      <h2 className="font-display mt-4 text-5xl leading-[1.02] md:text-6xl">Preguntas de la casa</h2>
      <div className="mt-12 grid gap-8">
        {PREGUNTAS.map(({ p, r }) => (
          <div key={p} className="grid gap-8">
            <Adorno />
            <div>
              <h3 className="font-display text-2xl leading-tight md:text-3xl">{p}</h3>
              <p className="mt-3 text-lg leading-relaxed text-suave">{r}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="bg-tinta px-5 py-12 text-sm text-fondo/70 md:px-10">
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
  return (
    // Con las animaciones desactivadas en el sistema, las paradas del día aparecen sin desplazarse
    <MotionConfig reducedMotion="user">
      <CintaPropuesta negocio={NEGOCIO} />
      <Encabezado />
      <main>
        <Portada />
        <Platos />
        <Frase />
        <Dia />
        <Laberinto />
        <Postales />
        <Refugio />
        <Reserva alEnviar={setMensaje} />
        <Llegar />
        <Preguntas />
      </main>
      <Pie />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="propuesta" tipo="propuesta" alCerrar={() => setMensaje(null)} />
    </MotionConfig>
  );
}
