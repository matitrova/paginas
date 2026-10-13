import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, type FormEvent } from "react";
import CintaPropuesta from "../../../compartido/CintaPropuesta";
import Etapas from "../../../compartido/Etapas";
import { linda } from "../../../compartido/fechas";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import ZoomParallax from "../../../compartido/ZoomParallax";
import { CUANDO, DATOS, ETAPAS, GALERIA, INSTAGRAM, MAPA, NEGOCIO, PREGUNTAS, TAMBIEN, TURNOS, WHATSAPP_TEXTO, foto } from "./textos";

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

function Datos() {
  return (
    <section className="border-y border-linea bg-panel">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-linea md:grid-cols-4">
        {DATOS.map(([numero, texto]) => (
          <div key={numero} className="bg-panel px-5 py-8 md:px-8 md:py-10">
            <dt className="font-display text-5xl text-acento md:text-6xl">{numero}</dt>
            <dd className="mt-2 text-sm leading-snug text-suave md:text-base">{texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Circuito() {
  return (
    <section id="circuito" className="mx-auto max-w-6xl px-5 pt-24 md:px-10 md:pt-32">
      <p className="etiqueta">El circuito</p>
      <h2 className="font-display mt-4 max-w-3xl text-5xl leading-none md:text-8xl">Cuatro pruebas, dos horas</h2>
      <p className="mt-6 max-w-xl text-lg text-suave">Está diseñado para toda la familia. ¿Estás listo para la acción?</p>
      <div className="mt-6 md:mt-0">
        <Etapas etapas={ETAPAS} />
      </div>
    </section>
  );
}

function Reserva({ alEnviar }: { alEnviar: (mensaje: string) => void }) {
  const campo = "mt-2 w-full rounded-lg border border-linea bg-fondo px-3.5 py-3 text-tinta outline-none focus:border-acento";
  const rotulo = "block text-xs font-bold tracking-[0.18em] text-suave uppercase";

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const lineas = ["Hola! Quiero reservar el Circuito Aventura.", "", `Día: ${linda(v("dia"))}`, `Turno: ${v("turno")} h`, `Personas: ${v("personas")}`];
    if (v("nombre")) lineas.push(`A nombre de: ${v("nombre")}`);
    lineas.push("", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="reserva" className="bg-panel py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:px-10">
        <div>
          <p className="etiqueta">Cuándo ir</p>
          <h2 className="font-display mt-4 text-5xl leading-none md:text-7xl">Solo con reserva previa</h2>
          <dl className="mt-10 divide-y divide-linea border-y border-linea">
            {CUANDO.map((c) => (
              <div key={c.titulo} className="py-5">
                <dt className="font-bold">{c.titulo}</dt>
                <dd className="mt-1 text-suave">{c.texto}</dd>
              </div>
            ))}
            <div className="py-5">
              <dt className="font-bold">Turnos</dt>
              <dd className="mt-3 flex flex-wrap gap-2">
                {TURNOS.map((t) => (
                  <span key={t} className="font-display rounded-md border border-acento/60 px-3 py-1.5 text-2xl text-acento">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <form onSubmit={enviar} className="grid content-start gap-5 rounded-2xl border border-linea bg-fondo p-6 sm:grid-cols-2 md:p-8">
          <p className="font-display text-3xl sm:col-span-2">Reservá tu turno</p>
          <label>
            <span className={rotulo}>Día</span>
            <input type="date" name="dia" required className={campo} />
          </label>
          <label>
            <span className={rotulo}>Turno</span>
            <select name="turno" className={campo}>
              {TURNOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>Personas</span>
            <select name="personas" defaultValue="2" className={campo}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>A nombre de</span>
            <input name="nombre" autoComplete="given-name" className={campo} />
          </label>
          <button type="submit" className="rounded-full bg-acento px-6 py-4 font-bold text-white transition hover:brightness-110 sm:col-span-2">
            Reservar por WhatsApp
          </button>
          <p className="text-sm text-suave sm:col-span-2">
            También por WhatsApp al {WHATSAPP_TEXTO} o en{" "}
            <a href={INSTAGRAM} target="_blank" rel="noopener" className="text-tinta underline">
              @miradordeloscondores
            </a>
            .
          </p>
        </form>
      </div>
    </section>
  );
}

function Tambien() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
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

function Preguntas() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-24 md:px-10 md:py-32">
      <p className="etiqueta">Antes de subir</p>
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
    <footer className="border-t border-linea px-5 py-12 text-sm text-suave md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-3xl text-tinta">Circuito Aventura</p>
        <p className="mt-1">Mirador de los Cóndores · Filo Serrano, Merlo, San Luis</p>
        <p className="mt-6 max-w-2xl">
          <b className="text-tinta">Esto es una propuesta de diseño, no la página oficial.</b> Los datos y las fotos salen de las publicaciones de @miradordeloscondores (octubre de 2026). Si el negocio no la quiere, se da de baja.
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
        <Datos />
        <Circuito />
        <ZoomParallax
          fotos={GALERIA}
          titulo={
            <>
              <p className="etiqueta">Desde arriba</p>
              <h2 className="font-display mt-4 text-5xl leading-none md:text-8xl">Así se ve</h2>
            </>
          }
          leyenda="Todo el valle, a tus pies."
          leyendaClase="font-display"
        />
        <Reserva alEnviar={setMensaje} />
        <Tambien />
        <Llegar />
        <Preguntas />
      </main>
      <Pie />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="propuesta" tipo="propuesta" alCerrar={() => setMensaje(null)} />
    </>
  );
}
