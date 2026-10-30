import { useEffect, useRef, useState } from "react";
import { BOTON, BOTON_BORDE, Etiquetas, IconoWhatsApp, ir, linkPropiedad, linkWhatsApp, LLAMAR, lugar, Sello, siluetaDe, Tarjeta, tipoTexto, Titulo } from "./componentes";
import { pedirFicha, portada, porId, precio, PROPIEDADES, SITIO, superficie, TIPOS, URBANIZACIONES, type Propiedad } from "./datos";
import MapaFicha, { type FichaConMapa } from "./MapaFicha";

/** Galería deslizable con el dedo; al tocar una foto se abre a pantalla completa. Las fotos vienen del servicio de
 *  fotos de ellos y se piden de a una (la que se ve y la siguiente); si alguna no carga, se saca. */
function Galeria({ p, fotos }: { p: Propiedad; fotos: string[] | null }) {
  const caja = useRef<HTMLDivElement>(null);
  const cajaGrande = useRef<HTMLDivElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(0);
  const [grande, setGrande] = useState<number | null>(null);
  const [rotas, setRotas] = useState<Set<string>>(new Set());
  const lista = fotos ? fotos.filter((f) => !rotas.has(f)) : [];
  const total = lista.length;
  const mover = (c: HTMLDivElement | null, paso: number) => c?.scrollBy({ left: paso * c.clientWidth, behavior: "smooth" });

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (grande !== null && !d.open) {
      d.showModal();
      requestAnimationFrame(() => cajaGrande.current?.scrollTo({ left: grande * cajaGrande.current.clientWidth, behavior: "instant" }));
    }
  }, [grande]);

  const cerrar = () => {
    // La galería de la página queda en la foto donde se cerró la grande
    if (grande !== null) caja.current?.scrollTo({ left: grande * caja.current.clientWidth, behavior: "instant" });
    setGrande(null);
  };

  // En la compu, la foto grande a todo el ancho: encima va el recuadro con el título, el precio y la consulta (Ficha).
  // Los controles van arriba a la derecha, para que el recuadro no los tape ni tapen la marca de agua de sus fotos
  const flecha = "h-11 w-11 place-items-center rounded-md bg-arena/95 text-xl text-chocolate disabled:invisible";
  return (
    <div className="relative overflow-hidden bg-hondo sm:rounded-[3px]">
      <div
        ref={caja}
        onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="sin-barra flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto sm:aspect-[16/10] md:aspect-auto md:h-[540px]"
        data-galeria
      >
        {total === 0 && <img src={portada(p.id)} alt="" className="h-full w-full shrink-0 snap-center object-cover" />}
        {lista.map((f, i) => (
          <img
            key={f}
            src={i <= actual + 1 ? f : undefined}
            alt={`${p.titulo}, foto ${i + 1}`}
            onClick={() => setGrande(i)}
            onError={() => setRotas((r) => new Set(r).add(f))}
            style={i === 0 ? { backgroundImage: `url(${portada(p.id)})`, backgroundSize: "cover" } : undefined}
            className="h-full w-full shrink-0 cursor-zoom-in snap-center object-cover"
          />
        ))}
      </div>
      {total > 1 && (
        <>
          <span className="absolute bottom-3 left-3 rounded-md bg-chocolate/75 px-2.5 py-1 text-[13px] text-arena md:top-5 md:bottom-auto md:left-5" data-contador>
            {actual + 1} / {total}
          </span>
          <button onClick={() => mover(caja.current, -1)} aria-label="Foto anterior" disabled={actual === 0} className={`absolute top-1/2 left-3 hidden -translate-y-1/2 sm:grid md:hidden ${flecha}`}>‹</button>
          <button onClick={() => mover(caja.current, 1)} aria-label="Foto siguiente" disabled={actual === total - 1} className={`absolute top-1/2 right-3 hidden -translate-y-1/2 sm:grid md:hidden ${flecha}`}>›</button>
        </>
      )}
      {total > 0 && (
        <div className="absolute top-3 right-3 flex gap-2 md:top-5 md:right-5">
          {total > 1 && (
            <>
              <button onClick={() => mover(caja.current, -1)} aria-label="Foto anterior" disabled={actual === 0} className={`hidden md:grid ${flecha}`}>‹</button>
              <button onClick={() => mover(caja.current, 1)} aria-label="Foto siguiente" disabled={actual === total - 1} className={`hidden md:grid ${flecha}`}>›</button>
            </>
          )}
          <button onClick={() => setGrande(actual)} data-ver-grande className="h-11 rounded-md bg-arena/95 px-3.5 text-[12px] font-semibold tracking-[0.12em] text-chocolate uppercase">
            <span className="md:hidden">{total} fotos</span>
            <span className="hidden md:inline">Ver las {total} fotos</span>
          </button>
        </div>
      )}

      <dialog
        ref={dialogo}
        onClose={cerrar}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") mover(cajaGrande.current, 1);
          if (e.key === "ArrowLeft") mover(cajaGrande.current, -1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 backdrop:bg-black"
        data-galeria-grande
      >
        {grande !== null && (
          <>
            <div
              ref={cajaGrande}
              onScroll={(e) => setGrande(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
              className="sin-barra flex h-full snap-x snap-mandatory overflow-x-auto"
            >
              {lista.map((f, i) => (
                <img key={f} src={Math.abs(i - grande) <= 1 ? f : undefined} alt={`${p.titulo}, foto ${i + 1}`} className="h-full w-full shrink-0 snap-center object-contain" />
              ))}
            </div>
            <span className="absolute top-4 left-4 rounded-full bg-white/15 px-3 py-1 text-[14px] text-white">{grande + 1} / {total}</span>
            <button onClick={() => dialogo.current?.close()} aria-label="Cerrar" className="absolute top-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white">×</button>
            <button onClick={() => mover(cajaGrande.current, -1)} aria-label="Foto anterior" className="absolute top-1/2 left-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white sm:grid">‹</button>
            <button onClick={() => mover(cajaGrande.current, 1)} aria-label="Foto siguiente" className="absolute top-1/2 right-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white sm:grid">›</button>
          </>
        )}
      </dialog>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null | undefined }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="flex justify-between gap-3 border-b border-linea py-2 text-[15px]">
      <dt className="text-suave">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}

export function Descripcion({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const larga = texto.length > 420;
  return (
    <div>
      <p className={`text-[16.5px] leading-[1.7] whitespace-pre-line text-tinta/90 ${larga && !abierta ? "line-clamp-6" : ""}`} data-descripcion>
        {texto.replace(/\s*•\s*/g, "\n• ").trim()}
      </p>
      {larga && (
        <button onClick={() => setAbierta(!abierta)} className="mt-2 font-semibold text-terracota underline underline-offset-4">
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

/** Una sección de la ficha, como en una revista: un filete arriba, el rótulo chico y el contenido. */
function Caja({ titulo, id, children }: { titulo: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-chocolate/20 pt-5">
      <h2 className="text-[12.5px] font-semibold tracking-[0.16em] text-terracota uppercase">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Ficha({ id }: { id: string }) {
  const p = porId.get(id);
  const [ficha, setFicha] = useState<FichaConMapa | null>(null);
  const [fallo, setFallo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (p) {
      document.title = `${p.titulo} · Castro Inmobiliaria`;
      pedirFicha(id).then(setFicha, () => setFallo(true));
    }
  }, [id, p]);

  if (!p) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-medium">Esta propiedad ya no está publicada</h1>
        <p className="mt-4 text-suave">Puede que se haya vendido o alquilado.</p>
        <a href={ir({ ver: "propiedades" })} className={`${BOTON} mt-8`}>Ver las propiedades</a>
      </section>
    );
  }

  const otras = parecidas(p);
  const urbs = URBANIZACIONES.filter((u) => p.urbanizacion.includes(u.id));
  const precios = ficha && ficha.operaciones.length > 1
    ? ficha.operaciones.map((o) => `${o.operacion === "venta" ? "Venta" : "Alquiler"} ${precio({ precio: Number(o.precio), moneda: o.moneda })}`)
    : [precio(p) ?? "Consultar precio"];
  const link = linkPropiedad(p.id);
  // WhatsApp abre directo con el código de la propiedad y su link (30/10): la inmobiliaria sabe por cuál le escriben
  const whatsapp = linkWhatsApp(`Hola, me interesa: ${p.titulo} (cód. ${p.codigo}), ${precios.join(" / ")}. ¿Sigue disponible?\n${link}`);
  const mail = `mailto:${SITIO.contacto.email}?subject=${encodeURIComponent(`Consulta por ${p.titulo} (cód. ${p.codigo})`)}&body=${encodeURIComponent(`Hola, me interesa esta propiedad: ${p.titulo} (cód. ${p.codigo}), ${precios.join(" / ")}.\n${link}\n\nMi nombre:\nMi teléfono:`)}`;
  const compartir = async () => {
    if (navigator.share) return navigator.share({ title: p.titulo, url: link }).catch(() => {});
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  };
  const general = [
    ["Ambientes", p.ambientes], ["Dormitorios", p.dormitorios], ["Baños", p.banos],
    ["Cochera", ficha?.cochera], ["Plantas", ficha?.plantas], ["Antigüedad", ficha?.antiguedad],
  ] as const;
  const superficies = [
    ["Terreno", superficie(p.terreno)], ["Cubierta", superficie(p.cubierta)], ["Semicubierta", superficie(ficha?.semicubierta ?? null)],
    // Si es igual a la cubierta, repetirlo no dice nada
    ["Total construido", p.construido !== p.cubierta ? superficie(p.construido) : null],
    // Las medidas de cada lado del lote dibujado: también están sobre el mapa, más abajo
    ["Lados", ficha?.mapa?.lados?.length ? ficha.mapa.lados.map((l) => l.texto).join(" · ") : null],
  ] as const;
  const hay = (lista: readonly (readonly [string, unknown])[]) => lista.some(([, v]) => v !== null && v !== undefined && v !== "");
  const resumen = [tipoTexto(p.tipo), p.dormitorios && `${p.dormitorios} dorm.`, p.banos && `${p.banos} ${p.banos === 1 ? "baño" : "baños"}`, p.cubierta && `${superficie(p.cubierta)} cub.`, p.terreno && `${superficie(p.terreno)} de terreno`].filter(Boolean).join(" · ");
  const lote = ficha?.mapa?.lote;

  return (
    <article className="pb-28 md:pb-0">
      <div className="mx-auto max-w-6xl sm:px-6">
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

        {/* La foto y, en la compu, el recuadro con el título, el precio y la consulta encima, como en una revista */}
        <div id="fotos" className="relative scroll-mt-28">
          <Galeria p={p} fotos={ficha?.fotos ?? null} />
          <section className="px-5 pt-6 sm:px-0 md:absolute md:bottom-6 md:left-6 md:w-[25rem] md:rounded-md md:bg-arena md:p-7 md:shadow-[0_18px_40px_-24px_rgb(43_36_32/0.55)]" data-recuadro>
            <p className="text-[12px] font-semibold tracking-[0.16em] text-terracota uppercase">
              {p.operacion.map((o) => (o === "venta" ? "Venta" : "Alquiler")).join(" y ")} · Cód. {p.codigo}
            </p>
            <h1 className="font-display mt-2 text-[1.75rem] leading-[1.15] font-medium text-balance md:text-[1.6rem]">{p.titulo}</h1>
            <p className="mt-1 text-[14.5px] text-suave">{lugar(p)}</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="font-display text-[1.7rem] leading-tight font-medium tabular-nums" data-precio-ficha>{precios.join(" · ")}</p>
              {/* El lote con su forma real, al lado del precio: lleva al mapa */}
              {lote && (
                <a href="#ubicacion" aria-label="Ver el lote en el mapa" className="shrink-0" data-sello-ficha>
                  <Sello puntos={siluetaDe(lote)} etiqueta="Ver el lote ↓" grande className="border border-linea underline-offset-4 hover:underline" />
                </a>
              )}
            </div>
            <p className="mt-1.5 text-[14px]">{resumen}</p>
            <div className="mt-2">
              <Etiquetas p={p} max={4} />
            </div>
            <div className="mt-5 hidden gap-2 md:flex">
              <a href={whatsapp} target="_blank" rel="noopener" data-consultar className={`${BOTON} flex-1 px-4`}>
                <IconoWhatsApp className="h-4 w-4" /> WhatsApp
              </a>
              <a href={LLAMAR} className={`${BOTON_BORDE} px-5`}>Llamar</a>
            </div>
            <p className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-[13.5px] md:flex">
              <button onClick={compartir} className="underline underline-offset-4">{copiado ? "Link copiado" : "Compartir"}</button>
              <a href={mail} data-mail className="underline underline-offset-4">Prefiero que me escriban por mail</a>
            </p>
            {fallo && (
              <p className="mt-3 rounded-md bg-hondo px-4 py-3 text-[14.5px]">
                No se pudo cargar el detalle de esta propiedad.{" "}
                <button onClick={() => location.reload()} className="font-semibold text-terracota underline">Reintentar</button>
              </p>
            )}
          </section>
        </div>

        {/* El resto, en una columna de lectura */}
        <div className="mx-auto mt-10 max-w-3xl space-y-10 px-5 sm:px-0 md:mt-14">
          {(hay(general) || hay(superficies)) && (
            <div id="datos" className="grid scroll-mt-28 gap-x-10 gap-y-10 sm:grid-cols-2">
              {hay(general) && (
                <Caja titulo="Información general">
                  <dl>{general.map(([e, v]) => <Dato key={e} etiqueta={e} valor={v} />)}</dl>
                </Caja>
              )}
              {hay(superficies) && (
                <Caja titulo="Superficies y medidas">
                  <dl>{superficies.map(([e, v]) => <Dato key={e} etiqueta={e} valor={v} />)}</dl>
                </Caja>
              )}
            </div>
          )}

          {ficha?.descripcion && (
            <Caja titulo="Descripción" id="descripcion">
              <Descripcion texto={ficha.descripcion} />
            </Caja>
          )}

          {[["Adicionales", ficha?.adicionales], ["Servicios", ficha?.servicios]].map(([titulo, lista]) =>
            lista && lista.length > 0 ? (
              <Caja key={titulo as string} titulo={titulo as string}>
                <ul className="grid gap-x-8 gap-y-1.5 text-[15.5px] sm:grid-cols-2">
                  {(lista as string[]).map((a) => (
                    <li key={a} className="flex items-baseline gap-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full bg-terracota" aria-hidden="true" />
                      {a}
                    </li>
                  ))}
                </ul>
              </Caja>
            ) : null,
          )}

          {urbs.length > 0 && (
            <Caja titulo="Urbanización">
              {urbs.map((u) => (
                <a key={u.id} href={ir({ u: u.id })} className="flex items-center gap-4 rounded-md p-1 hover:bg-hondo">
                  {u.fotos[0] && <img src={u.fotos[0]} alt="" className="h-14 w-20 rounded-[3px] object-cover" />}
                  <span>
                    <span className="font-display block text-[18px] font-medium">{nombreLindo(u.nombre)}</span>
                    <span className="block text-[13.5px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "")}</span>
                  </span>
                </a>
              ))}
            </Caja>
          )}

          {/* Ubicación: el lote dibujado sobre la foto satelital, con sus medidas, o el pin en el punto publicado */}
          <section id="ubicacion" className="scroll-mt-28 border-t border-chocolate/20 pt-5">
            <MapaFicha p={p} ficha={ficha} fallo={fallo} />
          </section>

          {/* En la compu, la consulta también al final de la lectura */}
          <section className="hidden items-center justify-between gap-6 rounded-md bg-piedra p-7 md:flex">
            <p className="font-display text-[1.4rem] leading-snug font-medium">¿Te interesa? Escribinos y te contamos.</p>
            <div className="flex shrink-0 gap-2">
              <a href={whatsapp} target="_blank" rel="noopener" data-consultar-final className={BOTON}>
                <IconoWhatsApp className="h-4 w-4" /> WhatsApp
              </a>
              <a href={LLAMAR} className={BOTON_BORDE}>Llamar</a>
            </div>
          </section>
        </div>

        {otras.length > 0 && (
          <section className="mt-16 border-t border-linea px-5 pt-12 sm:px-0">
            <Titulo>Propiedades parecidas</Titulo>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" data-parecidas>
              {otras.map((o) => (
                <Tarjeta key={o.id} p={o} op={p.operacion[0]} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* En el celular, los dos botones siempre a mano, abajo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-arena/95 px-3 py-2.5 backdrop-blur md:hidden" data-barra-contacto>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-2">
          <a href={LLAMAR} className={`${BOTON_BORDE} px-5`}>Llamar</a>
          <a href={whatsapp} target="_blank" rel="noopener" data-whatsapp-ficha className={`${BOTON} px-3 text-[14.5px] tracking-normal whitespace-nowrap normal-case`}>
            <IconoWhatsApp className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </div>
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
