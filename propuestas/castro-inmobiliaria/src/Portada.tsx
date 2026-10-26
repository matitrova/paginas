import { useState } from "react";
import { ir, Tarjeta, Titulo } from "./componentes";
import { contar, PROPIEDADES, SITIO, TIPOS, type Propiedad } from "./datos";
import { PORTADA as T, VENDER } from "./textos";

const venta = PROPIEDADES.filter((p) => p.operacion.includes("venta"));
const conForma = venta.filter((p) => p.mini);
// De la más nueva a la más vieja según la fecha en que la cargaron (no sus destacadas)
const nuevas = [...venta].sort((a, b) => b.alta.localeCompare(a.alta));
const ULTIMAS = nuevas.slice(0, 6);
const FORMA = nuevas.filter((p) => p.mini && !ULTIMAS.includes(p)).slice(0, 6);
const TIPOS_VENTA = contar(venta, (p) => p.tipo);
const ZONAS = contar(venta, (p) => p.zona).slice(0, 12);
const MARTILLEROS = SITIO.equipo.filter((e) => e.cargo.includes("Martillero")).length;

const fecha = (alta: string) => new Date(`${alta}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long" });

/** Tipo y zona, y al listado con eso elegido. Las zonas que se ofrecen son las que tienen de ese tipo. */
function Buscador() {
  const [tipo, setTipo] = useState("");
  const [zona, setZona] = useState("");
  const zonas = contar(venta.filter((p) => !tipo || p.tipo === tipo), (p) => p.zona);
  const campo = "mt-1 h-12 w-full min-w-0 rounded-xl border-0 bg-arena px-3 text-[16px] text-chocolate";
  return (
    <form
      data-buscador
      onSubmit={(e) => {
        e.preventDefault();
        location.href = ir({ ver: "propiedades", tipo, zona });
      }}
      className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <label className="min-w-0 text-[12.5px] font-medium text-arena/80">
        Qué buscás
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            if (zona && !venta.some((p) => p.zona === zona && (!e.target.value || p.tipo === e.target.value))) setZona("");
          }}
          className={campo}
        >
          <option value="">Todo</option>
          {TIPOS_VENTA.map(([t, n]) => (
            <option key={t} value={t}>{`${TIPOS[t] ?? t} (${n})`}</option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-[12.5px] font-medium text-arena/80">
        Dónde
        <select name="zona" value={zona} onChange={(e) => setZona(e.target.value)} className={campo}>
          <option value="">Todas las zonas</option>
          {zonas.map(([z, n]) => (
            <option key={z} value={z}>{`${z} (${n})`}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="col-span-2 h-12 rounded-xl bg-terracota px-6 text-[16px] font-semibold text-white hover:brightness-110 sm:col-span-1">
        {T.buscar}
      </button>
    </form>
  );
}

/** Una fila de tarjetas: en el celular se desliza de costado, en la compu es una grilla. */
function Fila({ lista, fechas = false }: { lista: Propiedad[]; fechas?: boolean }) {
  return (
    <ul data-libre className="sin-barra -mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3">
      {lista.map((p) => (
        <li key={p.id} className="w-[80%] shrink-0 snap-start sm:w-auto">
          {fechas && (
            <p className="mb-2 text-[13px] font-medium text-suave" data-alta={p.alta}>
              Entró el {fecha(p.alta)}
            </p>
          )}
          <Tarjeta p={p} />
        </li>
      ))}
    </ul>
  );
}

function VerTodas({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="shrink-0 text-[15px] font-semibold underline decoration-chocolate/30 underline-offset-4 hover:decoration-chocolate">
      {children} →
    </a>
  );
}

export default function Portada() {
  const { equipo } = SITIO;
  return (
    <>
      {/* Primera pantalla: la foto satelital con los lotes, el titular con los números y el buscador. En el celular,
          el buscador y "Explorar el mapa" entran sin bajar. */}
      <section className="textura-clara grid bg-chocolate text-arena md:min-h-[540px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="px-5 pt-5 pb-8 sm:px-6 md:py-14 md:pr-10 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
          <p className="text-[12px] font-semibold tracking-[0.18em] text-arena/75 uppercase">{T.lugar}</p>
          <h1 className="font-display mt-3 text-[1.9rem] leading-[1.08] tracking-[-0.01em] text-balance sm:text-[2.9rem]">
            <span data-dato="venta">{venta.length}</span> {T.enVenta}
            <span className="sr-only"> · </span>
            <span className="mt-1 block text-naranja italic">
              <span data-dato="forma">{conForma.length}</span> {T.conForma}
            </span>
          </h1>
          {/* Su eslogan, chico y entre comillas: es de ellos */}
          <p className="font-display mt-3 text-[15px] text-arena/75 italic">“{SITIO.inicio.titular.replace(/\s*\n\s*/g, " ")}”</p>
          <Buscador />
          <a href={ir({ ver: "propiedades", mapa: 1 })} data-explorar className="mt-2.5 flex h-12 items-center justify-center gap-2 rounded-xl border border-arena/40 text-[16px] font-semibold hover:bg-arena/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20" />
            </svg>
            {T.explorar}
          </a>
        </div>
        <div className="relative order-first md:order-none">
          <img
            src="./fotos/portada-mapa-800.webp"
            srcSet="./fotos/portada-mapa-800.webp 800w, ./fotos/portada-mapa-1600.webp 1600w"
            sizes="(min-width: 768px) 55vw, 100vw"
            alt="Foto satelital de un barrio de Merlo con los terrenos en venta dibujados en naranja"
            width={1600}
            height={1000}
            fetchPriority="high"
            className="aspect-[16/9] w-full object-cover object-right-bottom md:absolute md:inset-0 md:aspect-auto md:h-full"
          />
          {/* La atribución de la foto también viene dibujada en la esquina, pero en el celular queda ilegible */}
          <p className="absolute right-0 bottom-0 bg-chocolate px-2 py-0.5 text-[11px] text-arena">Foto: Esri, Maxar, Earthstar Geographics</p>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-5 sm:px-6" data-ultimas>
        <div className="flex items-end justify-between gap-4">
          <Titulo chico={T.ultimasChico}>{T.ultimas}</Titulo>
          <span className="hidden sm:block">
            <VerTodas href={ir({ ver: "propiedades" })}>{T.verUltimas}</VerTodas>
          </span>
        </div>
        <Fila lista={ULTIMAS} fechas />
        <p className="mt-5 sm:hidden">
          <VerTodas href={ir({ ver: "propiedades" })}>{T.verUltimas}</VerTodas>
        </p>
      </section>

      <section className="textura mt-16 bg-piedra py-14" data-con-forma>
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <Titulo chico={T.formaChico}>{T.forma}</Titulo>
              <p className="mt-3 text-[16px] leading-relaxed">{T.formaTexto}</p>
            </div>
            <VerTodas href={ir({ ver: "propiedades", tipo: "Terreno" })}>{T.verTerrenos}</VerTodas>
          </div>
          <Fila lista={FORMA} />
        </div>
      </section>

      {/* Actualización 11: acá va el mapa de todas las propiedades, que se carga recién al llegar a esta parte. */}

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6">
        <Titulo chico={T.zonasChico}>{T.zonas}</Titulo>
        <ul className="mt-6 grid border-t border-linea sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
          {ZONAS.map(([zona, n]) => (
            <li key={zona} className="border-b border-linea">
              <a href={ir({ ver: "propiedades", zona })} className="flex items-baseline justify-between gap-4 py-3.5 hover:text-terracota">
                <span className="font-display text-[1.3rem] italic">{zona}</span>
                <span className="shrink-0 text-[14px] text-suave tabular-nums">
                  <span data-dato={`zona:${zona}`}>{n}</span> en venta
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="textura mt-16 bg-piedra py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-6 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <Titulo chico={T.venderChico}>{T.vender}</Titulo>
            <p className="mt-3 max-w-md text-[16px] leading-relaxed">{T.venderTexto}</p>
            <a href={ir({ ver: "vender" })} className="mt-6 inline-block rounded-full bg-terracota px-6 py-3.5 text-[16px] font-semibold text-white hover:brightness-110">
              {T.venderBoton}
            </a>
          </div>
          <ol className="grid grid-cols-2 gap-3">
            {VENDER.pasos.map((paso, i) => (
              <li key={paso} className="rounded-2xl bg-arena p-4">
                <span className="font-display text-[2rem] leading-none text-terracota">{i + 1}</span>
                <p className="mt-2 text-[15px] leading-snug font-medium">{paso}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 40 años, el museo y el equipo, juntos y cortos */}
      <section className="mx-auto mt-16 grid max-w-6xl gap-12 px-5 sm:px-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-linea">
        <div className="md:pr-8">
          <p className="font-display text-[4.5rem] leading-none tracking-[-0.02em] text-terracota">1985</p>
          <p className="mt-4 text-[16px] leading-relaxed">{T.anios}</p>
        </div>
        <div className="md:px-8">
          <img src="./fotos/museo-photo10.webp" alt="Cuadros con fotos y objetos firmados en el Museo de La Firma" loading="lazy" className="aspect-[3/2] w-full rounded-xl object-cover" />
          <h2 className="font-display mt-4 text-[1.6rem] leading-tight">Museo de La Firma</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed">{T.museo}</p>
          <p className="mt-3">
            <VerTodas href={ir({ ver: "nosotros" }) + "#museo"}>{T.verMuseo}</VerTodas>
          </p>
        </div>
        <div className="md:pl-8">
          <div className="flex -space-x-3">
            {equipo.map((e) => (
              <img key={e.nombre} src={e.foto} alt={e.nombre} loading="lazy" className="h-16 w-16 rounded-full border-2 border-arena object-cover object-top" />
            ))}
          </div>
          <h2 className="font-display mt-4 text-[1.6rem] leading-tight">{T.equipo}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed">
            <span data-dato="equipo">{equipo.length}</span> personas, <span data-dato="martilleros">{MARTILLEROS}</span> de ellas martilleros y corredores públicos.
          </p>
          <p className="mt-3">
            <VerTodas href={ir({ ver: "nosotros" })}>{T.verEquipo}</VerTodas>
          </p>
        </div>
      </section>
    </>
  );
}
