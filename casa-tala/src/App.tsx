import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import CintaEjemplo from "../../compartido/CintaEjemplo";
import { linda } from "../../compartido/fechas";
import VistaWhatsApp from "../../compartido/VistaWhatsApp";
import SkyToggle from "./components/SkyToggle";
import { HORARIO_TEXTO, esDeNoche, estaAbierto } from "./horario";
import { CARTA, HORAS_RESERVA, LUGAR, NEGOCIO, foto, pesos, type Modo } from "./textos";

const PAGINA = "café y bar";

function Encabezado({ modo, setModo }: { modo: Modo; setModo: (m: Modo) => void }) {
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 text-white md:px-10">
      <a href="#" className="font-serif text-3xl italic">
        Casa Tala
      </a>
      <nav className="flex items-center gap-6 text-sm font-medium">
        <a href="#carta" className="hidden hover:underline md:inline">La carta</a>
        <a href="#lugar" className="hidden hover:underline md:inline">El lugar</a>
        <a href="#horarios" className="hidden hover:underline md:inline">Horarios</a>
        <span className="hidden sm:block">
          <SkyToggle noche={modo === "noche"} alCambiar={(n) => setModo(n ? "noche" : "dia")} tamano={14} />
        </span>
        <a href="#reserva" className="rounded-full bg-white px-5 py-2.5 font-bold text-black transition hover:bg-white/85">
          Reservar
        </a>
      </nav>
    </header>
  );
}

function Portada({ modo, setModo, abierto }: { modo: Modo; setModo: (m: Modo) => void; abierto: boolean }) {
  const linea = (m: Modo, principal: string, resto: string) => (
    <button
      onClick={() => setModo(m)}
      aria-pressed={modo === m}
      className={`block text-left transition-opacity duration-700 ${modo === m ? "opacity-100" : "opacity-35 hover:opacity-60"}`}
    >
      {principal} <em className="font-normal">{resto}</em>
    </button>
  );

  return (
    <section className="relative flex h-[100svh] min-h-[640px] flex-col justify-end overflow-hidden text-white" data-libre>
      {(["dia", "noche"] as const).map((m) => (
        <img
          key={m}
          src={foto(m)}
          alt={m === "dia" ? "El salón de Casa Tala a la mañana" : "La barra de Casa Tala de noche"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${modo === m ? "opacity-100" : "opacity-0"}`}
          fetchPriority={m === modo ? "high" : "low"}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/55" />

      <div className="relative px-5 pb-24 md:px-10 md:pb-16">
        <p className="flex items-center gap-2.5 text-sm font-semibold tracking-wide" data-estado={abierto ? "abierto" : "cerrado"}>
          <span className={`h-2.5 w-2.5 rounded-full ${abierto ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-white/50"}`} />
          {abierto ? "Abierto ahora" : "Ahora está cerrado"}
        </p>
        <h1 className="mt-5 font-serif text-[15vw] leading-[0.92] font-medium tracking-tight md:text-[8.5rem]">
          {linea("dia", "Café", "de día.")}
          {linea("noche", "Bar", "de noche.")}
        </h1>
        <div className="mt-9 flex items-center gap-5">
          <SkyToggle noche={modo === "noche"} alCambiar={(n) => setModo(n ? "noche" : "dia")} tamano={26} />
          <p className="max-w-[12rem] text-sm leading-snug text-white/80">Tocá el cielo: cambia la casa y cambia la carta.</p>
        </div>
      </div>
    </section>
  );
}

function Carta({ modo }: { modo: Modo }) {
  const secciones = CARTA[modo];
  const [elegida, setElegida] = useState(0);
  useEffect(() => setElegida(0), [modo]);
  const s = secciones[Math.min(elegida, secciones.length - 1)];

  return (
    <section id="carta" className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
      <p className="etiqueta">La carta</p>
      <h2 className="mt-5 font-serif text-5xl leading-none font-medium tracking-tight md:text-8xl">
        {modo === "dia" ? (
          <>
            Mañanas <em className="font-normal">largas</em>
          </>
        ) : (
          <>
            Noches <em className="font-normal">de barra</em>
          </>
        )}
      </h2>

      <div role="tablist" aria-label="Secciones de la carta" className="mt-12 flex gap-5 overflow-x-auto border-b border-linea md:gap-7">
        {secciones.map((sec, i) => (
          <button
            key={sec.titulo}
            role="tab"
            aria-selected={i === elegida}
            onClick={() => setElegida(i)}
            className={`relative pb-4 text-base font-semibold whitespace-nowrap md:text-lg ${i === elegida ? "text-tinta" : "text-suave hover:text-tinta"}`}
          >
            {sec.titulo}
            {i === elegida && <motion.span layoutId="subrayado" className="absolute inset-x-0 -bottom-px h-0.5 bg-acento" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${modo}-${s.titulo}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="mt-10 grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16"
        >
          <img src={foto(s.foto)} alt={s.titulo} className="aspect-[16/10] w-full rounded-sm object-cover md:aspect-[4/5]" />
          <ul className="space-y-7 self-center">
            {s.platos.map((p) => (
              <li key={p.nombre}>
                <div className="flex items-baseline gap-3">
                  <h3 className="font-serif text-2xl font-medium md:text-3xl">{p.nombre}</h3>
                  <span className="flex-1 border-b border-dotted border-suave/60" />
                  <span className="text-lg font-bold tabular-nums">{pesos(p.precio)}</span>
                </div>
                <p className="mt-1 text-suave">{p.detalle}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
      <p className="mt-10 text-sm text-suave">Carta y precios de ejemplo.</p>
    </section>
  );
}

function Lugar() {
  return (
    <section id="lugar" className="bg-tarjeta py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <p className="etiqueta">El lugar</p>
        <h2 className="mt-5 max-w-3xl font-serif text-5xl leading-none font-medium tracking-tight md:text-7xl">
          Una casa vieja, <em className="font-normal">dos momentos</em>
        </h2>
        <div className="mt-14 columns-2 gap-4 md:columns-3 md:gap-6">
          {LUGAR.map((l) => (
            <figure key={l.foto} className="mb-4 break-inside-avoid md:mb-6">
              <img src={foto(l.foto)} alt={l.pie} loading="lazy" className="w-full rounded-sm" />
              <figcaption className="mt-2 text-sm text-suave">{l.pie}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Horarios({ abierto }: { abierto: boolean }) {
  return (
    <section id="horarios" className="mx-auto grid max-w-6xl gap-14 px-5 py-24 md:grid-cols-2 md:px-10 md:py-32">
      <div>
        <p className="etiqueta">Horarios</p>
        <h2 className="mt-5 font-serif text-5xl leading-none font-medium tracking-tight md:text-7xl">
          {abierto ? (
            <>
              Estamos <em className="font-normal">abiertos</em>
            </>
          ) : (
            <>
              Volvé <em className="font-normal">más tarde</em>
            </>
          )}
        </h2>
        <dl className="mt-10 divide-y divide-linea border-y border-linea">
          {HORARIO_TEXTO.map(([dias, horas]) => (
            <div key={dias} className="flex justify-between gap-6 py-4 text-lg">
              <dt>{dias}</dt>
              <dd className="font-bold whitespace-nowrap tabular-nums">{horas}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-suave">A las 19 cambia la carta: baja la luz y abre la barra.</p>
      </div>
      <div>
        <p className="etiqueta">Dónde estamos</p>
        <h2 className="mt-5 font-serif text-5xl leading-none font-medium tracking-tight md:text-7xl">
          En el <em className="font-normal">casco viejo</em>
        </h2>
        <p className="mt-10 text-lg leading-relaxed text-suave">A una cuadra de la plaza, Merlo, San Luis. La dirección es de ejemplo: en tu página va la tuya, con el mapa.</p>
        <a href="https://www.google.com/maps/search/?api=1&query=Villa%20de%20Merlo%2C%20San%20Luis" target="_blank" rel="noopener" className="mt-6 inline-block border-b-2 border-acento pb-1 font-bold">
          Cómo llegar →
        </a>
      </div>
    </section>
  );
}

function Reserva({ alEnviar }: { alEnviar: (mensaje: string) => void }) {
  const campo = "mt-2 w-full rounded-md border border-linea bg-fondo px-3.5 py-3 text-tinta outline-none focus:border-acento";
  const rotulo = "block text-xs font-bold tracking-[0.18em] text-suave uppercase";

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const lineas = [`Hola ${NEGOCIO}! Quiero reservar una mesa.`, "", `Día: ${linda(v("dia"))}`, `Hora: ${v("hora")}`, `Personas: ${v("personas")}`];
    if (v("nombre")) lineas.push(`A nombre de: ${v("nombre")}`);
    lineas.push("", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="reserva" className="bg-tarjeta py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:px-10">
        <div>
          <p className="etiqueta">Reservas</p>
          <h2 className="mt-5 font-serif text-5xl leading-none font-medium tracking-tight md:text-7xl">
            Guardate <em className="font-normal">una mesa</em>
          </h2>
          <p className="mt-6 max-w-sm text-lg text-suave">Te confirmamos por WhatsApp. Para grupos de más de ocho, escribinos con un día de anticipación.</p>
        </div>
        <form onSubmit={enviar} className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={rotulo}>Día</span>
            <input type="date" name="dia" required className={campo} />
          </label>
          <label>
            <span className={rotulo}>Hora</span>
            <select name="hora" defaultValue="21:30" className={campo}>
              {HORAS_RESERVA.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>Personas</span>
            <select name="personas" defaultValue="2" className={campo}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>A nombre de</span>
            <input name="nombre" autoComplete="given-name" className={campo} />
          </label>
          <button type="submit" className="rounded-full bg-acento px-6 py-4 font-bold text-fondo transition hover:opacity-90 sm:col-span-2">
            Reservar por WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="border-t border-linea px-5 pt-14 pb-24 text-suave md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-serif text-4xl text-tinta italic">Casa Tala</p>
        <p className="mt-2">Café de día · Bar de noche · Merlo, San Luis</p>
        <p className="mt-8 max-w-2xl text-sm">
          <b className="text-tinta">Negocio ficticio.</b> Este sitio es una muestra de diseño: la carta, los precios, los horarios y las fotos son de ejemplo. Fotos: Unsplash.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [ahora] = useState(() => new Date());
  const [modo, setModo] = useState<Modo>(() => (esDeNoche(new Date()) ? "noche" : "dia"));
  const [mensaje, setMensaje] = useState<string | null>(null);
  const abierto = estaAbierto(ahora);

  // Los colores cuelgan de data-modo en <html> (ver index.css)
  useEffect(() => {
    document.documentElement.dataset.modo = modo;
  }, [modo]);

  return (
    <>
      <Encabezado modo={modo} setModo={setModo} />
      <main>
        <Portada modo={modo} setModo={setModo} abierto={abierto} />
        <Carta modo={modo} />
        <Lugar />
        <Horarios abierto={abierto} />
        <Reserva alEnviar={setMensaje} />
      </main>
      <Pie />
      <CintaEjemplo pagina={PAGINA} />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina={PAGINA} alCerrar={() => setMensaje(null)} />
    </>
  );
}
