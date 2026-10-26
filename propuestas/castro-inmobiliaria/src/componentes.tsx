import { useEffect, useState } from "react";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import { esTerreno, NEGOCIO, portada, precio, precioEn, precioPorSuperficie, SITIO, superficie, TELEFONO, type Propiedad } from "./datos";
import { NOTA_DATOS } from "./textos";

/** Arma un link a otra pantalla. Cada pantalla es una página común: "atrás" y abrir en otra pestaña andan solos. */
export function ir(params: Record<string, string | number | undefined | null> = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
  const s = q.toString();
  return s ? `?${s}` : "./";
}

/** El link para compartir una propiedad: una página chica que trae su foto y su precio para WhatsApp y redirige a la ficha. */
export const linkPropiedad = (id: string) => new URL(`p/${id}/`, location.href.split("?")[0]).href;

// Guardadas: se guardan en el teléfono, sin crear cuenta (su sitio pide registrarse para lo mismo)
const CLAVE_GUARDADAS = "castro-guardadas";
function leerGuardadas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_GUARDADAS) ?? "[]");
  } catch {
    return [];
  }
}

export function useGuardadas() {
  const [ids, setIds] = useState(leerGuardadas);
  useEffect(() => {
    const actualizar = () => setIds(leerGuardadas());
    window.addEventListener("guardadas", actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener("guardadas", actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  const alternar = (id: string) => {
    const nuevas = leerGuardadas().includes(id) ? leerGuardadas().filter((x) => x !== id) : [...leerGuardadas(), id];
    try {
      localStorage.setItem(CLAVE_GUARDADAS, JSON.stringify(nuevas));
    } catch {
      /* sin almacenamiento: el corazón se marca hasta que se cierra la página */
    }
    setIds(nuevas);
    window.dispatchEvent(new Event("guardadas"));
  };
  const vaciar = () => {
    try {
      localStorage.removeItem(CLAVE_GUARDADAS);
    } catch {
      /* nada que borrar */
    }
    setIds([]);
    window.dispatchEvent(new Event("guardadas"));
  };
  return { ids, alternar, vaciar };
}

export function BotonGuardar({ id, className = "" }: { id: string; className?: string }) {
  const { ids, alternar } = useGuardadas();
  const guardada = ids.includes(id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        alternar(id);
      }}
      aria-pressed={guardada}
      aria-label={guardada ? "Sacar de guardadas" : "Guardar esta propiedad"}
      data-guardar={id}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" fill={guardada ? "#e2470f" : "none"} stroke={guardada ? "#e2470f" : "#211c18"} strokeWidth={1.8} strokeLinejoin="round" />
      </svg>
    </button>
  );
}

const MENU = [
  { href: ir({ ver: "propiedades" }), texto: "Propiedades", ver: "propiedades" },
  { href: ir({ ver: "urbanizaciones" }), texto: "Urbanizaciones", ver: "urbanizaciones" },
  { href: ir({ ver: "vender" }), texto: "Vender o tasar", ver: "vender" },
  { href: ir({ ver: "nosotros" }) + "#museo", texto: "Museo", ver: "museo" },
  { href: ir({ ver: "nosotros" }), texto: "Nosotros", ver: "nosotros" },
  { href: ir({ ver: "contacto" }), texto: "Contacto", ver: "contacto" },
];

export function Encabezado({ actual }: { actual: string }) {
  const { ids } = useGuardadas();
  const guardadas = ids.length > 0 && (
    <a href={ir({ ver: "guardadas" })} data-link-guardadas className="flex items-center gap-1.5 rounded-full border border-linea bg-white px-3 py-2 text-[14px] font-semibold whitespace-nowrap">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" fill="#e2470f" />
      </svg>
      <span className="hidden sm:inline">Guardadas</span> {ids.length}
    </a>
  );
  return (
    <header className="sticky top-8 z-40 border-b border-linea bg-fondo/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a href="./" className="flex items-center gap-3" aria-label="Castro Inmobiliaria, inicio">
          <img src="./fotos/logo.png" alt="" className="h-12 w-auto self-start" />
          <span className="leading-none">
            <span className="font-display block text-lg tracking-wide">CASTRO</span>
            <span className="block text-[11px] tracking-[0.18em] text-suave">INMOBILIARIA</span>
          </span>
        </a>
        <nav className="ml-auto hidden items-center gap-0.5 xl:flex">
          {MENU.map((m) => (
            <a key={m.ver} href={m.href} aria-current={actual === m.ver ? "page" : undefined} className="rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap text-tinta/80 hover:bg-hondo aria-[current=page]:text-naranja-osc">
              {m.texto}
            </a>
          ))}
        </nav>
        <span className="ml-auto xl:ml-1">{guardadas}</span>
        <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="hidden rounded-full bg-naranja-osc px-4 py-2 text-[15px] font-semibold whitespace-nowrap text-white hover:brightness-95 xl:inline-block">
          {TELEFONO}
        </a>
        <details className="relative xl:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-full border border-linea px-4 text-[15px] font-medium">Menú</summary>
          <nav className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-linea bg-white py-2 shadow-xl">
            {MENU.map((m) => (
              <a key={m.ver} href={m.href} className="block px-5 py-3 text-[16px]">
                {m.texto}
              </a>
            ))}
            <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="mx-3 mt-1 block rounded-xl bg-naranja-osc px-4 py-3 text-center font-semibold whitespace-nowrap text-white">
              Llamar · {TELEFONO}
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}

const REDES: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };

/** pegado: sin margen arriba, cuando la pantalla ya termina en oscuro (el museo). abajo: lugar para la barra fija de la ficha. */
export function Pie({ pegado = false }: { pegado?: boolean }) {
  const c = SITIO.contacto;
  return (
    // Abajo queda lugar para el botón de WhatsApp (o la barra de la ficha) en el celular
    <footer className={`${pegado ? "" : "mt-20"} bg-tinta pb-20 text-white/80 md:pb-0`}>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <img src="./fotos/logofooter.png" alt="Castro Inmobiliaria" className="h-12 w-auto" />
          <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed">{SITIO.pie.texto}</p>
        </div>
        <div className="text-[14.5px] leading-relaxed">
          <p className="font-semibold text-white">Oficina y Museo de La Firma</p>
          <p className="mt-2">{c.direccion}</p>
          <p className="mt-1">
            <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="hover:text-white">{c.telefono}</a>
          </p>
          <p className="mt-1">
            <a href={`mailto:${c.email}`} className="hover:text-white">{c.email}</a>
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(c.redes).filter(([red]) => red !== "youtube_alternativo").map(([red, url]) => (
              <a key={red} href={url} target="_blank" rel="noopener" className="underline-offset-2 hover:text-white hover:underline">
                {REDES[red] ?? red}
              </a>
            ))}
          </p>
        </div>
        <div className="text-[13px] leading-relaxed text-white/60" data-legales>
          <p>{c.corredor_y_matricula.replace("Publico", "Público").replace("Matricula", "Matrícula")}</p>
          <p className="mt-2">
            {c.razon_social} · CUIT {c.cuit} ·{" "}
            <a href={c.afip_data_fiscal} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-white">Data fiscal (ARCA)</a>
          </p>
          {SITIO.pie.legales.map((l) => (
            <p key={l} className="mt-2">{l}</p>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-[12.5px] text-white/50">
        {NOTA_DATOS} Propuesta de diseño de Matías Trovato, no es la página oficial de {NEGOCIO}.
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
        <span key={e} className="rounded-full bg-[#fff1e3] px-2.5 py-0.5 text-[12px] font-semibold text-naranja-osc">
          {e}
        </span>
      ))}
    </span>
  );
}

/** Una tarjeta para el listado. La de un terreno muestra lo que importa en un terreno: superficie y precio por m². */
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
    <div data-tarjeta={p.id} data-precio={precioEn(p, op).precio ?? ""} data-tipo={p.tipo} className="tarjeta group relative flex flex-col overflow-hidden rounded-2xl border border-linea bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgb(33_28_24/0.45)]">
      <a href={ir({ p: p.id })} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-hondo">
          <img src={portada(p.id)} alt="" loading="lazy" width={560} height={420} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          <span className="absolute top-3 left-3 flex gap-1.5">
            {p.operacion.map((o) => (
              <span key={o} className="rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-tinta">
                {ETIQUETA_OP[o] ?? o}
              </span>
            ))}
          </span>
          {p.mini && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl bg-white/95 py-1 pr-2.5 pl-1 text-[11.5px] font-semibold text-tinta" data-mini>
              <svg viewBox="-12 -12 124 124" className="h-8 w-8" aria-hidden="true">
                <polygon points={p.mini} fill="rgb(255 128 0 / 0.25)" stroke="#ff8000" strokeWidth={9} strokeLinejoin="round" />
              </svg>
              Forma real del lote
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-[20px] font-semibold tracking-tight">{precio(precioEn(p, op)) ?? "Consultar precio"}</p>
          <h3 className="mt-1 line-clamp-2 text-[15px] leading-snug text-tinta/85">{p.titulo}</h3>
          <p className="mt-1 text-[13px] text-suave">
            {linea}
            {p.fotos > 1 && ` · ${p.fotos} fotos`}
          </p>
          <span className="mt-2">
            <Etiquetas p={p} />
          </span>
          {datos.some(Boolean) && (
            <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-[13.5px] font-medium text-tinta/80">
              {datos.filter(Boolean).map((d) => (
                <span key={d as string}>{d}</span>
              ))}
            </p>
          )}
        </div>
      </a>
      <BotonGuardar id={p.id} className="absolute top-2.5 right-2.5" />
    </div>
  );
}

/** El botón de consulta de las propuestas: no le escribe a nadie, muestra cómo le llegaría el mensaje a la inmobiliaria. */
export function useConsulta() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const vista = <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="castro-inmobiliaria" tipo="propuesta" que="la consulta" alCerrar={() => setMensaje(null)} />;
  return { abrir: setMensaje, vista };
}

/** WhatsApp a mano en todas las pantallas (en la ficha ya está la barra de abajo). El mensaje dice qué se está mirando:
 *  el de ellos abre un chat vacío. */
export function WhatsAppFlotante({ mensaje }: { mensaje: () => string }) {
  const consulta = useConsulta();
  return (
    <>
      <button
        onClick={() => consulta.abrir(mensaje())}
        data-whatsapp-flotante
        aria-label="Escribir por WhatsApp"
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-[#25d366] py-3 pr-5 pl-3.5 font-semibold text-black shadow-[0_12px_30px_-10px_rgb(0_0_0/0.45)] hover:brightness-95"
      >
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className="h-6 w-6">
          <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 10 9.9 5.2 16 5.2S27 10 27 15.9 22.1 26.4 16 26.4zm6-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.5z" />
        </svg>
        <span>WhatsApp</span>
      </button>
      {consulta.vista}
    </>
  );
}

/** Su mapa ilustrado de Merlo con los 22 loteos, tal cual lo tienen en su portada. En el celular ellos lo ocultan;
 *  acá se desliza de costado para que los logos se vean y se puedan tocar. */
export function MapaUrbanizaciones() {
  const { fondo, pines } = SITIO.mapa;
  return (
    <div className="sin-barra -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" data-libre>
      <div className="relative min-w-[820px] overflow-hidden rounded-3xl border border-linea bg-white" data-mapa-urbanizaciones>
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

export function Titulo({ chico, children }: { chico?: string; children: React.ReactNode }) {
  return (
    <div>
      {chico && <p className="text-[12px] font-semibold tracking-[0.2em] text-naranja-osc uppercase">{chico}</p>}
      <h2 className="font-display mt-2 text-[1.75rem] leading-tight text-balance sm:text-4xl">{children}</h2>
    </div>
  );
}
