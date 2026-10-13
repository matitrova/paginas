import { INSTAGRAM_MATIAS, contacto } from "../../compartido/contacto";
import Estrellas from "./components/Estrellas";
import { EJEMPLOS, INCLUYE, PASOS, PORTFOLIO, PREGUNTAS, captura } from "./textos";

const CONTACTO = contacto();

function BotonContacto({ grande = false }: { grande?: boolean }) {
  return (
    <a
      href={CONTACTO.href}
      target={CONTACTO.canal === "whatsapp" ? "_blank" : undefined}
      rel="noopener"
      data-contacto={CONTACTO.canal}
      className={`inline-flex items-center justify-center rounded-full font-semibold text-fondo transition hover:brightness-110 ${CONTACTO.canal === "whatsapp" ? "bg-wa" : "bg-white"} ${grande ? "px-8 py-4 text-lg" : "px-5 py-2.5 text-sm"}`}
    >
      {CONTACTO.etiqueta}
    </a>
  );
}

function Encabezado() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-fondo/75 px-5 py-3.5 backdrop-blur md:px-10">
      <a href="#" className="font-display text-lg font-bold">
        Matías Trovato
      </a>
      <nav className="flex items-center gap-6 text-sm text-suave">
        <a href="#ejemplos" className="hidden hover:text-tinta md:inline">Ejemplos</a>
        <a href="#incluye" className="hidden hover:text-tinta md:inline">Qué incluye</a>
        <a href="#preguntas" className="hidden hover:text-tinta md:inline">Preguntas</a>
        <BotonContacto />
      </nav>
    </header>
  );
}

function Portada() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-24 md:grid-cols-[1.3fr_0.7fr] md:px-10 md:pt-24 md:pb-32">
      <div>
        <p className="etiqueta">Páginas web · Merlo, San Luis</p>
        <h1 className="mt-6 font-display text-[13vw] leading-[0.95] font-bold tracking-tight md:text-5xl lg:text-[4.1rem]">
          Tu comercio, <span className="degrade block md:whitespace-nowrap">con página propia.</span>
        </h1>
        <p className="mt-7 max-w-lg text-xl leading-relaxed text-suave">
          Cada negocio con su estilo. <b className="font-semibold text-tinta">Lista en una semana,</b> y de los cambios me ocupo yo.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <BotonContacto grande />
          <a href="#ejemplos" className="border-b border-suave/60 pb-1 font-semibold hover:border-tinta">
            Ver ejemplos ↓
          </a>
        </div>
      </div>

      {/* Tres celulares en abanico, como en el flyer */}
      <div className="relative mx-auto aspect-[10/11] w-full max-w-md text-[clamp(8px,2.4vw,13px)]" aria-hidden>
        <div className="telefono absolute top-[8%] left-[2%] w-[38%] -rotate-[7deg]">
          <img src={captura("cabanas-movil")} alt="" />
        </div>
        <div className="telefono absolute top-[8%] right-[2%] w-[38%] rotate-[7deg]">
          <img src={captura("casa-tala-movil")} alt="" />
        </div>
        <div className="telefono absolute top-0 left-1/2 z-10 w-[42%] -translate-x-1/2">
          <img src={captura("autoshine-movil")} alt="" />
        </div>
      </div>
    </section>
  );
}

function Ejemplos() {
  return (
    <section id="ejemplos" className="mx-auto max-w-6xl px-5 py-24 md:px-10">
      <p className="etiqueta">Ejemplos</p>
      <h2 className="mt-5 max-w-3xl font-display text-5xl leading-none font-bold tracking-tight md:text-7xl">
        Tres rubros, <span className="degrade">tres estilos.</span>
      </h2>
      <p className="mt-6 max-w-xl text-lg text-suave">Entrá desde el celular y probalas: tocá los botones, pedí un turno, consultá una fecha.</p>

      {/* En pantallas grandes las tarjetas se apilan al bajar: cada una queda pegada un poco más abajo que la anterior.
          En celular van una debajo de la otra: apiladas, una tarjeta más alta que la pantalla escondería su botón. */}
      <div className="mt-14 space-y-8">
        {EJEMPLOS.map((e, i) => (
          <article
            key={e.id}
            className="grid items-center gap-8 overflow-hidden rounded-3xl md:sticky border border-white/10 bg-panel p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.55)] md:grid-cols-[1.25fr_1fr] md:gap-12 md:p-10"
            style={{ top: `${5 + i * 1.25}rem` }}
          >
            <div className="relative pr-[12%] pb-[6%] text-[clamp(7px,1.5vw,11px)]">
              <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                <div className="flex gap-1.5 bg-[#16171f] px-3 py-2">
                  <i className="h-2 w-2 rounded-full bg-white/20" />
                  <i className="h-2 w-2 rounded-full bg-white/20" />
                  <i className="h-2 w-2 rounded-full bg-white/20" />
                </div>
                <img src={captura(`${e.id}-pc`)} alt={`La página de ${e.nombre} en una computadora`} loading="lazy" className="block w-full" />
              </div>
              <div className="telefono absolute right-0 bottom-0 w-[24%]">
                <img src={captura(`${e.id}-movil`)} alt={`La página de ${e.nombre} en un celular`} loading="lazy" />
              </div>
            </div>
            <div>
              <p className="flex flex-wrap items-center gap-2.5 text-sm">
                <span className="rounded-full border border-cian/50 px-3 py-1 font-mono text-xs tracking-wider text-cian uppercase">{e.rubro}</span>
                <span className="text-suave">{e.tipo}</span>
              </p>
              <h3 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">{e.nombre}</h3>
              <p className="mt-4 leading-relaxed text-suave">{e.texto}</p>
              <ul className="mt-5 space-y-2">
                {e.puntos.map((p) => (
                  <li key={p} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-acento" />
                    {p}
                  </li>
                ))}
              </ul>
              <a href={e.href} target="_blank" rel="noopener" data-ejemplo={e.id} className="mt-7 inline-flex rounded-full border border-acento/70 px-5 py-2.5 font-semibold text-acento transition hover:bg-acento hover:text-fondo">
                Ver en vivo →
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Incluye() {
  return (
    <section id="incluye" className="mx-auto max-w-6xl px-5 py-24 md:px-10">
      <p className="etiqueta">Qué incluye</p>
      <h2 className="mt-5 max-w-3xl font-display text-5xl leading-none font-bold tracking-tight md:text-7xl">
        Vos atendés. <span className="degrade">De la página me ocupo yo.</span>
      </h2>
      <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {INCLUYE.map((x, i) => (
          <div key={x.titulo} className="bg-panel p-7 md:p-9">
            <span className="font-mono text-xs text-cian">0{i + 1}</span>
            <h3 className="mt-3 font-display text-2xl font-bold">{x.titulo}</h3>
            <p className="mt-2 leading-relaxed text-suave">{x.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pasos() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-10">
      <p className="etiqueta">Cómo trabajo</p>
      <h2 className="mt-5 font-display text-5xl leading-none font-bold tracking-tight md:text-7xl">
        En tres <span className="degrade">pasos.</span>
      </h2>
      <ol className="mt-14 grid gap-10 md:grid-cols-3">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="border-t border-white/15 pt-6">
            <span className="degrade font-display text-7xl font-bold">{i + 1}</span>
            <h3 className="mt-2 font-display text-3xl font-bold">{p.titulo}</h3>
            <p className="mt-3 leading-relaxed text-suave">{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Preguntas() {
  return (
    <section id="preguntas" className="mx-auto max-w-3xl px-5 py-24 md:px-10">
      <p className="etiqueta">Preguntas</p>
      <h2 className="mt-5 font-display text-5xl leading-none font-bold tracking-tight md:text-6xl">Lo que me preguntan siempre</h2>
      <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
        {PREGUNTAS.map(({ p, r }) => (
          <details key={p} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
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

function Cierre() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10 pb-28 md:px-10">
      <div className="rounded-[2rem] border border-acento/40 bg-gradient-to-br from-acento-fuerte/35 to-cian/10 px-6 py-16 text-center md:py-20">
        <p className="etiqueta">Presupuesto sin compromiso</p>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-none font-bold tracking-tight md:text-7xl">Contame de tu negocio.</h2>
        <p className="mx-auto mt-6 max-w-md text-lg text-suave">Soy Matías, de Merlo. Me escribís, lo charlamos y te paso el precio según lo que necesites.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <BotonContacto grande />
          {INSTAGRAM_MATIAS && (
            <a href={`https://instagram.com/${INSTAGRAM_MATIAS}`} target="_blank" rel="noopener" className="font-semibold text-acento hover:underline">
              @{INSTAGRAM_MATIAS}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="border-t border-white/10 px-5 py-10 text-sm text-suave md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 md:flex-row">
        <p>Matías Trovato · Páginas web para comercios · Merlo, San Luis</p>
        <a href={PORTFOLIO} target="_blank" rel="noopener" className="hover:text-tinta">
          Quién soy: mi portfolio →
        </a>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Estrellas />
      <Encabezado />
      <main>
        <Portada />
        <Ejemplos />
        <Incluye />
        <Pasos />
        <Preguntas />
        <Cierre />
      </main>
      <Pie />
    </>
  );
}
