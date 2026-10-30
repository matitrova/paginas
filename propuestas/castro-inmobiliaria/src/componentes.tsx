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

/** El logo con "Castro" en la serif, el menú en mayúsculas chicas, sus redes y el teléfono; en el celular, un menú
 *  que se despliega. */
export function Encabezado({ actual }: { actual: string }) {
  return (
    <header className="sticky top-8 z-40 border-b border-linea bg-arena/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="./" className="flex shrink-0 items-center gap-2.5" aria-label="Castro Inmobiliaria, inicio">
          <img src="./fotos/logo.png" alt="" className="h-11 w-auto self-start" />
          <span className="font-display text-[23px] leading-none font-medium">
            Castro<span className="mt-1 block font-sans text-[10px] font-semibold tracking-[0.26em] text-suave uppercase">Inmobiliaria</span>
          </span>
        </a>
        {/* En la compu el logo lleva al inicio: así el menú entra entero desde 1024 px */}
        <nav className="ml-auto hidden items-center lg:flex xl:gap-1">
          {MENU.filter((m) => m.ver).map((m) => (
            <a key={m.texto} href={m.href} aria-current={actual === m.ver ? "page" : undefined} className="px-1.5 py-2 text-[12.5px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase hover:text-terracota aria-[current=page]:underline aria-[current=page]:decoration-naranja aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 xl:px-2">
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
        <a href={LLAMAR} aria-label={`Llamar al ${TELEFONO}`} className="ml-auto flex h-10 items-center rounded-md bg-chocolate px-3 text-[13px] font-semibold tracking-wide whitespace-nowrap text-arena hover:bg-terracota sm:px-4 lg:ml-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" /></svg>
          <span className="hidden sm:inline"><span className="lg:hidden">Llamá </span>{TELEFONO}</span>
        </a>
        <details className="relative lg:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-chocolate/30 px-4 text-[12.5px] font-semibold tracking-[0.12em] uppercase">Menú</summary>
          <nav className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-linea bg-arena py-2 shadow-[0_18px_40px_-24px_rgb(43_36_32/0.5)]">
            {MENU.map((m) => (
              <a key={m.texto} href={m.href} className="block px-5 py-3 text-[16px]">
                {m.texto}
              </a>
            ))}
            <a href={LLAMAR} className="mx-3 mt-1 block rounded-md bg-chocolate px-4 py-3 text-center font-semibold whitespace-nowrap text-arena">
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

/** En tinta cálida con letra hueso: su frase, servicios y empresa, la oficina y los datos legales. */
export function Pie({ pegado = false }: { pegado?: boolean }) {
  const c = SITIO.contacto;
  const rotulo = "text-[12px] font-semibold tracking-[0.16em] text-arena uppercase";
  return (
    // Abajo queda lugar para el botón de WhatsApp (o la barra de la ficha) en el celular
    <footer className={`${pegado ? "" : "mt-20"} bg-chocolate pb-20 text-arena/80 md:pb-0`}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 md:col-span-1">
          <img src="./fotos/logofooter.png" alt="Castro Inmobiliaria" className="h-11 w-auto" />
          <p className="mt-5 max-w-xs text-[14px] leading-relaxed">{SITIO.pie.texto}</p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
            {redes().map(([red, url]) => (
              <a key={red} href={url} target="_blank" rel="noopener" className="underline decoration-arena/40 underline-offset-4 hover:decoration-arena">
                {REDES[red] ?? red}
              </a>
            ))}
          </p>
        </div>
        <div>
          <p className={rotulo}>Servicios</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <li><a href={ir({ ver: "propiedades" })} className="hover:text-arena">Comprar</a></li>
            <li><a href={ir({ ver: "vender" })} className="hover:text-arena">Vender</a></li>
            <li><a href={ir({ ver: "propiedades", op: "alquiler" })} className="hover:text-arena">Alquilar</a></li>
            <li><a href={ir({ ver: "vender" })} className="hover:text-arena">Tasación</a></li>
          </ul>
        </div>
        <div>
          <p className={rotulo}>Empresa</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <li><a href={ir({ ver: "nosotros" }) + "#museo"} className="hover:text-arena">Museo La Firma</a></li>
            <li><a href={ir({ ver: "nosotros" })} className="hover:text-arena">Nosotros</a></li>
            <li><a href={ir({ ver: "urbanizaciones" })} className="hover:text-arena">Urbanizaciones</a></li>
            <li><a href={ir({ ver: "contacto" })} className="hover:text-arena">Contacto</a></li>
          </ul>
        </div>
        <div className="col-span-2 text-[14px] leading-relaxed md:col-span-1">
          <p className={rotulo}>Oficina</p>
          <p className="mt-3">{c.direccion}</p>
          <p className="mt-1"><a href={LLAMAR} className="hover:text-arena">{c.telefono}</a></p>
          <p className="mt-1"><a href={`mailto:${c.email}`} className="hover:text-arena">{c.email}</a></p>
        </div>
      </div>
      <div className="border-t border-arena/10" data-legales>
        <div className="mx-auto max-w-6xl px-5 py-5 text-[12.5px] leading-relaxed text-arena/70 sm:px-6">
          <p>
            {c.razon_social} · CUIT {c.cuit} · {c.corredor_y_matricula.replace("Publico", "Público").replace("Matricula", "Matrícula")} ·{" "}
            <a href={c.afip_data_fiscal} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-arena">Data fiscal (ARCA)</a>
          </p>
          <p className="mt-1">{SITIO.pie.legales.join(" ")}</p>
          <p className="mt-3 text-arena/60">{NOTA_DATOS} Propuesta de diseño de Matías Trovato, no es la página oficial de {NEGOCIO}.</p>
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
    <span className="block text-[11.5px] font-semibold tracking-[0.1em] text-terracota uppercase" data-etiquetas>
      {p.etiquetas.slice(0, max).join(" · ")}
    </span>
  );
}

/** Los dos botones del sitio: el principal, relleno en tinta, y el de borde fino. Mayúsculas espaciadas, sin sombra. */
export const BOTON = "inline-flex items-center justify-center gap-2 rounded-md bg-chocolate px-6 py-3 text-[13px] font-semibold tracking-[0.12em] text-arena uppercase hover:bg-terracota";
export const BOTON_BORDE = "inline-flex items-center justify-center gap-2 rounded-md border border-chocolate/60 px-6 py-3 text-[13px] font-semibold tracking-[0.12em] uppercase hover:bg-chocolate hover:text-arena";

/** La forma de un lote (lng/lat del catastro) como los puntos de `mini`: x hacia el este, y hacia el sur. */
export function siluetaDe(lote: number[][]) {
  const k = Math.cos((lote[0][1] * Math.PI) / 180);
  return lote.map(([lng, lat]) => `${(lng * k * 1e5).toFixed(1)},${(-lat * 1e5).toFixed(1)}`).join(" ");
}

/** El sello del lote: su silueta con la forma real del catastro, en línea naranja, y una palabra que dice qué es. La
 *  caja se ajusta a la forma, así que sirven puntos en cualquier escala (los de `mini` van de 0 a 100). */
export function Sello({ puntos, etiqueta, grande = false, className = "" }: { puntos: string; etiqueta: string; grande?: boolean; className?: string }) {
  const n = puntos.split(/[ ,]/).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const lado = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0);
  return (
    <span className={`flex items-center gap-2 rounded-md bg-arena/95 py-1.5 pr-2.5 pl-1.5 text-[12.5px] font-semibold text-chocolate ${className}`} title="La forma real del lote, del catastro" data-sello>
      <svg viewBox={`${x0 - lado * 0.08} ${y0 - lado * 0.08} ${lado * 1.16} ${lado * 1.16}`} className={grande ? "h-11 w-11" : "h-7 w-7"} aria-hidden="true">
        <polygon points={puntos} fill="rgb(248 142 4 / 0.18)" stroke="var(--color-naranja)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {etiqueta}
    </span>
  );
}

/** Una tarjeta para el listado, como las de una revista: la foto sin borde ni sombra y abajo dos columnas, el nombre a
 *  la izquierda y el precio a la derecha. En los terrenos con lote, el sello con su forma real sobre la foto. */
export function Tarjeta({ p, op }: { p: Propiedad; op?: string }) {
  const terreno = esTerreno(p);
  // Cubierta y total construido son cosas distintas (el total suma lo semicubierto): cada una con su nombre
  const construida = p.cubierta ? `${superficie(p.cubierta)} cub.` : p.construido ? `${superficie(p.construido)} construidos` : null;
  const datos = terreno
    ? [superficie(p.terreno)]
    : [p.dormitorios && `${p.dormitorios} dorm.`, p.banos && `${p.banos} ${p.banos === 1 ? "baño" : "baños"}`, construida, !construida && superficie(p.terreno) && `${superficie(p.terreno)} de terreno`];
  // El título casi siempre ya dice la zona: entonces abajo va solo el tipo
  const linea = p.zona && p.titulo.toLowerCase().includes(p.zona.toLowerCase()) ? tipoTexto(p.tipo) : `${tipoTexto(p.tipo)} · ${lugar(p)}`;
  return (
    <div data-tarjeta={p.id} data-precio={precioEn(p, op).precio ?? ""} data-tipo={p.tipo} className="tarjeta group relative flex min-w-0 flex-col">
      <a href={ir({ p: p.id })} className="flex flex-1 flex-col">
        <div className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-piedra sm:aspect-[4/3]">
          <img src={portada(p.id)} alt="" loading="lazy" width={560} height={420} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          {p.operacion.includes("alquiler") && (
            <span className="absolute top-3 left-3 rounded-[3px] bg-arena/95 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-chocolate uppercase">
              {p.operacion.map((o) => ETIQUETA_OP[o] ?? o).join(" y ")}
            </span>
          )}
          {p.mini && <Sello puntos={p.mini} etiqueta="Forma real" className="absolute bottom-3 left-3" />}
        </div>
        <div className="flex flex-1 items-start justify-between gap-4 pt-3">
          <div className="min-w-0">
            <h3 className="font-display line-clamp-2 text-[18px] leading-snug font-medium">{p.titulo}</h3>
            <p className="mt-1 text-[13.5px] text-suave">
              {linea}
              {p.fotos > 1 && ` · ${p.fotos} fotos`}
            </p>
            {datos.some(Boolean) && <p className="mt-1.5 text-[13.5px] font-medium">{datos.filter(Boolean).join(" · ")}</p>}
            <span className="mt-2 block">
              <Etiquetas p={p} />
            </span>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[19px] leading-snug font-medium tabular-nums" data-precio-texto>{precio(precioEn(p, op)) ?? "Consultar precio"}</p>
            {terreno && precioPorSuperficie(p, op) && <p className="mt-1 text-[13px] text-suave">{precioPorSuperficie(p, op)}</p>}
          </div>
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
      className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border border-arena/40 bg-chocolate p-3 text-[13px] font-semibold tracking-[0.1em] text-arena uppercase hover:bg-terracota sm:py-2.5 sm:pr-4.5 sm:pl-3.5"
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
      <div className="relative min-w-[820px] overflow-hidden rounded-md border border-linea bg-arena" data-mapa-urbanizaciones>
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

/** Título de sección como en una revista: la serif en tinta, con un rótulo chico arriba si hace falta. */
export function Titulo({ chico, children, h1 = false, centrado = false }: { chico?: string; children: React.ReactNode; h1?: boolean; centrado?: boolean }) {
  const H = h1 ? "h1" : "h2";
  return (
    <div className={centrado ? "text-center" : ""}>
      {chico && <p className="text-[12px] font-semibold tracking-[0.18em] text-terracota uppercase">{chico}</p>}
      <H className="font-display mt-1 text-[1.85rem] leading-tight font-medium text-balance sm:text-[2.4rem]">{children}</H>
    </div>
  );
}
