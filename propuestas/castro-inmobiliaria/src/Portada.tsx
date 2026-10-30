// La portada como una revista (Actualización 17): su foto de Merlo sin velo con su frase al lado y un buscador, sus
// destacadas, los terrenos con su forma real (lo que no tiene ningún portal), los 40 años, el museo y las
// urbanizaciones en fotos. Los textos son los suyos (sitio.json, con las erratas corregidas por scripts/castro_datos.py).
import { BOTON, BOTON_BORDE, ir, Tarjeta, Titulo } from "./componentes";
import { PROPIEDADES, precio, SITIO, superficie, URBANIZACIONES } from "./datos";
import { nombreLindo } from "./Ficha";

// De las que ellos destacan en su portada, las 6 más nuevas
const DESTACADAS = PROPIEDADES.filter((p) => p.destacada).sort((a, b) => b.alta.localeCompare(a.alta)).slice(0, 6);
// Los 3 terrenos con lote dibujado y precio más nuevos
const CON_FORMA = PROPIEDADES.filter((p) => p.mini && p.precio).sort((a, b) => b.alta.localeCompare(a.alta)).slice(0, 3);
const urbanizaciones = [...URBANIZACIONES].sort((a, b) => b.propiedades.length - a.propiedades.length).slice(0, 8);
const ROTULO = "text-[12px] font-semibold tracking-[0.18em] text-terracota uppercase";

export default function Portada() {
  const { inicio, museo } = SITIO;
  const fotoMuseo = museo.fotos.find((f) => f.includes("museoentera")) ?? museo.fotos[0];
  return (
    <>
      {/* Su foto aérea de Merlo, sin velo, y al lado su frase y el buscador */}
      <section className="mx-auto grid max-w-6xl sm:px-6 md:mt-8 md:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] md:items-center md:gap-12" data-portada>
        <img
          src="./fotos/portada-merlo-800.webp"
          srcSet="./fotos/portada-merlo-800.webp 800w, ./fotos/portada-merlo-1600.webp 1600w"
          sizes="(min-width: 768px) 66vw, 100vw"
          alt="Villa de Merlo desde el aire, con las sierras de los Comechingones atrás"
          fetchPriority="high"
          className="aspect-[4/3] w-full object-cover sm:rounded-[3px] md:aspect-[5/4] lg:aspect-[4/3]"
        />
        <div className="px-5 pt-7 sm:px-0">
          <p className={ROTULO}>Villa de Merlo · desde 1985</p>
          <h1 className="font-display mt-3 text-[2.05rem] leading-[1.12] font-medium text-balance sm:text-[2.6rem]">{inicio.titular.replace(/\s*\n\s*/g, " ")}</h1>
          <form action="./" method="get" role="search" className="mt-7 flex" data-buscador-portada>
            <input type="hidden" name="ver" value="propiedades" />
            <label className="sr-only" htmlFor="buscar-portada">Buscar por código, zona o palabra</label>
            <input id="buscar-portada" name="q" type="search" placeholder="Código, zona o palabra" className="h-12 min-w-0 flex-1 rounded-l-md border border-r-0 border-chocolate/30 bg-arena px-4 text-[16px] placeholder:text-suave" />
            <button className={`${BOTON} rounded-l-none`}>Buscar</button>
          </form>
          <a href="#forma-real" className="mt-5 inline-block text-[15px] font-semibold text-terracota underline decoration-naranja decoration-2 underline-offset-[6px]">
            Ver los terrenos con su forma real →
          </a>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6" data-destacadas>
        <Titulo chico="Las que elegimos">Destacados</Titulo>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {DESTACADAS.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
        <a href={ir({ ver: "propiedades" })} className={`${BOTON_BORDE} mt-10`}>
          Ver todas las propiedades
        </a>
      </section>

      {/* Lo que no tiene ningún portal: el lote dibujado con su forma del catastro sobre la foto satelital */}
      <section id="forma-real" className="mx-auto mt-20 max-w-6xl scroll-mt-28 border-t border-linea px-5 pt-14 sm:px-6" data-forma-real>
        <div className="max-w-2xl">
          <Titulo chico="Lo que no muestra ningún portal">Terrenos con su forma real</Titulo>
          <p className="mt-4 text-[16.5px] leading-relaxed text-suave">Cada lote, dibujado con su forma del catastro sobre la foto satelital, con la medida de cada lado.</p>
        </div>
        <div className="mt-9 grid gap-x-6 gap-y-10 md:grid-cols-3">
          {CON_FORMA.map((p) => (
            <a key={p.id} href={ir({ p: p.id })} className="group" data-lamina={p.id}>
              <div className="overflow-hidden rounded-[3px] bg-piedra">
                <img src={`./fotos/lote-tarjeta-${p.id}.webp`} alt={`El lote de ${p.titulo}, dibujado sobre la foto satelital`} loading="lazy" width={560} height={420} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <p className="font-display text-[18px] leading-snug font-medium">{p.zona || p.titulo}</p>
                <p className="font-display shrink-0 text-[18px] font-medium tabular-nums">{precio(p)}</p>
              </div>
              <p className="mt-0.5 text-[13.5px] text-suave">{superficie(p.terreno)}</p>
            </a>
          ))}
        </div>
        <a href={ir({ ver: "propiedades", tipo: "Terreno" })} className={`${BOTON_BORDE} mt-10`}>
          Ver todos los terrenos
        </a>
      </section>

      {/* "Con 40 años de experiencia", con la foto del equipo, en un bloque arena */}
      <section className="mt-20 bg-piedra" data-experiencia>
        <div className="mx-auto grid max-w-6xl items-center gap-9 px-5 py-16 sm:px-6 md:grid-cols-2 md:gap-14">
          <img src="./fotos/fondonos.webp" alt="El equipo de Castro Inmobiliaria" loading="lazy" className="w-full rounded-[3px] object-cover" />
          <div>
            <p className={ROTULO}>Desde 1985</p>
            <h2 className="font-display mt-3 text-[1.85rem] leading-tight font-medium sm:text-[2.4rem]">{inicio.experiencia_titulo}</h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-suave">{inicio.experiencia_texto}</p>
            <a href={ir({ ver: "nosotros" })} className={`${BOTON} mt-7`}>
              Conocenos
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-6xl items-center gap-9 px-5 sm:px-6 md:grid-cols-2 md:gap-14" id="museo" data-museo-portada>
        <div className="md:order-2">
          <img src={fotoMuseo} alt="El Museo de La Firma, en la oficina de Castro Inmobiliaria" loading="lazy" className="w-full rounded-[3px] object-cover" />
        </div>
        <div>
          <p className={ROTULO}>{inicio.museo_bajada}</p>
          <h2 className="font-display mt-3 text-[1.85rem] leading-tight font-medium sm:text-[2.4rem]">{inicio.museo_titulo}</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-suave">{inicio.museo_texto}</p>
          <a href={ir({ ver: "nosotros" }) + "#museo"} className={`${BOTON_BORDE} mt-7`}>
            Ver galería
          </a>
        </div>
      </section>

      {/* Las urbanizaciones en una fila de fotos; su mapa dibujado queda en la página de Urbanizaciones */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6" data-urbanizaciones-portada>
        <Titulo chico="Urbanizaciones que comercializamos">{inicio.urbanizaciones_titulo}</Titulo>
        <div data-libre className="sin-barra -mx-5 mt-8 flex snap-x gap-4 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-6 sm:overflow-visible sm:px-0">
          {urbanizaciones.map((u) => (
            <a key={u.id} href={ir({ u: u.id })} data-urbanizacion={u.id} className="group w-[62%] shrink-0 snap-start sm:w-auto">
              <div className="aspect-[4/5] overflow-hidden rounded-[3px] bg-piedra">
                {u.fotos.length > 0 && <img src={u.fotos[1] ?? u.fotos[0]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />}
              </div>
              <p className="font-display mt-3 text-[18px] leading-snug font-medium">{nombreLindo(u.nombre)}</p>
            </a>
          ))}
        </div>
        <a href={ir({ ver: "urbanizaciones" })} className="mt-8 inline-block text-[15px] font-semibold text-terracota underline decoration-naranja decoration-2 underline-offset-[6px]">
          Ver el mapa de loteos →
        </a>
      </section>
    </>
  );
}
