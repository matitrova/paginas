import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, type FormEvent } from "react";
import CintaPropuesta, { NOTA_FOTOS } from "../../../compartido/CintaPropuesta";
import Etapas from "../../../compartido/Etapas";
import { diaSiguiente, linda } from "../../../compartido/fechas";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import ZoomParallax from "../../../compartido/ZoomParallax";
import { DATOS, DIRECCION, ESTADIA, ETAPAS, GALERIA, INSTAGRAM, MAPA, MATERIALES, MISION, NEGOCIO, PREGUNTAS, RETIROS, UNICO, WHATSAPP_TEXTO, foto } from "./textos";

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TODO = "inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)";

function Encabezado() {
  return (
    <header className="absolute inset-x-0 top-8 z-30 flex items-center justify-between px-5 py-4 md:px-10">
      <a href="#" className="leading-none">
        <span className="font-display block text-2xl md:text-3xl">Hostería Vegetariana</span>
        <span className="mt-1 block text-[10.5px] font-bold tracking-[0.22em] text-suave uppercase">Eco-aparts de montaña</span>
      </a>
      <a href="#reserva" className="rounded-full bg-acento px-5 py-2.5 text-sm font-bold text-fondo transition hover:brightness-110">
        Consultar
      </a>
    </header>
  );
}

// La foto arranca recortada en arco, como el del balcón, y al bajar se abre hasta llenar la pantalla.
function Portada() {
  const tramo = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: tramo, offset: ["start start", "end end"] });
  // ponytail: el arco se elige al cargar; si cambian el ancho de la ventana, se acomoda al recargar
  const [arco] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? "inset(15% 51% 0% 17% round 16vw 16vw 0vw 0vw)" : "inset(31% 10% 4% 10% round 40vw 40vw 0vw 0vw)",
  );
  const [fijo] = useState(quieto);
  const recorte = useTransform(scrollYProgress, [0, 0.75], [arco, TODO]);
  const titulo = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const cierre = useTransform(scrollYProgress, [0.6, 0.85], [0, 1]);

  return (
    <section ref={tramo} className={fijo ? "relative h-[100svh] min-h-[680px]" : "relative h-[210vh]"} data-libre>
      <div className="sticky top-0 h-[100svh] min-h-[680px] overflow-hidden">
        <motion.div style={{ clipPath: fijo ? arco : recorte }} className="absolute inset-0">
          <img src={foto("portada")} alt="El balcón de piedra de la hostería, con un arco que mira al valle" fetchPriority="high" className="h-full w-full object-cover object-[50%_30%]" />
          <motion.div style={{ opacity: fijo ? 0 : cierre }} className="absolute inset-0 bg-gradient-to-t from-tinta/85 via-tinta/20 to-transparent" />
        </motion.div>

        <motion.div
          style={{ opacity: fijo ? 1 : titulo }}
          className="absolute inset-x-0 top-[13%] px-5 text-center md:inset-y-0 md:top-0 md:right-0 md:left-[55%] md:flex md:flex-col md:justify-center md:pr-10 md:pl-0 md:text-left"
        >
          <p className="etiqueta">Villa de Merlo · San Luis</p>
          <h1 className="font-display mt-3 text-[2.6rem] leading-[0.98] md:mt-5 md:text-7xl lg:text-8xl">
            Habitar el mundo <i className="block text-acento">de otra manera</i>
          </h1>
          <p className="mt-6 hidden max-w-md text-lg leading-relaxed text-suave md:block">Eco-aparts de montaña con cocina 100% vegana, energía del sol y del viento, y las sierras enfrente.</p>
          <a href="#reserva" className="mt-8 hidden w-fit rounded-full bg-acento px-6 py-3.5 font-bold text-fondo transition hover:brightness-110 md:inline-block">
            Consultar fechas
          </a>
        </motion.div>

        <motion.div style={{ opacity: fijo ? 0 : cierre }} className="absolute inset-x-0 bottom-0 px-5 pb-12 text-white md:px-10 md:pb-14">
          <p className="etiqueta !text-white/85">{UNICO}</p>
          <p className="font-display mt-3 max-w-2xl text-4xl leading-[1.02] md:text-6xl">Cocina vegana, energía del sol y las sierras enfrente.</p>
        </motion.div>
      </div>
    </section>
  );
}

function Datos() {
  return (
    <section className="border-y border-linea">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
        {DATOS.map(([numero, texto]) => (
          <div key={numero} className="px-5 py-9 text-center md:py-12">
            <dt className="font-display text-6xl text-acento md:text-7xl">{numero}</dt>
            <dd className="mt-2 text-sm tracking-wide text-suave md:text-base">{texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Mision() {
  return (
    <section className="bg-acento text-fondo">
      <div className="mx-auto max-w-4xl px-5 py-24 text-center md:px-10 md:py-36">
        <p className="etiqueta !text-fondo/75">Nuestra misión</p>
        <p className="font-display mt-8 text-3xl leading-[1.18] md:text-5xl md:leading-[1.15]">{MISION}</p>
      </div>
    </section>
  );
}

function Estadia() {
  return (
    <section id="estadia" className="mx-auto max-w-6xl px-5 pt-24 md:px-10 md:pt-32">
      <p className="etiqueta">La estadía</p>
      <h2 className="font-display mt-4 max-w-3xl text-5xl leading-none md:text-8xl">
        Unos días <i className="text-acento">para bajar un cambio</i>
      </h2>
      <div className="mt-6 md:mt-0">
        <Etapas etapas={ETAPAS} />
      </div>
    </section>
  );
}

function Retiros({ alElegir }: { alElegir: (retiro: string) => void }) {
  return (
    <section id="retiros" className="mt-24 bg-panel md:mt-32">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
        <p className="etiqueta">Agenda</p>
        <h2 className="font-display mt-4 text-5xl leading-none md:text-8xl">Próximos retiros</h2>
        <ol className="mt-12 border-t border-linea">
          {RETIROS.map((r) => (
            <li key={r.nombre} className="grid gap-4 border-b border-linea py-8 md:grid-cols-[13rem_1fr_auto] md:items-center md:gap-10 md:py-10">
              <p className="leading-none">
                <span className="font-display block text-5xl text-acento md:text-6xl">{r.dias}</span>
                <span className="mt-2 block text-xs font-bold tracking-[0.2em] text-suave uppercase">{r.mes}</span>
              </p>
              <div>
                <h3 className="font-display text-3xl leading-tight md:text-4xl">{r.nombre}</h3>
                <p className="mt-2 max-w-xl leading-relaxed text-suave">{r.texto}</p>
                {r.con && <p className="mt-2 text-sm font-semibold text-sol">{r.con}</p>}
              </div>
              <a href="#reserva" onClick={() => alElegir(r.nombre)} className="w-fit rounded-full border border-tinta px-5 py-2.5 text-sm font-bold transition hover:bg-tinta hover:text-fondo">
                Consultar
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-xl text-suave">¿Sos profe de yoga o terapeuta? También recibimos grupos que quieran organizar su propio retiro.</p>
      </div>
    </section>
  );
}

function Construccion() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:grid-cols-2 md:gap-16 md:px-10 md:py-32">
      <img src={foto("edificio")} alt="La hostería de piedra entre los árboles, con las sierras detrás" loading="lazy" className="aspect-[4/5] w-full rounded-t-full object-cover" />
      <div>
        <p className="etiqueta">Cómo está hecha</p>
        <h2 className="font-display mt-4 text-5xl leading-none md:text-7xl">
          De piedra, adobe <i className="text-acento">y sol</i>
        </h2>
        <dl className="mt-10 divide-y divide-linea border-y border-linea">
          {MATERIALES.map((m) => (
            <div key={m.titulo} className="grid grid-cols-[8.5rem_1fr] gap-4 py-5 md:grid-cols-[11rem_1fr]">
              <dt className="font-display text-2xl md:text-3xl">{m.titulo}</dt>
              <dd className="self-center text-suave">{m.texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Reserva({ motivo, alCambiar, alEnviar }: { motivo: string; alCambiar: (motivo: string) => void; alEnviar: (mensaje: string) => void }) {
  const [llegada, setLlegada] = useState("");
  const campo = "mt-2 w-full rounded-lg border border-linea bg-fondo px-3.5 py-3 text-tinta outline-none focus:border-acento";
  const rotulo = "block text-xs font-bold tracking-[0.18em] text-suave uppercase";
  const retiro = RETIROS.find((r) => r.nombre === motivo);

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const lineas = retiro
      ? [`Hola! Quiero consultar por el retiro "${retiro.nombre}" (${retiro.cuando}).`, ""]
      : ["Hola! Quiero consultar por una estadía en la Hostería Vegetariana.", "", `Llegada: ${linda(v("llegada"))}`, `Salida: ${linda(v("salida"))}`];
    lineas.push(`Personas: ${v("personas")}`);
    if (v("nombre")) lineas.push(`A nombre de: ${v("nombre")}`);
    if (v("alergias")) lineas.push(`Alergias: ${v("alergias")}`);
    lineas.push("", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="reserva" className="bg-panel py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:px-10">
        <div>
          <p className="etiqueta">Reservas</p>
          <h2 className="font-display mt-4 text-5xl leading-none md:text-7xl">
            Escribinos <i className="text-acento">y vení</i>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-suave">Las estadías y los retiros se reservan por WhatsApp. Contanos cuándo querés venir y te pasamos disponibilidad y tarifas.</p>
          <img src={foto("ronda")} alt="Un grupo sentado en ronda a la sombra de un árbol" loading="lazy" className="mt-10 hidden aspect-[4/3] w-full rounded-2xl object-cover md:block" />
        </div>

        <form onSubmit={enviar} className="grid content-start gap-5 rounded-2xl border border-linea bg-fondo p-6 sm:grid-cols-2 md:p-8">
          <p className="font-display text-4xl sm:col-span-2">Consultá tu fecha</p>
          <label className="sm:col-span-2">
            <span className={rotulo}>Quiero consultar por</span>
            <select name="motivo" value={motivo} onChange={(e) => alCambiar(e.target.value)} className={campo}>
              <option>{ESTADIA}</option>
              {RETIROS.map((r) => (
                <option key={r.nombre} value={r.nombre}>
                  Retiro: {r.nombre}
                </option>
              ))}
            </select>
          </label>
          {!retiro && (
            <>
              <label>
                <span className={rotulo}>Llegada</span>
                <input type="date" name="llegada" required value={llegada} onChange={(e) => setLlegada(e.target.value)} className={campo} />
              </label>
              <label>
                <span className={rotulo}>Salida</span>
                <input type="date" name="salida" required min={llegada ? diaSiguiente(llegada) : undefined} className={campo} />
              </label>
            </>
          )}
          <label>
            <span className={rotulo}>Personas</span>
            <select name="personas" defaultValue="2" className={campo}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>A nombre de</span>
            <input name="nombre" autoComplete="given-name" className={campo} />
          </label>
          <label className="sm:col-span-2">
            <span className={rotulo}>¿Alguna alergia alimentaria?</span>
            <input name="alergias" placeholder="Opcional" className={campo} />
          </label>
          <button type="submit" className="rounded-full bg-acento px-6 py-4 font-bold text-fondo transition hover:brightness-110 sm:col-span-2">
            Consultar por WhatsApp
          </button>
          <p className="text-sm text-suave sm:col-span-2">
            También por WhatsApp al {WHATSAPP_TEXTO} o en{" "}
            <a href={INSTAGRAM} target="_blank" rel="noopener" className="text-tinta underline">
              @hosteriavegetariana
            </a>
            .
          </p>
        </form>
      </div>
    </section>
  );
}

function Llegar() {
  return (
    <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 py-24 md:grid-cols-2 md:px-10 md:py-32">
      <div>
        <p className="etiqueta">Cómo llegar</p>
        <h2 className="font-display mt-4 text-5xl leading-none md:text-7xl">
          En las primeras <i className="text-acento">sierras</i>
        </h2>
      </div>
      <div>
        <p className="max-w-md text-lg leading-relaxed text-suave">
          {DIRECCION}, Villa de Merlo, San Luis. A unos 3 km de la plaza central y a unos 1.000 metros sobre el nivel del mar.
        </p>
        <a href={MAPA} target="_blank" rel="noopener" className="mt-8 inline-block rounded-full border border-tinta px-6 py-3 font-bold transition hover:bg-tinta hover:text-fondo">
          Abrir en Google Maps
        </a>
      </div>
    </section>
  );
}

function Preguntas() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 md:px-10 md:pb-32">
      <p className="etiqueta">Antes de venir</p>
      <h2 className="font-display mt-4 text-5xl leading-none md:text-7xl">Preguntas frecuentes</h2>
      <div className="mt-10 divide-y divide-linea border-y border-linea">
        {PREGUNTAS.map(({ p, r }) => (
          <details key={p} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-bold">
              {p}
              <span className="text-2xl text-acento transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-suave">{r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="bg-tinta px-5 py-12 text-sm text-fondo/70 md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-4xl text-fondo">Hostería Vegetariana</p>
        <p className="mt-1">{DIRECCION} · Villa de Merlo, San Luis</p>
        <p className="mt-6 max-w-2xl">
          <b className="text-fondo">Esto es una propuesta de diseño, no la página oficial.</b> Los datos y las fotos salen de las publicaciones de @hosteriavegetariana (2025 y 2026). {NOTA_FOTOS} Si el negocio no la quiere, se da de baja.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(ESTADIA);
  return (
    <>
      <CintaPropuesta negocio={NEGOCIO} />
      <Encabezado />
      <main>
        <Portada />
        <Datos />
        <Mision />
        <Estadia />
        <Retiros alElegir={setMotivo} />
        <Construccion />
        <ZoomParallax
          fotos={GALERIA}
          titulo={
            <>
              <p className="etiqueta">El lugar</p>
              <h2 className="font-display mt-4 text-5xl leading-none md:text-8xl">
                Donde la vida <i className="text-acento">encuentra su ritmo</i>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-sm text-suave">{NOTA_FOTOS}</p>
            </>
          }
          leyenda="Unos días para volver a lo esencial."
          leyendaClase="font-display italic"
        />
        <Reserva motivo={motivo} alCambiar={setMotivo} alEnviar={setMensaje} />
        <Llegar />
        <Preguntas />
      </main>
      <Pie />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="propuesta" tipo="propuesta" alCerrar={() => setMensaje(null)} />
    </>
  );
}
