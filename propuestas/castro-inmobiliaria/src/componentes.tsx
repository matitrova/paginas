import { useState } from "react";
import VistaWhatsApp from "../../../compartido/VistaWhatsApp";
import { esTerreno, NEGOCIO, portada, porM2, precio, SITIO, superficie, TELEFONO, type Propiedad } from "./datos";
import { CAIDA, NOTA_DATOS } from "./textos";

/** Arma un link a otra pantalla. Cada pantalla es una página común: "atrás" y abrir en otra pestaña andan solos. */
export function ir(params: Record<string, string | number | undefined | null> = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
  const s = q.toString();
  return s ? `?${s}` : "./";
}

const MENU = [
  { href: ir({ ver: "propiedades" }), texto: "Propiedades", ver: "propiedades" },
  { href: ir({ ver: "urbanizaciones" }), texto: "Urbanizaciones", ver: "urbanizaciones" },
  { href: ir({ ver: "nosotros" }), texto: "Nosotros", ver: "nosotros" },
  { href: ir({ ver: "contacto" }), texto: "Contacto", ver: "contacto" },
];

export function Encabezado({ actual }: { actual: string }) {
  return (
    <header className="sticky top-8 z-40 border-b border-linea bg-fondo/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="./" className="flex items-center gap-3" aria-label="Castro Inmobiliaria, inicio">
          <img src="./fotos/logo.png" alt="" className="h-12 w-auto self-start" />
          <span className="leading-none">
            <span className="font-display block text-lg tracking-wide">CASTRO</span>
            <span className="block text-[11px] tracking-[0.18em] text-suave">INMOBILIARIA</span>
          </span>
        </a>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {MENU.map((m) => (
            <a key={m.ver} href={m.href} aria-current={actual === m.ver ? "page" : undefined} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-tinta/80 hover:bg-hondo aria-[current=page]:text-naranja-osc">
              {m.texto}
            </a>
          ))}
        </nav>
        <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="ml-2 hidden rounded-full bg-naranja px-4 py-2 text-[15px] font-semibold text-white hover:brightness-95 md:inline-block">
          {TELEFONO}
        </a>
        <details className="relative ml-auto md:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-full border border-linea px-4 text-[15px] font-medium">Menú</summary>
          <nav className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-linea bg-white py-2 shadow-xl">
            {MENU.map((m) => (
              <a key={m.ver} href={m.href} className="block px-5 py-3 text-[16px]">
                {m.texto}
              </a>
            ))}
            <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="mx-3 mt-1 block rounded-xl bg-naranja px-4 py-3 text-center font-semibold text-white">
              Llamar · {TELEFONO}
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}

/** Arriba de cada pantalla: el gancho de la propuesta. Se va al bajar; el cartel de propuesta sí queda fijo. */
export function AvisoCaida() {
  return (
    <a href={ir({ ver: "certificado" })} data-aviso-caida className="block bg-alarma px-4 py-2.5 text-center text-[13.5px] leading-snug text-white">
      <b className="font-semibold">Su página hoy no abre</b> desde el {CAIDA.vencio}. Así podría quedar.{" "}
      <span className="underline underline-offset-2">Qué pasó y cómo arreglarlo →</span>
    </a>
  );
}

export function Pie() {
  const c = SITIO.contacto;
  return (
    <footer className="mt-20 bg-tinta text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <img src="./fotos/logofooter.png" alt="Castro Inmobiliaria" className="h-12 w-auto" />
          <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed">{SITIO.pie.texto.replace("experiancia", "experiencia")}</p>
        </div>
        <div className="text-[14.5px] leading-relaxed">
          <p className="font-semibold text-white">Oficina y Museo de La Firma</p>
          <p className="mt-2">{c.direccion}</p>
          <p className="mt-1">
            <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="hover:text-white">{c.telefono}</a>
          </p>
          <p className="mt-1">{c.email}</p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(c.redes).filter(([red]) => red !== "youtube_alternativo").map(([red, url]) => (
              <a key={red} href={url} target="_blank" rel="noopener" className="capitalize underline-offset-2 hover:text-white hover:underline">
                {red}
              </a>
            ))}
          </p>
        </div>
        <div className="text-[13px] leading-relaxed text-white/60">
          <p>{c.corredor_y_matricula.replace("Publico", "Público").replace("Matricula", "Matrícula")}</p>
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

/** Una tarjeta para el listado. La de un terreno muestra lo que importa en un terreno: superficie y precio por m². */
export function Tarjeta({ p }: { p: Propiedad }) {
  const terreno = esTerreno(p);
  const m2 = porM2(p);
  const datos = terreno
    ? [superficie(p.terreno), m2 && `USD ${Math.round(m2).toLocaleString("es-AR")} el m²`]
    : [p.dormitorios && `${p.dormitorios} dorm.`, p.banos && `${p.banos} ${p.banos === 1 ? "baño" : "baños"}`, superficie(p.construido ?? p.cubierta) && `${superficie(p.construido ?? p.cubierta)} cub.`, !p.construido && !p.cubierta && superficie(p.terreno) && `${superficie(p.terreno)} de terreno`];
  return (
    <a href={ir({ p: p.id })} data-tarjeta={p.id} data-precio={p.precio ?? ""} data-tipo={p.tipo} className="tarjeta group flex flex-col overflow-hidden rounded-2xl border border-linea bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgb(33_28_24/0.45)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-hondo">
        <img src={portada(p.id)} alt="" loading="lazy" width={560} height={420} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute top-3 left-3 flex gap-1.5">
          {p.operacion.map((op) => (
            <span key={op} className="rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-tinta">
              {ETIQUETA_OP[op] ?? op}
            </span>
          ))}
        </span>
        {p.fotos > 1 && <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] text-white">{p.fotos} fotos</span>}
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
        <p className="text-[20px] font-semibold tracking-tight">{precio(p) ?? "Consultar precio"}</p>
        <h3 className="mt-1 line-clamp-2 text-[15px] leading-snug text-tinta/85">{p.titulo}</h3>
        <p className="mt-1 text-[13px] text-suave">{tipoTexto(p.tipo)} · {lugar(p)}</p>
        {datos.some(Boolean) && (
          <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-[13.5px] font-medium text-tinta/80">
            {datos.filter(Boolean).map((d) => (
              <span key={d as string}>{d}</span>
            ))}
          </p>
        )}
      </div>
    </a>
  );
}

/** El botón de consulta de las propuestas: no le escribe a nadie, muestra cómo le llegaría el mensaje a la inmobiliaria. */
export function useConsulta() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const vista = <VistaWhatsApp mensaje={mensaje} negocio={NEGOCIO} pagina="castro-inmobiliaria" tipo="propuesta" alCerrar={() => setMensaje(null)} />;
  return { abrir: setMensaje, vista };
}

export function Titulo({ chico, children }: { chico?: string; children: React.ReactNode }) {
  return (
    <div>
      {chico && <p className="text-[12px] font-semibold tracking-[0.2em] text-naranja-osc uppercase">{chico}</p>}
      <h2 className="font-display mt-2 text-[1.75rem] leading-tight text-balance sm:text-4xl">{children}</h2>
    </div>
  );
}
