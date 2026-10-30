import { esTerreno, NEGOCIO, portada, precio, precioEn, precioPorSuperficie, SITIO, superficie, TELEFONO, type Propiedad, WHATSAPP } from "./datos";
import { NOTA_DATOS } from "./textos";

/** Arma un link a otra pantalla. Cada pantalla es una página común: "atrás" y abrir en otra pestaña andan solos. */
export function ir(params: Record<string, string | number | undefined | null> = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
  const s = q.toString();
  return s ? `?${s}` : "./";
}

/** El link para compartir una propiedad: una página chica que trae su foto y su precio para WhatsApp y redirige a la ficha. */
export const linkPropiedad = (id: string) => new URL(`p/${id}/`, location.href.split("?")[0]).href;

/** El chat de WhatsApp de la inmobiliaria con el mensaje ya escrito. Abre directo (lo eligió Matías el 30/10): quien
 *  toque el botón en la propuesta le escribe de verdad a la inmobiliaria. */
export const linkWhatsApp = (mensaje: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

export const LLAMAR = `tel:+54${TELEFONO.replace(/\D/g, "")}`;

const MENU = [
  { href: "./", texto: "Inicio", ver: "" },
  { href: ir({ ver: "propiedades" }), texto: "Propiedades", ver: "propiedades" },
  { href: ir({ ver: "urbanizaciones" }), texto: "Urbanizaciones", ver: "urbanizaciones" },
  { href: ir({ ver: "vender" }), texto: "Vender o tasar", ver: "vender" },
  { href: ir({ ver: "nosotros" }), texto: "Quiénes somos", ver: "nosotros" },
  { href: ir({ ver: "contacto" }), texto: "Contacto", ver: "contacto" },
];

const REDES: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };
const redes = () => Object.entries(SITIO.contacto.redes).filter(([red]) => red !== "youtube_alternativo");
const ICONOS_REDES: Record<string, React.ReactNode> = {
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </g>
  ),
  facebook: <path fill="currentColor" d="M13.5 21v-7h2.5l.5-3.5h-3V8.4c0-1 .3-1.7 1.8-1.7H17V3.6c-.3 0-1.4-.1-2.6-.1-2.6 0-4.3 1.6-4.3 4.4v2.6H7.2V14h2.9v7z" />,
  tiktok: <path fill="currentColor" d="M16.6 3c.4 2.2 1.8 3.6 4 3.8v3.1c-1.5 0-2.9-.4-4-1.2v6.1c0 3.4-2.5 6.2-6 6.2S4.6 18.3 4.6 15c0-3.5 3-6.2 6.6-5.8v3.2c-1.8-.4-3.4.9-3.4 2.6 0 1.5 1.2 2.7 2.8 2.7 1.7 0 2.8-1.3 2.8-3V3z" />,
  youtube: <path fill="currentColor" fillRule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z" />,
};

/** Como el de ellos: el logo, el teléfono a mano y el menú; en el celular, un menú que se despliega. */
export function Encabezado({ actual }: { actual: string }) {
  return (
    <header className="sticky top-8 z-40 border-b border-linea bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="./" className="flex shrink-0 items-center gap-2.5" aria-label="Castro Inmobiliaria, inicio">
          <img src="./fotos/logo.png" alt="" className="h-11 w-auto self-start" />
          <span className="font-display text-[15px] leading-tight font-bold tracking-wide uppercase">
            Castro<span className="block text-[11px] font-semibold tracking-[0.2em] text-suave">Inmobiliaria</span>
          </span>
        </a>
        {/* En la compu el logo lleva al inicio: así el menú entra entero desde 1024 px */}
        <nav className="ml-auto hidden items-center lg:flex xl:gap-1">
          {MENU.filter((m) => m.ver).map((m) => (
            <a key={m.texto} href={m.href} aria-current={actual === m.ver ? "page" : undefined} className="font-display px-1.5 py-2 text-[13px] font-semibold tracking-wide whitespace-nowrap uppercase hover:text-terracota aria-[current=page]:text-terracota aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 xl:px-2">
              {m.texto}
            </a>
          ))}
        </nav>
        {/* Sus redes, como en su encabezado: desde 1280 px, porque en 1024 el menú ya ocupa todo el ancho; para que entren, desde 1024 el botón dice solo el número */}
        <div className="hidden items-center xl:flex" data-redes-encabezado>
          {redes().map(([red, url]) => (
            <a key={red} href={url} target="_blank" rel="noopener" aria-label={REDES[red] ?? red} className="grid h-8 w-8 place-items-center rounded-full text-suave hover:text-terracota">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">{ICONOS_REDES[red]}</svg>
            </a>
          ))}
        </div>
        <a href={LLAMAR} aria-label={`Llamar al ${TELEFONO}`} className="font-display ml-auto flex h-10 items-center rounded-full bg-naranja px-3 text-[13px] font-bold whitespace-nowrap text-chocolate hover:brightness-105 sm:px-4 lg:ml-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" /></svg>
          <span className="hidden sm:inline"><span className="lg:hidden">Llamá </span>{TELEFONO}</span>
        </a>
        <details className="relative lg:hidden">
          <summary className="font-display flex h-10 cursor-pointer list-none items-center rounded-full border border-linea px-4 text-[13px] font-semibold uppercase">Menú</summary>
          <nav className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-linea bg-white py-2 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.35)]">
            {MENU.map((m) => (
              <a key={m.texto} href={m.href} className="block px-5 py-3 text-[16px]">
                {m.texto}
              </a>
            ))}
            <a href={LLAMAR} className="mx-3 mt-1 block rounded-xl bg-naranja px-4 py-3 text-center font-semibold whitespace-nowrap text-chocolate">
              Llamá {TELEFONO}
            </a>
            <p className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-4 pt-3 pb-1 text-[13.5px] text-suave">
              {redes().map(([red, url]) => (
                <a key={red} href={url} target="_blank" rel="noopener" className="underline underline-offset-4">{REDES[red] ?? red}</a>
              ))}
            </p>
          </nav>
        </details>
      </div>
    </header>
  );
}

/** Como el de ellos, gris oscuro: su frase, servicios y empresa, la oficina y los datos legales. */
export function Pie({ pegado = false }: { pegado?: boolean }) {
  const c = SITIO.contacto;
  const rotulo = "font-display text-[12px] font-bold tracking-[0.14em] text-white uppercase";
  return (
    // Abajo queda lugar para el botón de WhatsApp (o la barra de la ficha) en el celular
    <footer className={`${pegado ? "" : "mt-20"} bg-[#3a3a3a] pb-20 text-white/80 md:pb-0`}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 md:col-span-1">
          <img src="./fotos/logofooter.png" alt="Castro Inmobiliaria" className="h-11 w-auto" />
          <p className="mt-5 max-w-xs text-[14px] leading-relaxed">{SITIO.pie.texto}</p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
            {redes().map(([red, url]) => (
              <a key={red} href={url} target="_blank" rel="noopener" className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
                {REDES[red] ?? red}
              </a>
            ))}
          </p>
        </div>
        <div>
          <p className={rotulo}>Servicios</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <li><a href={ir({ ver: "propiedades" })} className="hover:text-white">Comprar</a></li>
            <li><a href={ir({ ver: "vender" })} className="hover:text-white">Vender</a></li>
            <li><a href={ir({ ver: "propiedades", op: "alquiler" })} className="hover:text-white">Alquilar</a></li>
            <li><a href={ir({ ver: "vender" })} className="hover:text-white">Tasación</a></li>
          </ul>
        </div>
        <div>
          <p className={rotulo}>Empresa</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <li><a href={ir({ ver: "nosotros" }) + "#museo"} className="hover:text-white">Museo La Firma</a></li>
            <li><a href={ir({ ver: "nosotros" })} className="hover:text-white">Nosotros</a></li>
            <li><a href={ir({ ver: "urbanizaciones" })} className="hover:text-white">Urbanizaciones</a></li>
            <li><a href={ir({ ver: "contacto" })} className="hover:text-white">Contacto</a></li>
          </ul>
        </div>
        <div className="col-span-2 text-[14px] leading-relaxed md:col-span-1">
          <p className={rotulo}>Oficina</p>
          <p className="mt-3">{c.direccion}</p>
          <p className="mt-1"><a href={LLAMAR} className="hover:text-white">{c.telefono}</a></p>
          <p className="mt-1"><a href={`mailto:${c.email}`} className="hover:text-white">{c.email}</a></p>
        </div>
      </div>
      <div className="border-t border-white/10" data-legales>
        <div className="mx-auto max-w-6xl px-5 py-5 text-[12.5px] leading-relaxed text-white/70 sm:px-6">
          <p>
            {c.razon_social} · CUIT {c.cuit} · {c.corredor_y_matricula.replace("Publico", "Público").replace("Matricula", "Matrícula")} ·{" "}
            <a href={c.afip_data_fiscal} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-white">Data fiscal (ARCA)</a>
          </p>
          <p className="mt-1">{SITIO.pie.legales.join(" ")}</p>
          <p className="mt-3 text-white/60">{NOTA_DATOS} Propuesta de diseño de Matías Trovato, no es la página oficial de {NEGOCIO}.</p>
        </div>
      </div>
    </footer>
  );
}

const ETIQUETA_OP: Record<string, string> = { venta: "Venta", alquiler: "Alquiler" };

export const tipoTexto = (tipo: string) => (tipo === "Hotel" ? "Complejo u hotel" : tipo);
/** "La Arbolada, Villa de Merlo", sin repetir cuando la zona y la localidad son la misma. */
export const lugar = (p: Propiedad) => [p.zona, p.localidad].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");

export function Etiquetas({ p, max = 2 }: { p: Propiedad; max?: number }) {
  if (!p.etiquetas.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5" data-etiquetas>
      {p.etiquetas.slice(0, max).map((e) => (
        <span key={e} className="rounded-full bg-piedra px-2.5 py-0.5 text-[12px] font-semibold text-chocolate">
          {e}
        </span>
      ))}
    </span>
  );
}

/** La imagen de la tarjeta: en los terrenos con forma, el lote sobre la foto satelital (scripts/castro_satelite.py);
 *  la foto real queda en la ficha. Para volver a la foto real en todas, alcanza con devolver portada(p.id). */
export const imagenTarjeta = (p: Propiedad) => (p.mini ? `./fotos/lote-tarjeta-${p.id}.webp` : portada(p.id));

/** Una tarjeta para el listado, sin caja: la imagen arriba y los datos abajo. La de un terreno muestra lo que importa
 *  en un terreno: superficie y precio por m². */
export function Tarjeta({ p, op }: { p: Propiedad; op?: string }) {
  const terreno = esTerreno(p);
  // Cubierta y total construido son cosas distintas (el total suma lo semicubierto): cada una con su nombre
  const construida = p.cubierta ? `${superficie(p.cubierta)} cub.` : p.construido ? `${superficie(p.construido)} construidos` : null;
  const datos = terreno
    ? [superficie(p.terreno), precioPorSuperficie(p, op)]
    : [p.dormitorios && `${p.dormitorios} dorm.`, p.banos && `${p.banos} ${p.banos === 1 ? "baño" : "baños"}`, construida, !construida && superficie(p.terreno) && `${superficie(p.terreno)} de terreno`];
  // El título casi siempre ya dice la zona: entonces abajo va solo el tipo
  const linea = p.zona && p.titulo.toLowerCase().includes(p.zona.toLowerCase()) ? tipoTexto(p.tipo) : `${tipoTexto(p.tipo)} · ${lugar(p)}`;
  return (
    <div data-tarjeta={p.id} data-precio={precioEn(p, op).precio ?? ""} data-tipo={p.tipo} className="tarjeta group relative flex min-w-0 flex-col">
      <a href={ir({ p: p.id })} className="flex flex-1 flex-col">
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-piedra sm:aspect-[4/3]">
          <img src={imagenTarjeta(p)} alt="" loading="lazy" width={560} height={420} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          <span className="absolute top-3 left-3 flex gap-1.5">
            {p.operacion.map((o) => (
              <span key={o} className="rounded-full bg-arena/95 px-2.5 py-1 text-[12px] font-semibold text-chocolate">
                {ETIQUETA_OP[o] ?? o}
              </span>
            ))}
          </span>
          {p.mini && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-chocolate/85 py-1 pr-3 pl-2 text-[12px] font-semibold text-arena" data-mini>
              <span className="h-2.5 w-2.5 rounded-full border border-white bg-naranja" aria-hidden="true" />
              Forma real del lote
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col pt-3">
          <p className="text-[19px] font-semibold tracking-tight tabular-nums" data-precio-texto>{precio(precioEn(p, op)) ?? "Consultar precio"}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[16px] leading-snug font-semibold">{p.titulo}</h3>
          <p className="mt-1 text-[13px] text-suave">
            {linea}
            {p.fotos > 1 && ` · ${p.fotos} fotos`}
          </p>
          {datos.some(Boolean) && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13.5px] font-medium">
              {datos.filter(Boolean).map((d) => (
                <span key={d as string}>{d}</span>
              ))}
            </p>
          )}
          <span className="mt-2">
            <Etiquetas p={p} />
          </span>
        </div>
      </a>
    </div>
  );
}

const ICONO_WHATSAPP = "M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 10 9.9 5.2 16 5.2S27 10 27 15.9 22.1 26.4 16 26.4zm6-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.5z";

export function IconoWhatsApp({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d={ICONO_WHATSAPP} />
    </svg>
  );
}

/** WhatsApp a mano en todas las pantallas (en la ficha ya está la barra de abajo). Abre el chat con un mensaje que dice
 *  qué se estaba mirando: el de ellos abre un chat vacío. Se arma al tocarlo, porque el listado cambia la dirección. */
export function WhatsAppFlotante({ mensaje }: { mensaje: () => string }) {
  return (
    <a
      href={linkWhatsApp(mensaje())}
      onClick={(e) => (e.currentTarget.href = linkWhatsApp(mensaje()))}
      target="_blank"
      rel="noopener"
      data-whatsapp-flotante
      aria-label="Escribir por WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-[#25d366] p-3.5 font-semibold sm:py-3 sm:pr-5 sm:pl-3.5 text-black shadow-[0_12px_30px_-10px_rgb(0_0_0/0.45)] hover:brightness-95"
    >
      <IconoWhatsApp />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}

/** Su mapa dibujado de Merlo con los 22 loteos, tal cual lo tienen en su portada. En el celular ellos lo ocultan;
 *  acá se desliza de costado para que los logos se vean y se puedan tocar. */
export function MapaUrbanizaciones() {
  const { fondo, pines } = SITIO.mapa;
  return (
    <div className="sin-barra -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" data-libre>
      <div className="relative min-w-[820px] overflow-hidden rounded-2xl border border-linea bg-white" data-mapa-urbanizaciones>
        <img src={fondo} alt="Mapa de Villa de Merlo con las urbanizaciones que comercializa Castro" loading="lazy" className="block w-full" />
        {pines.map((pin) => (
          <a
            key={pin.id}
            href={ir({ u: pin.id })}
            title={pin.nombre}
            data-pin={pin.id}
            className="absolute w-[8.3%] -translate-x-1/2 -translate-y-1/2 transition hover:-translate-y-[58%]"
            style={{ top: `${pin.top}%`, left: `${pin.left}%` }}
          >
            <img src={pin.img} alt={pin.nombre} loading="lazy" className="w-full drop-shadow" />
          </a>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-suave sm:hidden">Deslizá el mapa para ver todas.</p>
    </div>
  );
}

/** Título de sección como los de ellos: Montserrat en negrita, con el naranja de la marca. */
export function Titulo({ chico, children, h1 = false, centrado = false }: { chico?: string; children: React.ReactNode; h1?: boolean; centrado?: boolean }) {
  const H = h1 ? "h1" : "h2";
  return (
    <div className={centrado ? "text-center" : ""}>
      {chico && <p className="font-display text-[12px] font-semibold tracking-[0.18em] text-suave uppercase">{chico}</p>}
      <H className="font-display mt-1 text-[1.6rem] leading-tight font-bold text-terracota sm:text-[2rem]">{children}</H>
    </div>
  );
}
