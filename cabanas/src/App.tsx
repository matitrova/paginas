import { useState, type FormEvent, type ReactNode } from "react";
import CintaEjemplo from "../../compartido/CintaEjemplo";
import { diaSiguiente, fecha, linda } from "../../compartido/fechas";
import VistaWhatsApp from "../../compartido/VistaWhatsApp";
import ZoomParallax from "../../compartido/ZoomParallax";
import { CABANAS, CREDITOS, DATOS, GALERIA, NEGOCIO, PREGUNTAS, SERVICIOS, foto } from "./textos";

const PAGINA = "cabañas";

const ICONOS: Record<string, ReactNode> = {
  pileta: <path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5S16 17 18 17s2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5S16 21 18 21s2-1.5 4-1.5M7 13V5.5a2 2 0 0 1 4 0M13 13V5.5a2 2 0 0 1 4 0M7 9h6" />,
  fuego: <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.7-2.5 1.5-3.5.3 1.2 1 1.8 1.5 2 0-2.5.3-5 1-7zM5 21h14" />,
  wifi: <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />,
  taza: <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2.5M12 3v2.5" />,
  auto: <path d="M4 16v-3l1.8-5a2 2 0 0 1 1.9-1.3h8.6a2 2 0 0 1 1.9 1.3L20 13v3M4 13h16M3 16h18v2.5H3zM7 18.5V20M17 18.5V20" />,
  huella: (
    <>
      <path d="M12 13c-2.5 0-4.5 2-4.5 4 0 1.5 1.2 2 2.2 2 .9 0 1.4-.4 2.3-.4s1.4.4 2.3.4c1 0 2.2-.5 2.2-2 0-2-2-4-4.5-4z" />
      <circle cx="6.5" cy="10.5" r="1.4" />
      <circle cx="10" cy="6.5" r="1.4" />
      <circle cx="14" cy="6.5" r="1.4" />
      <circle cx="17.5" cy="10.5" r="1.4" />
    </>
  ),
  cama: (
    <>
      <path d="M3 19V7M3 15h18v4M21 15v-2a3 3 0 0 0-3-3h-7v5" />
      <circle cx="7" cy="11.5" r="1.6" />
    </>
  ),
  lena: (
    <>
      <circle cx="8" cy="16.5" r="3.3" />
      <circle cx="16" cy="16.5" r="3.3" />
      <circle cx="12" cy="9.5" r="3.3" />
    </>
  ),
};

const Icono = ({ nombre }: { nombre: string }) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7 flex-none text-sierra" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {ICONOS[nombre]}
  </svg>
);

function Encabezado() {
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 text-white md:px-10">
      <a href="#" className="font-serif text-2xl tracking-tight">
        Cielo de Piedra
      </a>
      <nav className="flex items-center gap-7 text-sm">
        <a href="#cabanas" className="hidden hover:underline md:inline">Las cabañas</a>
        <a href="#servicios" className="hidden hover:underline md:inline">Servicios</a>
        <a href="#llegar" className="hidden hover:underline md:inline">Cómo llegar</a>
        <a href="#fechas" className="rounded-full bg-papel px-5 py-2.5 font-semibold text-tinta transition hover:bg-white">
          Consultar fechas
        </a>
      </nav>
    </header>
  );
}

function Portada() {
  return (
    <section className="relative flex h-[100svh] min-h-[620px] items-end overflow-hidden">
      <img src={foto("portada")} alt="Cabañas entre el monte, con la sierra de los Comechingones atrás" className="acercar absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/45" />
      <div className="relative w-full px-5 pb-24 text-white md:px-10 md:pb-20">
        <p className="text-xs font-semibold tracking-[0.26em] uppercase">Cabañas en la sierra · Merlo, San Luis</p>
        <h1 className="mt-4 max-w-4xl font-serif text-[13vw] leading-[0.95] font-light tracking-tight md:text-8xl">
          Despertá con la sierra <em className="font-normal">en la ventana.</em>
        </h1>
        <a href="#cabanas" className="mt-8 inline-flex items-center gap-2 border-b border-white/60 pb-1 text-sm tracking-wide">
          Conocé las cabañas <span aria-hidden>↓</span>
        </a>
      </div>
    </section>
  );
}

function Presentacion() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
      <p className="etiqueta">El lugar</p>
      <p className="mt-6 max-w-4xl font-serif text-3xl leading-snug font-light md:text-5xl md:leading-[1.15]">
        Tres cabañas de piedra y madera entre talas y molles, al pie de los Comechingones. Silencio, aire de sierra y el centro de Merlo <em>a cinco minutos.</em>
      </p>
      <dl className="mt-16 grid grid-cols-3 gap-6 border-t border-tinta/15 pt-8">
        {DATOS.map(([numero, texto]) => (
          <div key={texto}>
            <dt className="font-serif text-4xl font-light md:text-6xl">{numero}</dt>
            <dd className="mt-2 text-sm text-musgo md:text-base">{texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Cabanas({ elegir }: { elegir: (nombre: string) => void }) {
  return (
    <section id="cabanas" className="bg-arena/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <p className="etiqueta">Las cabañas</p>
        <h2 className="mt-5 font-serif text-5xl font-light tracking-tight md:text-7xl">
          Tres maneras <em>de quedarse</em>
        </h2>
        <div className="mt-16 space-y-20 md:space-y-28">
          {CABANAS.map((c, i) => (
            <article key={c.nombre} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <img src={foto(c.foto)} alt={`Interior de la cabaña ${c.nombre}`} loading="lazy" className={`aspect-[4/3] w-full rounded-sm object-cover ${i % 2 ? "md:order-2" : ""}`} />
              <div>
                <p className="text-sm font-semibold tracking-[0.2em] text-arcilla uppercase">{c.capacidad}</p>
                <h3 className="mt-3 font-serif text-4xl font-light md:text-6xl">{c.nombre}</h3>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-musgo">{c.texto}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {c.tiene.map((t) => (
                    <li key={t} className="rounded-full border border-tinta/20 px-3.5 py-1.5 text-sm">
                      {t}
                    </li>
                  ))}
                </ul>
                <a href="#fechas" onClick={() => elegir(c.nombre)} className="mt-8 inline-block rounded-full bg-sierra px-6 py-3 font-semibold text-papel transition hover:bg-tinta">
                  Consultar {c.nombre}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Servicios() {
  return (
    <section id="servicios" className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-32">
      <p className="etiqueta">Servicios</p>
      <h2 className="mt-5 font-serif text-5xl font-light tracking-tight md:text-7xl">
        Todo lo que <em>ya está</em>
      </h2>
      <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4">
        {SERVICIOS.map(([icono, texto]) => (
          <li key={texto} className="flex items-start gap-3.5 border-t border-tinta/15 pt-5">
            <Icono nombre={icono} />
            <span className="leading-snug">{texto}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fechas({ cabana, setCabana, alEnviar }: { cabana: string; setCabana: (c: string) => void; alEnviar: (mensaje: string) => void }) {
  const [llegada, setLlegada] = useState("");
  const campo = "mt-2 w-full rounded-md border border-tinta/25 bg-papel px-3.5 py-3 outline-none focus:border-sierra";
  const rotulo = "block text-xs font-semibold tracking-[0.18em] text-musgo uppercase";

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const noches = Math.round((fecha(v("salida")).getTime() - fecha(v("llegada")).getTime()) / 86_400_000);
    const lineas = [
      `Hola ${NEGOCIO}! Quiero consultar disponibilidad.`,
      "",
      `Cabaña: ${v("cabana")}`,
      `Llegada: ${linda(v("llegada"))}`,
      `Salida: ${linda(v("salida"))} (${noches} ${noches === 1 ? "noche" : "noches"})`,
      `Personas: ${v("personas")}`,
    ];
    if (v("nombre")) lineas.push(`Mi nombre: ${v("nombre")}`);
    lineas.push("", "Gracias!");
    alEnviar(lineas.join("\n"));
  };

  return (
    <section id="fechas" className="bg-sierra py-24 text-papel md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[1fr_1.1fr] md:px-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.26em] text-papel/70 uppercase">Reservá directo</p>
          <h2 className="mt-5 font-serif text-5xl font-light tracking-tight md:text-7xl">
            Consultá <em>tus fechas</em>
          </h2>
          <p className="mt-6 max-w-sm text-lg text-papel/80">Te respondemos por WhatsApp en el día, con el valor y la disponibilidad. Sin intermediarios ni comisiones.</p>
        </div>
        <form onSubmit={enviar} className="grid gap-5 rounded-lg bg-papel p-6 text-tinta sm:grid-cols-2 md:p-8">
          <label className="sm:col-span-2">
            <span className={rotulo}>Cabaña</span>
            <select name="cabana" value={cabana} onChange={(e) => setCabana(e.target.value)} className={campo}>
              {CABANAS.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre} · {c.capacidad.toLowerCase()}
                </option>
              ))}
              <option value="La que esté libre">La que esté libre</option>
            </select>
          </label>
          <label>
            <span className={rotulo}>Llegada</span>
            <input type="date" name="llegada" required value={llegada} onChange={(e) => setLlegada(e.target.value)} className={campo} />
          </label>
          <label>
            <span className={rotulo}>Salida</span>
            <input type="date" name="salida" required min={llegada ? diaSiguiente(llegada) : undefined} className={campo} />
          </label>
          <label>
            <span className={rotulo}>Personas</span>
            <select name="personas" defaultValue="2" className={campo}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={rotulo}>Tu nombre</span>
            <input name="nombre" autoComplete="given-name" className={campo} />
          </label>
          <button type="submit" className="rounded-full bg-arcilla px-6 py-4 font-semibold text-white transition hover:bg-tinta sm:col-span-2">
            Consultar por WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}

function Llegar() {
  return (
    <section id="llegar" className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-24 md:grid-cols-2 md:px-10 md:py-32">
      <img src={foto("valle")} alt="El valle de Conlara visto desde la sierra" loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />
      <div>
        <p className="etiqueta">Cómo llegar</p>
        <h2 className="mt-5 font-serif text-5xl font-light tracking-tight md:text-6xl">
          Cerca de todo, <em>lejos del ruido</em>
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-musgo">A cinco minutos del centro de Merlo, camino al Mirador del Sol. El último tramo es de ripio y se hace con cualquier auto.</p>
        <a href="https://www.google.com/maps/search/?api=1&query=Villa%20de%20Merlo%2C%20San%20Luis" target="_blank" rel="noopener" className="mt-7 inline-block border-b border-tinta pb-1 font-semibold">
          Ver Merlo en Google Maps →
        </a>
      </div>
    </section>
  );
}

function Resenas() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 md:px-10">
      <div className="rounded-lg border-2 border-dashed border-tinta/25 px-6 py-12 text-center">
        <p className="etiqueta">Opiniones</p>
        <p className="mx-auto mt-4 max-w-xl font-serif text-3xl font-light md:text-4xl">Acá van tus reseñas de Google.</p>
        <p className="mx-auto mt-3 max-w-md text-musgo">En tu página se muestran las opiniones reales de tu Perfil de Empresa. En este ejemplo no inventamos ninguna.</p>
      </div>
    </section>
  );
}

function Preguntas() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-28 md:px-10">
      <p className="etiqueta">Antes de venir</p>
      <h2 className="mt-5 font-serif text-5xl font-light tracking-tight md:text-6xl">
        Preguntas <em>de siempre</em>
      </h2>
      <div className="mt-10 divide-y divide-tinta/15 border-y border-tinta/15">
        {PREGUNTAS.map(({ p, r }) => (
          <details key={p} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
              {p}
              <span className="text-2xl font-light text-arcilla transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-musgo">{r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="bg-tinta px-5 pt-14 pb-24 text-papel/75 md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-serif text-3xl text-papel">Cielo de Piedra</p>
        <p className="mt-2">Cabañas en la sierra · Merlo, San Luis</p>
        <p className="mt-8 max-w-2xl text-sm">
          <b className="text-papel">Negocio ficticio.</b> Este sitio es una muestra de diseño: los datos, las condiciones y las fotos son de ejemplo.{" "}
          <a href={CREDITOS.link} target="_blank" rel="noopener" className="underline">
            {CREDITOS.texto}
          </a>{" "}
          Resto de las fotos: Unsplash.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [cabana, setCabana] = useState(CABANAS[0].nombre);
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <>
      <Encabezado />
      <main>
        <Portada />
        <Presentacion />
        <Cabanas elegir={setCabana} />
        <Servicios />
        <ZoomParallax
          fotos={GALERIA}
          titulo={
            <>
              <p className="etiqueta">Un día acá</p>
              <h2 className="mt-4 font-serif text-5xl font-light tracking-tight md:text-7xl">
                Pileta, asado <em>y siesta</em>
              </h2>
            </>
          }
          leyenda="La pileta mira a la sierra."
        />
        <Fechas cabana={cabana} setCabana={setCabana} alEnviar={setMensaje} />
        <Llegar />
        <Resenas />
        <Preguntas />
      </main>
      <Pie />
      <CintaEjemplo pagina={PAGINA} />
      <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina={PAGINA} alCerrar={() => setMensaje(null)} />
    </>
  );
}
