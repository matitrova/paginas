// La portada en el mismo orden que la de su sitio, mejor hecha (30/10): su foto de Merlo con su frase y los tres
// botones, sus destacadas, los 40 años con el equipo, el Museo de La Firma y su mapa dibujado de loteos.
// Los textos son los suyos (sitio.json, con las erratas corregidas por scripts/castro_datos.py).
import { ir, MapaUrbanizaciones, Tarjeta, Titulo } from "./componentes";
import { PROPIEDADES, SITIO } from "./datos";

// De las que ellos destacan en su portada, las 6 más nuevas
const DESTACADAS = PROPIEDADES.filter((p) => p.destacada).sort((a, b) => b.alta.localeCompare(a.alta)).slice(0, 6);

const BOTONES = [
  { texto: "Comprar", href: ir({ ver: "propiedades" }) },
  { texto: "Vender", href: ir({ ver: "vender" }) },
  { texto: "Alquilar", href: ir({ ver: "propiedades", op: "alquiler" }) },
];

export default function Portada() {
  const { inicio, museo } = SITIO;
  const fotoMuseo = museo.fotos.find((f) => f.includes("museoentera")) ?? museo.fotos[0];
  return (
    <>
      {/* Su foto aérea de Merlo con las sierras, con la frase encima y los tres botones, como la tienen ellos */}
      <section className="relative isolate flex min-h-[460px] items-center justify-center overflow-hidden text-center sm:min-h-[560px]" data-portada>
        <img
          src="./fotos/portada-merlo-800.webp"
          srcSet="./fotos/portada-merlo-800.webp 800w, ./fotos/portada-merlo-1600.webp 1600w"
          sizes="100vw"
          alt="Villa de Merlo desde el aire, con las sierras de los Comechingones atrás"
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/35" aria-hidden="true" />
        <div className="px-5 py-16">
          <h1 className="font-display mx-auto max-w-3xl text-[1.7rem] leading-tight font-bold text-balance text-white drop-shadow sm:text-[2.6rem]">
            {inicio.titular.replace(/\s*\n\s*/g, " ")}
          </h1>
          <div className="mt-8 flex flex-wrap justify-center gap-3" data-botones-portada>
            {BOTONES.map((b) => (
              <a key={b.texto} href={b.href} className="font-display min-w-[8.5rem] rounded-full bg-white px-6 py-3.5 text-[14px] font-bold tracking-wider text-chocolate uppercase shadow-lg hover:bg-terracota hover:text-white">
                {b.texto}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-5 sm:px-6" data-destacadas>
        <Titulo centrado>Destacados</Titulo>
        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {DESTACADAS.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
        <div className="mt-9 text-center">
          <a href={ir({ ver: "propiedades" })} className="font-display inline-block rounded-full border-2 border-terracota px-7 py-3 text-[14px] font-bold tracking-wide text-terracota uppercase hover:bg-terracota hover:text-white">
            Ver todas las propiedades
          </a>
        </div>
      </section>

      {/* "Con 40 años de experiencia", con la foto del equipo y "Conocenos", como en su portada */}
      <section className="mt-20 bg-piedra" data-experiencia>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 sm:px-6 md:grid-cols-2">
          <div className="text-center md:text-left">
            <h2 className="font-display text-[1.6rem] leading-tight font-bold sm:text-[2rem]">{inicio.experiencia_titulo}</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-suave">{inicio.experiencia_texto}</p>
            <a href={ir({ ver: "nosotros" })} className="font-display mt-6 inline-block rounded-full bg-terracota px-7 py-3 text-[14px] font-bold tracking-wide text-white uppercase hover:brightness-110">
              Conocenos
            </a>
          </div>
          <img src="./fotos/fondonos.webp" alt="El equipo de Castro Inmobiliaria" loading="lazy" className="order-first w-full rounded-2xl object-cover md:order-none" />
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-6xl items-center gap-8 px-5 sm:px-6 md:grid-cols-2" id="museo" data-museo-portada>
        <div className="text-center md:text-left">
          <h2 className="font-display text-[1.6rem] leading-tight font-bold sm:text-[2rem]">{inicio.museo_titulo}</h2>
          <p className="font-display mt-1 text-[12px] font-semibold tracking-[0.16em] text-suave uppercase">{inicio.museo_bajada}</p>
          <p className="mt-4 text-[16px] leading-relaxed text-suave">{inicio.museo_texto}</p>
          <a href={ir({ ver: "nosotros" }) + "#museo"} className="font-display mt-6 inline-block rounded-full border-2 border-chocolate px-7 py-3 text-[14px] font-bold tracking-wide uppercase hover:bg-chocolate hover:text-white">
            Ver galería
          </a>
        </div>
        <img src={fotoMuseo} alt="El Museo de La Firma, en la oficina de Castro Inmobiliaria" loading="lazy" className="w-full rounded-2xl object-cover" />
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6" data-urbanizaciones-portada>
        <Titulo centrado>Urbanizaciones que comercializamos</Titulo>
        <div className="mt-8">
          <MapaUrbanizaciones />
        </div>
      </section>
    </>
  );
}
