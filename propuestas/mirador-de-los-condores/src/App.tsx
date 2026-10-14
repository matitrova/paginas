import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useRef, useState, type FormEvent } from "react";
import CintaPropuesta, { NOTA_FOTOS } from "../../../compartido/CintaPropuesta";
import { linda } from "../../../compartido/fechas";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import { CUANDO, DURACION, INSTAGRAM, MAPA, NEGOCIO, PREGUNTAS, TAMBIEN, TIRAS, TRAMOS, TURNOS, WHATSAPP_TEXTO, foto } from "./textos";

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dos = (n: number) => String(n).padStart(2, "0");

function Encabezado() {
  return (
    <header className="absolute inset-x-0 top-8 z-30 flex items-center justify-between px-5 py-4 md:px-10">
      <a href="#" className="leading-none">
        <span className="font-display block text-2xl text-white">Circuito Aventura</span>
        <span className="mt-1 block text-[11px] font-semibold tracking-[0.2em] text-white/75 uppercase">Mirador de los Cóndores</span>
      </a>
      <a href="#reserva" className="rounded-full bg-acento px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
        Reservar
      </a>
    </header>
  );
}

// La portada dura dos pantallas: mientras se baja, el altímetro sube hasta los 2100 metros.
function Portada() {
  const tramo = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: tramo, offset: ["start start", "end end"] });
  const altura = useTransform(scrollYProgress, [0, 0.8], [quieto() ? 2100 : 0, 2100], { clamp: true });
  const metros = useTransform(altura, (v) => Math.round(v / 10) * 10);
  const zoom = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const velo = useTransform(scrollYProgress, [0, 0.8], [0.55, 0.2]);

  return (
    <section ref={tramo} className="relative h-[190vh]" data-libre>
      <div className="sticky top-0 flex h-[100svh] min-h-[620px] items-end overflow-hidden">
        <motion.img src={foto("portada")} alt="Dos personas cruzan un puente colgante sobre el valle" style={{ scale: zoom }} className="absolute inset-0 h-full w-full object-cover object-[center_28%]" fetchPriority="high" />
        <motion.div style={{ opacity: velo }} className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-fondo via-transparent to-transparent" />

        <div className="relative w-full px-5 pb-16 md:px-10 md:pb-14">
          <p className="etiqueta !text-white/85">Merlo, San Luis · Filo de la sierra</p>
          <p className="font-display mt-3 flex items-end gap-3 leading-[0.8] text-white">
            <motion.span className="text-[30vw] tabular-nums md:text-[15rem]">{metros}</motion.span>
            <span className="pb-[2vw] text-[7vw] text-acento md:pb-4 md:text-6xl">msnm</span>
          </p>
          <h1 className="font-display mt-5 max-w-3xl text-4xl leading-[1.02] text-white md:text-6xl">El parque aéreo en lo más alto de la sierra</h1>
          <p className="mt-4 max-w-lg text-lg text-white/85">Tirolesas, puentes colgantes y escalada, con todo el valle abajo.</p>
        </div>
      </div>
    </section>
  );
}

// El circuito se recorre de costado: la pantalla queda fija y los tramos pasan mientras se baja.
// Con las animaciones desactivadas, los tramos van uno abajo del otro.
function Circuito() {
  const tramo = useRef<HTMLDivElement>(null);
  const [fijo] = useState(quieto);
  const [activo, setActivo] = useState(0);
  const { scrollYProgress } = useScroll({ target: tramo, offset: ["start start", "end end"] });
  const ultimo = TRAMOS.length - 1;
  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${(ultimo * 100) / TRAMOS.length}%`]);
  useMotionValueEvent(scrollYProgress, "change", (p) => setActivo(Math.round(p * ultimo)));

  return (
    <section id="circuito" className="pt-24 md:pt-32">
      <div className="px-5 md:px-10">
        <p className="etiqueta">El circuito</p>
        <h2 className="font-display mt-4 max-w-4xl text-5xl leading-none md:text-8xl">Cuatro pruebas, {DURACION}</h2>
        <p className="mt-6 max-w-xl text-lg text-suave">Está diseñado para toda la familia. ¿Estás listo para la acción?</p>
      </div>

      <div ref={tramo} data-libre className={fijo ? "mt-12" : "relative mt-6"} style={fijo ? undefined : { height: `${TRAMOS.length * 100}vh` }}>
        <div className={fijo ? "" : "sticky top-0 flex h-[100svh] min-h-[620px] flex-col overflow-hidden pt-14"}>
          {/* La línea de ruta: se completa a medida que se avanza */}
          {!fijo && (
            <div className="px-5 md:px-10">
              <div className="relative h-0.5 bg-linea">
                <motion.div style={{ scaleX: scrollYProgress }} className="absolute inset-0 origin-left bg-acento" />
              </div>
              <ol className="mt-3 flex justify-between text-[11px] font-bold tracking-[0.18em] uppercase md:text-xs">
                {TRAMOS.map((t, i) => (
                  <li key={t.etiqueta} className={`transition-colors duration-300 ${i <= activo ? "text-acento" : "text-suave/60"}`}>
                    {dos(i + 1)}
                    <span className="hidden sm:inline"> · {t.etiqueta}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <motion.div data-pista style={fijo ? undefined : { x, width: `${TRAMOS.length * 100}vw` }} className={fijo ? "grid gap-16" : "flex min-h-0 flex-1"}>
            {TRAMOS.map((t, i) => (
              <article key={t.titulo} className={`grid items-center gap-6 px-5 md:grid-cols-2 md:gap-14 md:px-10 ${fijo ? "" : "h-full w-screen grid-rows-[minmax(0,1fr)_auto] py-6 md:grid-rows-1 md:py-10"}`}>
                <img src={t.foto} alt={t.alt} loading="lazy" className={`w-full rounded-2xl object-cover ${fijo ? "aspect-[4/3]" : "h-full min-h-0"}`} />
                <div className="relative">
                  <span aria-hidden className="font-display absolute -top-[0.62em] right-0 text-[9rem] leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-linea)] md:text-[16rem]">
                    {dos(i + 1)}
                  </span>
                  <p className="etiqueta relative">{t.etiqueta}</p>
                  <h3 className="font-display relative mt-2 text-4xl leading-[1.02] md:mt-3 md:text-7xl">{t.titulo}</h3>
                  {t.dato && <p className="font-display relative mt-2 text-6xl leading-none text-acento md:mt-4 md:text-9xl">{t.dato}</p>}
                  <p className="relative mt-3 max-w-md text-base leading-relaxed text-suave md:mt-5 md:text-lg">{t.texto}</p>
                </div>
              </article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// La reserva en cuatro pasos numerados; el turno se elige tocando un botón.
function Reserva({ alEnviar }: { alEnviar: (mensaje: string) => void }) {
  const [personas, setPersonas] = useState(2);
  const paso = "font-display text-2xl text-acento";
  const rotulo = "mt-1 block text-xs font-bold tracking-[0.18em] text-suave uppercase";
  const campo = "mt-3 w-full rounded-lg border border-linea bg-fondo px-3.5 py-3 text-tinta outline-none focus:border-acento";
  const boton = "grid h-12 w-12 place-items-center rounded-lg border border-linea text-2xl transition hover:border-acento disabled:opacity-30";

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const lineas = ["Hola! Quiero reservar el Circuito Aventura.", "", `Día: ${linda(v("dia"))}`, `Turno: ${v("turno")} h`, `Personas: ${personas}`];
    if (v("nombre")) lineas.push(`A nombre de: ${v("nombre")}`);
    lineas.push("", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="reserva" className="border-y border-linea bg-panel py-24 md:py-32">
      <form onSubmit={enviar} className="mx-auto max-w-6xl px-5 md:px-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <p className="etiqueta">Solo con reserva previa</p>
            <h2 className="font-display mt-4 text-5xl leading-none md:text-8xl">Elegí tu turno</h2>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {CUANDO.map((c) => (
              <div key={c.titulo} className="border-l-2 border-acento pl-4">
                <dt className="font-bold">{c.titulo}</dt>
                <dd className="mt-1 text-suave">{c.texto}</dd>
              </div>
            ))}
          </dl>
        </div>

        <fieldset className="mt-14">
          <legend>
            <span className={paso}>01</span>
            <span className={rotulo}>El horario</span>
          </legend>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {TURNOS.map((t, i) => (
              <label key={t} className="cursor-pointer">
                <input type="radio" name="turno" value={t} defaultChecked={i === 0} className="peer sr-only" />
                <span className="font-display block rounded-xl border border-linea bg-fondo py-6 text-center text-5xl transition peer-checked:border-acento peer-checked:bg-acento peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-white md:py-9 md:text-7xl">
                  {t}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <label>
            <span className={paso}>02</span>
            <span className={rotulo}>El día</span>
            <input type="date" name="dia" required className={campo} />
          </label>
          <div>
            <span className={paso}>03</span>
            <span className={rotulo}>Cuántos son</span>
            <div className="mt-3 flex items-center gap-4">
              <button type="button" aria-label="Sacar una persona" disabled={personas <= 1} onClick={() => setPersonas(personas - 1)} className={boton}>
                −
              </button>
              <output aria-live="polite" className="font-display w-12 text-center text-5xl tabular-nums">
                {personas}
              </output>
              <button type="button" aria-label="Sumar una persona" disabled={personas >= 20} onClick={() => setPersonas(personas + 1)} className={boton}>
                +
              </button>
            </div>
          </div>
          <label>
            <span className={paso}>04</span>
            <span className={rotulo}>A nombre de</span>
            <input name="nombre" autoComplete="given-name" className={campo} />
          </label>
        </div>

        <button type="submit" className="font-display mt-12 w-full rounded-xl bg-acento px-6 py-5 text-3xl text-white transition hover:brightness-110 md:text-4xl">
          Reservar por WhatsApp
        </button>
        <p className="mt-4 text-sm text-suave">
          También por WhatsApp al {WHATSAPP_TEXTO} o en{" "}
          <a href={INSTAGRAM} target="_blank" rel="noopener" className="text-tinta underline">
            @miradordeloscondores
          </a>
          .
        </p>
      </form>
    </section>
  );
}

// Dos tiras de fotos que se cruzan: una corre hacia la izquierda y la otra hacia la derecha.
function Fotos() {
  const tramo = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: tramo, offset: ["start end", "end start"] });
  const ida = useTransform(scrollYProgress, [0, 1], ["0vw", "-34vw"]);
  const vuelta = useTransform(scrollYProgress, [0, 1], ["-34vw", "0vw"]);

  return (
    <section ref={tramo} className="overflow-hidden py-24 md:py-32">
      <div className="px-5 md:px-10">
        <p className="etiqueta">Desde arriba</p>
        <h2 className="font-display mt-4 text-5xl leading-none md:text-8xl">Así se ve</h2>
        <p className="mt-5 max-w-md text-sm text-suave">{NOTA_FOTOS}</p>
      </div>
      <div className="mt-12 grid gap-3 md:gap-4">
        {TIRAS.map((tira, i) => (
          <motion.div key={i} style={{ x: i ? vuelta : ida }} className="flex w-max gap-3 md:gap-4">
            {tira.map((f) => (
              <img key={f.src} src={f.src} alt={f.alt} loading="lazy" className="h-[38vh] w-[52vw] rounded-xl object-cover md:h-[46vh] md:w-[22vw]" />
            ))}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Tambien() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 md:px-10 md:pb-32">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <img src={foto("base")} alt="La base del Circuito Aventura en la cima, vista desde el aire" loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />
        <div>
          <p className="etiqueta">También en el mirador</p>
          <h2 className="font-display mt-4 text-5xl leading-none md:text-7xl">Quedate todo el día</h2>
          <ul className="mt-10 divide-y divide-linea border-y border-linea">
            {TAMBIEN.map((t) => (
              <li key={t.titulo} className="py-5">
                <h3 className="font-display text-3xl">{t.titulo}</h3>
                <p className="mt-1 text-suave">{t.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Llegar() {
  return (
    <section className="relative overflow-hidden">
      <img src={foto("camino")} alt="El camino de montaña que sube al filo, visto desde el aire" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-fondo via-fondo/85 to-fondo/30" />
      <div className="relative mx-auto max-w-6xl px-5 py-28 md:px-10 md:py-40">
        <p className="etiqueta">Cómo llegar</p>
        <h2 className="font-display mt-4 max-w-xl text-5xl leading-none md:text-7xl">El camino ya es parte</h2>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-tinta/85">
          Se sube por la Ruta Provincial 5, pasando el Mirador del Sol, hasta el Filo Serrano. El último tramo, de unos 2 km, es de ripio.
        </p>
        <a href={MAPA} target="_blank" rel="noopener" className="mt-8 inline-block rounded-full border border-white/60 px-6 py-3 font-bold transition hover:bg-white hover:text-fondo">
          Abrir en Google Maps
        </a>
      </div>
    </section>
  );
}

// Las preguntas como una lista de control: numeradas y siempre a la vista.
function Preguntas() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
      <p className="etiqueta">Antes de subir</p>
      <h2 className="font-display mt-4 text-5xl leading-none md:text-8xl">Lo que tenés que saber</h2>
      <ol className="mt-12 grid gap-x-14 border-t border-linea md:grid-cols-2">
        {PREGUNTAS.map(({ p, r }, i) => (
          <li key={p} className="grid grid-cols-[3.5rem_1fr] gap-2 border-b border-linea py-7">
            <span aria-hidden className="font-display text-4xl leading-none text-acento">
              {dos(i + 1)}
            </span>
            <div>
              <h3 className="font-display text-2xl leading-tight md:text-3xl">{p}</h3>
              <p className="mt-2 leading-relaxed text-suave">{r}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Pie() {
  return (
    <footer className="border-t border-linea px-5 py-12 text-sm text-suave md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-3xl text-tinta">Circuito Aventura</p>
        <p className="mt-1">Mirador de los Cóndores · Filo Serrano, Merlo, San Luis</p>
        <p className="mt-6 max-w-2xl">
          <b className="text-tinta">Esto es una propuesta de diseño, no la página oficial.</b> Los datos y las fotos salen de las publicaciones de @miradordeloscondores (octubre de 2026). {NOTA_FOTOS} Si el negocio no la quiere, se da de baja.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <>
      <CintaPropuesta negocio={NEGOCIO} />
      <Encabezado />
      <main>
        <Portada />
        <Circuito />
        <Reserva alEnviar={setMensaje} />
        <Fotos />
        <Tambien />
        <Llegar />
        <Preguntas />
      </main>
      <Pie />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="propuesta" tipo="propuesta" alCerrar={() => setMensaje(null)} />
    </>
  );
}
