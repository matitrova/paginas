import { useEffect, useRef, useState } from "react";
import { ir, lugar, Tarjeta, tipoTexto, useConsulta } from "./componentes";
import { esTerreno, pedirFicha, portada, porId, precio, PROPIEDADES, SITIO, superficie, TELEFONO, TIPOS, URBANIZACIONES, type Ficha as DatosFicha, type Forma as DatosForma, type Propiedad } from "./datos";

/** Galería deslizable con el dedo. Las fotos vienen del servicio de fotos de ellos; si alguna no carga, se saca. */
function Galeria({ p, fotos }: { p: Propiedad; fotos: string[] | null }) {
  const caja = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const [rotas, setRotas] = useState<Set<string>>(new Set());
  const lista = fotos ? fotos.filter((f) => !rotas.has(f)) : [];
  const total = lista.length;
  const mover = (paso: number) => caja.current?.scrollBy({ left: paso * caja.current.clientWidth, behavior: "smooth" });

  return (
    <div className="relative overflow-hidden bg-hondo sm:rounded-3xl">
      <div
        ref={caja}
        onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="sin-barra flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto sm:aspect-[16/10]"
        data-galeria
      >
        {total === 0 && <img src={portada(p.id)} alt="" className="h-full w-full shrink-0 snap-center object-cover" />}
        {lista.map((f, i) => (
          <img
            key={f}
            src={i <= actual + 1 ? f : undefined}
            alt={`${p.titulo}, foto ${i + 1}`}
            onError={() => setRotas((r) => new Set(r).add(f))}
            style={i === 0 ? { backgroundImage: `url(${portada(p.id)})`, backgroundSize: "cover" } : undefined}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {total > 1 && (
        <>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[13px] text-white" data-contador>
            {actual + 1} / {total}
          </span>
          <button onClick={() => mover(-1)} aria-label="Foto anterior" disabled={actual === 0} className="absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow disabled:opacity-0 sm:grid">‹</button>
          <button onClick={() => mover(1)} aria-label="Foto siguiente" disabled={actual === total - 1} className="absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow disabled:opacity-0 sm:grid">›</button>
        </>
      )}
    </div>
  );
}

/** El lote con su forma del catastro sobre la foto satelital. La foto está calzada con el catastro zona por zona
 *  (scripts/castro_satelite.py); el dibujo va en SVG encima para que las medidas se lean nítidas en cualquier pantalla. */
function Forma({ f }: { f: DatosForma }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-linea bg-white" data-forma>
      <div className="relative">
        <img src={f.img} alt="Foto satelital del terreno con su forma dibujada" width={640} height={480} loading="lazy" className="block w-full" />
        <svg viewBox="0 0 640 480" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {f.vecinas.map((v) => (
            <polygon key={v} points={v} fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth={1.5} />
          ))}
          <polygon points={f.lote} fill="rgb(255 128 0 / 0.22)" stroke="#ff8000" strokeWidth={3.5} strokeLinejoin="round" />
          {f.lados.map((l) => (
            <text key={`${l.x},${l.y}`} x={l.x} y={l.y} transform={`rotate(${l.ang} ${l.x} ${l.y})`} textAnchor="middle" dominantBaseline="middle" fontSize={21} fontWeight={700} fill="#fff" stroke="rgb(0 0 0 / 0.75)" strokeWidth={4} paintOrder="stroke" data-lado>
              {l.texto}
            </text>
          ))}
          <g transform="translate(604 44)">
            <circle r={24} fill="rgb(0 0 0 / 0.55)" />
            <path d="M0 -15 L7 4 L0 0 L-7 4 Z" fill="#fff" />
            <text y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">N</text>
          </g>
        </svg>
      </div>
      <figcaption className="px-4 py-3 text-[13px] leading-snug text-suave">
        Forma según el catastro de San Luis. Las medidas son aproximadas: las definitivas, según la mensura. Foto satelital: Esri World Imagery.
      </figcaption>
    </figure>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null | undefined }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="rounded-xl bg-hondo px-4 py-3">
      <dt className="text-[12.5px] text-suave">{etiqueta}</dt>
      <dd className="mt-0.5 text-[16px] font-semibold">{valor}</dd>
    </div>
  );
}

export function Descripcion({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const larga = texto.length > 420;
  return (
    <div>
      <p className={`text-[16px] leading-relaxed whitespace-pre-line text-tinta/85 ${larga && !abierta ? "line-clamp-6" : ""}`} data-descripcion>
        {texto}
      </p>
      {larga && (
        <button onClick={() => setAbierta(!abierta)} className="mt-2 font-semibold text-naranja-osc">
          {abierta ? "Leer menos" : "Leer más"}
        </button>
      )}
    </div>
  );
}

/** Las 3 más parecidas: mismo tipo y operación; primero las de la misma zona y después por precio cercano. */
function parecidas(p: Propiedad) {
  return PROPIEDADES.filter((o) => o.id !== p.id && o.tipo === p.tipo && o.operacion.some((op) => p.operacion.includes(op)))
    .sort((a, b) => Number(b.zona === p.zona) - Number(a.zona === p.zona) || Math.abs((a.precio ?? 0) - (p.precio ?? 0)) - Math.abs((b.precio ?? 0) - (p.precio ?? 0)))
    .slice(0, 3);
}

export default function Ficha({ id }: { id: string }) {
  const p = porId.get(id);
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [fallo, setFallo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const consulta = useConsulta();

  useEffect(() => {
    if (p) {
      document.title = `${p.titulo} · Castro Inmobiliaria`;
      pedirFicha(id).then(setFicha, () => setFallo(true));
    }
  }, [id, p]);

  if (!p) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-display text-3xl">Esta propiedad ya no está publicada</h1>
        <p className="mt-4 text-suave">Puede que se haya vendido o alquilado.</p>
        <a href={ir({ ver: "propiedades" })} className="mt-8 inline-block rounded-full bg-naranja-osc px-6 py-3 font-semibold text-white">Ver las propiedades</a>
      </section>
    );
  }

  const otras = parecidas(p);
  const urbs = URBANIZACIONES.filter((u) => p.urbanizacion.includes(u.id));
  const precios = ficha && ficha.operaciones.length > 1
    ? ficha.operaciones.map((o) => `${o.operacion === "venta" ? "Venta" : "Alquiler"} ${precio({ precio: Number(o.precio), moneda: o.moneda })}`)
    : [precio(p) ?? "Consultar precio"];
  const mensaje = `Hola, me interesa: ${p.titulo} (cód. ${p.codigo}), ${precios.join(" / ")}. ¿Sigue disponible?\n${location.href}`;
  const compartir = async () => {
    if (navigator.share) return navigator.share({ title: p.titulo, url: location.href }).catch(() => {});
    await navigator.clipboard.writeText(location.href);
    setCopiado(true);
  };

  return (
    <article className="mx-auto max-w-6xl pb-28 sm:px-6 md:pb-0">
      <nav className="px-5 pt-5 pb-3 text-[13.5px] text-suave sm:px-0" aria-label="Estás en">
        <a href={ir({ ver: "propiedades" })} className="hover:text-tinta">Propiedades</a> ·{" "}
        <a href={ir({ ver: "propiedades", tipo: p.tipo, op: p.operacion[0] === "venta" ? undefined : p.operacion[0] })} className="hover:text-tinta">{TIPOS[p.tipo] ?? p.tipo}</a>
        {p.zona && (
          <>
            {" · "}
            <a href={ir({ ver: "propiedades", zona: p.zona, op: p.operacion[0] === "venta" ? undefined : p.operacion[0] })} className="hover:text-tinta">{p.zona}</a>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Galeria p={p} fotos={ficha?.fotos ?? null} />
          <div className="px-5 sm:px-0">
            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-[28px] font-semibold tracking-tight" data-precio-ficha>{precios.join(" · ")}</p>
              <p className="text-[13.5px] text-suave">Cód. {p.codigo}</p>
            </div>
            <h1 className="mt-2 text-[22px] leading-snug font-medium text-balance sm:text-[26px]">{p.titulo}</h1>
            {fallo && (
              <p className="mt-3 rounded-xl bg-hondo px-4 py-3 text-[14.5px]">
                No se pudo cargar el detalle de esta propiedad.{" "}
                <button onClick={() => location.reload()} className="font-semibold text-naranja-osc underline">Reintentar</button>
              </p>
            )}
            <p className="mt-1 text-[15px] text-suave">{tipoTexto(p.tipo)} · {lugar(p)}</p>

            <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Dato etiqueta="Terreno" valor={superficie(p.terreno)} />
              <Dato etiqueta="Cubierta" valor={superficie(p.cubierta)} />
              <Dato etiqueta="Semicubierta" valor={superficie(ficha?.semicubierta ?? null)} />
              {/* Si es igual a la cubierta, repetirlo no dice nada */}
              <Dato etiqueta="Total construido" valor={p.construido !== p.cubierta ? superficie(p.construido) : null} />
              <Dato etiqueta="Ambientes" valor={p.ambientes} />
              <Dato etiqueta="Dormitorios" valor={p.dormitorios} />
              <Dato etiqueta="Baños" valor={p.banos} />
              <Dato etiqueta="Cochera" valor={ficha?.cochera} />
              <Dato etiqueta="Plantas" valor={ficha?.plantas} />
              <Dato etiqueta="Antigüedad" valor={ficha?.antiguedad} />
            </dl>

            {ficha?.forma && (
              <section className="mt-9">
                <h2 className="font-display text-2xl">El lote</h2>
                <p className="mt-1 text-[15px] text-suave">Así es el terreno, con su forma real y la medida de cada lado.</p>
                <div className="mt-4">
                  <Forma f={ficha.forma} />
                </div>
              </section>
            )}

            {ficha?.descripcion && (
              <section className="mt-9">
                <h2 className="font-display text-2xl">Descripción</h2>
                <div className="mt-3">
                  <Descripcion texto={ficha.descripcion} />
                </div>
              </section>
            )}

            {ficha && [["Características", ficha.adicionales], ["Servicios", ficha.servicios]].map(([titulo, items]) =>
              (items as string[]).length ? (
                <section key={titulo as string} className="mt-8">
                  <h2 className="font-display text-2xl">{titulo as string}</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(items as string[]).map((i) => (
                      <li key={i} className="rounded-full border border-linea bg-white px-3.5 py-1.5 text-[14px]">{i}</li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}

            {urbs.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-2xl">Urbanización</h2>
                {urbs.map((u) => (
                  <a key={u.id} href={ir({ u: u.id })} className="mt-3 flex items-center gap-4 rounded-2xl border border-linea bg-white p-3 hover:border-naranja/60">
                    {u.fotos[0] && <img src={u.fotos[0]} alt="" className="h-16 w-24 rounded-xl object-cover" />}
                    <span>
                      <span className="block font-semibold">{nombreLindo(u.nombre)}</span>
                      <span className="block text-[13.5px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "")}</span>
                    </span>
                  </a>
                ))}
              </section>
            )}

            <section className="mt-8">
              <h2 className="font-display text-2xl">Ubicación</h2>
              <p className="mt-2 text-[15.5px]">{lugar(p)}</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noopener" data-mapa className="mt-2 inline-block font-semibold text-naranja-osc">
                Ver en el mapa →
              </a>
            </section>

            {esTerreno(p) && <p className="mt-8 text-[13px] text-suave">{SITIO.pie.legales[0]}</p>}
          </div>
        </div>

        <aside className="px-5 sm:px-0">
          {/* Como en los portales: el precio siempre a la vista al lado de los botones (en el celular, la barra de abajo) */}
          <div className="sticky top-28 rounded-3xl border border-linea bg-white p-5">
            <p className="hidden text-[13px] text-suave md:block">{p.operacion.map((o) => (o === "venta" ? "Venta" : "Alquiler")).join(" y ")} · Cód. {p.codigo}</p>
            <p className="mt-1 hidden text-[24px] leading-tight font-semibold tracking-tight md:block">{precios.join(" · ")}</p>
            <div className="mt-5 hidden gap-2 md:grid">
              <button onClick={() => consulta.abrir(mensaje)} data-consultar className="rounded-full bg-[#25d366] px-5 py-3 font-semibold text-black hover:brightness-95">Consultar por WhatsApp</button>
              <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="rounded-full border border-linea px-5 py-3 text-center font-semibold hover:bg-hondo">Llamar · {TELEFONO}</a>
            </div>
            <button onClick={compartir} className="mt-3 w-full rounded-full px-5 py-2.5 text-[14.5px] font-semibold text-naranja-osc hover:bg-hondo">
              {copiado ? "Link copiado" : "Compartir esta propiedad"}
            </button>
          </div>
        </aside>
      </div>

      {otras.length > 0 && (
        <section className="mt-14 px-5 sm:px-0">
          <h2 className="font-display text-2xl sm:text-3xl">Parecidas</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-parecidas>
            {otras.map((o) => (
              <Tarjeta key={o.id} p={o} op={p.operacion[0]} />
            ))}
          </div>
        </section>
      )}

      {/* En el celular, los dos botones quedan siempre a mano */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-linea bg-white/95 p-3 backdrop-blur md:hidden" data-barra-contacto>
        <a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`} className="rounded-full border border-linea py-3 text-center font-semibold">Llamar</a>
        <button onClick={() => consulta.abrir(mensaje)} className="rounded-full bg-[#25d366] py-3 font-semibold text-black">WhatsApp</button>
      </div>
      {consulta.vista}
    </article>
  );
}

/** "JARDINES DE LA PLAZA" → "Jardines de la Plaza": el sitio escribe varias urbanizaciones en mayúsculas. */
export function nombreLindo(nombre: string) {
  if (nombre !== nombre.toUpperCase()) return nombre;
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && ["de", "la", "las", "los", "del", "y"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
