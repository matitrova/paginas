import { ir, MapaUrbanizaciones, Tarjeta, Titulo } from "./componentes";
import { contar, PROPIEDADES, SITIO, TIPOS, URBANIZACIONES } from "./datos";

const venta = PROPIEDADES.filter((p) => p.operacion.includes("venta"));
const alquiler = PROPIEDADES.filter((p) => p.operacion.includes("alquiler"));

// Los botones grandes: lo que más buscan, con la cantidad real
const ACCESOS = [
  { texto: "Casas", cuantas: venta.filter((p) => p.tipo === "Casa").length, href: ir({ ver: "propiedades", tipo: "Casa" }) },
  { texto: "Terrenos", cuantas: venta.filter((p) => p.tipo === "Terreno").length, href: ir({ ver: "propiedades", tipo: "Terreno" }) },
  { texto: "Alquileres", cuantas: alquiler.length, href: ir({ ver: "propiedades", op: "alquiler" }) },
  { texto: "Urbanizaciones", cuantas: URBANIZACIONES.length, href: ir({ ver: "urbanizaciones" }) },
  { texto: TIPOS.Hotel, cuantas: venta.filter((p) => p.tipo === "Hotel").length, href: ir({ ver: "propiedades", tipo: "Hotel" }) },
  { texto: "Campos", cuantas: venta.filter((p) => p.tipo === "Campo").length, href: ir({ ver: "propiedades", tipo: "Campo" }) },
];

const ZONAS = contar(venta, (p) => p.zona).slice(0, 10);

// De las que ellos destacan en su portada, las 6 más nuevas
const DESTACADAS = PROPIEDADES.filter((p) => p.destacada).sort((a, b) => b.alta.localeCompare(a.alta)).slice(0, 6);

export default function Portada() {
  const { inicio, vender, equipo, museo } = SITIO;
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-6 px-5 pt-5 pb-14 sm:gap-8 sm:px-6 sm:pt-10 md:grid-cols-[1.05fr_1fr] md:items-center md:pt-16">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.2em] text-naranja-osc uppercase">Desde 1985 · Villa de Merlo, San Luis</p>
          <h1 className="font-display mt-3 text-[1.85rem] leading-[1.1] text-balance whitespace-pre-line sm:mt-4 sm:text-[3.1rem]">{inicio.titular}</h1>
          <p className="mt-5 hidden max-w-lg text-[17px] leading-relaxed text-tinta/80 sm:block">{inicio.experiencia_texto}</p>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-7" data-botones-portada>
            <a href={ir({ ver: "propiedades" })} className="rounded-full bg-naranja-osc px-6 py-3.5 text-[16px] font-semibold text-white hover:brightness-95">
              Ver las {venta.length} en venta
            </a>
            <a href={ir({ ver: "propiedades", op: "alquiler" })} className="rounded-full border border-tinta/20 px-6 py-3.5 text-[16px] font-semibold hover:bg-hondo">
              Alquileres
            </a>
            <a href={ir({ ver: "vender" })} className="rounded-full border border-tinta/20 px-6 py-3.5 text-[16px] font-semibold hover:bg-hondo">
              Vender o tasar
            </a>
          </div>
        </div>
        <figure className="order-first overflow-hidden rounded-3xl bg-hondo shadow-[0_30px_60px_-34px_rgb(33_28_24/0.6)] md:order-none">
          <img src="./fotos/imagcontact.webp" alt="La oficina de Castro Inmobiliaria en Pbro. Becerra 436, con las sierras atrás" className="aspect-[16/9] h-full w-full object-cover sm:aspect-[4/3]" />
        </figure>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ACCESOS.map((a) => (
            <li key={a.texto}>
              <a href={a.href} data-acceso={a.texto} className="flex h-full flex-col rounded-2xl border border-linea bg-white p-4 transition hover:border-naranja/60 hover:shadow-sm">
                <span className="font-display text-[2rem] leading-none text-naranja-osc">{a.cuantas}</span>
                <span className="mt-2 text-[15px] font-medium">{a.texto}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <p className="text-[13px] font-medium text-suave">Buscar por zona</p>
          <div data-libre className="sin-barra -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {ZONAS.map(([zona, n]) => (
              <a key={zona} href={ir({ ver: "propiedades", zona })} className="shrink-0 rounded-full border border-linea bg-white px-3.5 py-2 text-[14px] whitespace-nowrap hover:border-naranja/60">
                {zona} <span className="text-suave">{n}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <Titulo chico="Destacadas">Elegidas por el equipo</Titulo>
          <a href={ir({ ver: "propiedades" })} className="hidden shrink-0 font-semibold text-naranja-osc sm:block">Ver todas →</a>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DESTACADAS.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
        <a href={ir({ ver: "propiedades" })} className="mt-6 block rounded-full border border-tinta/20 py-3.5 text-center font-semibold sm:hidden">
          Ver las {venta.length} en venta →
        </a>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <Titulo chico={`${URBANIZACIONES.length} urbanizaciones`}>{SITIO.inicio.urbanizaciones_titulo}</Titulo>
          <a href={ir({ ver: "urbanizaciones" })} className="hidden shrink-0 font-semibold text-naranja-osc sm:block">Ver todas →</a>
        </div>
        <div className="mt-6">
          <MapaUrbanizaciones />
        </div>
      </section>

      <section id="vender" className="mt-20 scroll-mt-28 bg-hondo py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 md:grid-cols-2">
          <div>
            <Titulo chico="Vender o tasar">{vender.titular}</Titulo>
            <ol className="mt-6 space-y-3">
              {vender.pasos.map((paso, i) => (
                <li key={paso} className="flex items-center gap-3 text-[16px]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-naranja-osc text-[14px] font-semibold text-white">{i + 1}</span>
                  {paso}
                </li>
              ))}
            </ol>
            <a href={ir({ ver: "vender" })} className="mt-8 inline-block rounded-full bg-tinta px-6 py-3.5 text-[16px] font-semibold text-white hover:bg-tinta/90">
              {vender.boton}
            </a>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {vender.distingue.map((d) => (
              <li key={d.titulo} className="rounded-2xl bg-white p-5">
                <h3 className="text-[14px] font-semibold tracking-wide">{d.titulo.charAt(0) + d.titulo.slice(1).toLowerCase()}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-suave">{d.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-6xl gap-8 px-5 sm:px-6 md:grid-cols-2 md:items-center">
        <figure className="overflow-hidden rounded-3xl">
          <img src={museo.fotos.find((f) => f.includes("camisetas")) ?? museo.fotos[0]} alt="Camisetas firmadas en el Museo de La Firma" loading="lazy" className="aspect-[4/3] w-full object-cover" />
        </figure>
        <div>
          <Titulo chico={inicio.museo_bajada.charAt(0) + inicio.museo_bajada.slice(1).toLowerCase()}>{inicio.museo_titulo}</Titulo>
          <p className="mt-5 text-[16.5px] leading-relaxed text-tinta/80">{inicio.museo_texto}</p>
          <a href={ir({ ver: "nosotros" }) + "#museo"} className="mt-6 inline-block font-semibold text-naranja-osc">Conocer el museo →</a>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6">
        <Titulo chico="El equipo">{SITIO.nosotros.equipo_titulo}</Titulo>
        <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {equipo.map((e) => (
            <li key={e.nombre}>
              <img src={e.foto} alt={e.nombre} loading="lazy" className="aspect-square w-full rounded-2xl object-cover object-top" />
              <p className="mt-3 font-semibold">{e.nombre}</p>
              <p className="text-[13px] leading-snug text-suave">{e.cargo.split("|")[0].trim()}</p>
              {/^\d+$/.test(e.matricula) && <p className="mt-0.5 text-[13px] text-suave">Matrícula {e.matricula}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
