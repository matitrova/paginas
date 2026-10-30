import { useEffect, useRef, useState } from "react";
import { Etiquetas, IconoWhatsApp, ir, linkPropiedad, linkWhatsApp, LLAMAR, lugar, Tarjeta, tipoTexto, Titulo } from "./componentes";
import { esTerreno, pedirFicha, portada, porId, precio, PROPIEDADES, SITIO, superficie, TIPOS, URBANIZACIONES, type Propiedad } from "./datos";
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
            onClick={() => setGrande(i)}
            onError={() => setRotas((r) => new Set(r).add(f))}
            style={i === 0 ? { backgroundImage: `url(${portada(p.id)})`, backgroundSize: "cover" } : undefined}
            className="h-full w-full shrink-0 cursor-zoom-in snap-center object-cover"
          />
        ))}
      </div>
      {total > 0 && (
        <button onClick={() => setGrande(actual)} aria-label="Ver las fotos en grande" data-ver-grande className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
        </button>
      )}
      {total > 1 && (
        <>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[13px] text-white" data-contador>
            {actual + 1} / {total}
          </span>
          <button onClick={() => mover(caja.current, -1)} aria-label="Foto anterior" disabled={actual === 0} className="absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow disabled:opacity-0 sm:grid">‹</button>
          <button onClick={() => mover(caja.current, 1)} aria-label="Foto siguiente" disabled={actual === total - 1} className="absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow disabled:opacity-0 sm:grid">›</button>
        </>
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

// Compartir y el mail: botones secundarios
const SECUNDARIO = "flex items-center justify-center gap-2 rounded-full border border-linea bg-white px-4 py-2.5 text-[14.5px] font-semibold hover:bg-hondo";

/** Una caja de la ficha, como las de su sitio: un título en naranja y el contenido. */
function Caja({ titulo, id, children }: { titulo: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-linea bg-white p-5 sm:p-6">
      <h2 className="font-display text-[15px] font-bold tracking-wide text-terracota uppercase">{titulo}</h2>
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
        <h1 className="font-display text-3xl font-bold">Esta propiedad ya no está publicada</h1>
        <p className="mt-4 text-suave">Puede que se haya vendido o alquilado.</p>
        <a href={ir({ ver: "propiedades" })} className="mt-8 inline-block rounded-full bg-terracota px-6 py-3 font-semibold text-white">Ver las propiedades</a>
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
  ] as const;
  const hay = (lista: readonly (readonly [string, unknown])[]) => lista.some(([, v]) => v !== null && v !== undefined && v !== "");

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

        <div id="fotos" className="scroll-mt-28">
          <Galeria p={p} fotos={ficha?.fotos ?? null} />
        </div>

        <div className="mt-6 grid gap-6 px-5 sm:px-0 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            {/* Título y precio, como la primera caja de su ficha */}
            <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6">
              <h1 className="font-display text-[22px] leading-snug font-bold text-balance sm:text-[26px]">{p.titulo}</h1>
              <p className="mt-1 text-[15px] text-suave">{tipoTexto(p.tipo)} · {lugar(p)}</p>
              <p className="font-display mt-3 text-[26px] font-bold text-terracota" data-precio-ficha>{precios.join(" · ")}</p>
              <p className="text-[13.5px] text-suave">{p.operacion.map((o) => (o === "venta" ? "Venta" : "Alquiler")).join(" y ")} · Cód. {p.codigo}</p>
              <div className="mt-3">
                <Etiquetas p={p} max={4} />
              </div>
              {fallo && (
                <p className="mt-3 rounded-xl bg-hondo px-4 py-3 text-[14.5px]">
                  No se pudo cargar el detalle de esta propiedad.{" "}
                  <button onClick={() => location.reload()} className="font-semibold text-terracota underline">Reintentar</button>
                </p>
              )}
            </section>

            {(hay(general) || hay(superficies)) && (
              <div id="datos" className="grid scroll-mt-28 gap-5 sm:grid-cols-2">
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

            {ficha && ficha.adicionales.length > 0 && (
              <Caja titulo="Adicionales">
                <ul className="grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-2">
                  {ficha.adicionales.map((a) => (
                    <li key={a} className="flex items-start gap-2">
                      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-terracota" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path d="M4 10l4 4 8-8" /></svg>
                      {a}
                    </li>
                  ))}
                </ul>
              </Caja>
            )}

            {ficha && ficha.servicios.length > 0 && (
              <Caja titulo="Servicios">
                <ul className="flex flex-wrap gap-2">
                  {ficha.servicios.map((s) => (
                    <li key={s} className="rounded-full bg-naranja/15 px-3.5 py-1.5 text-[14px] font-medium">{s}</li>
                  ))}
                </ul>
              </Caja>
            )}

            {urbs.length > 0 && (
              <Caja titulo="Urbanización">
                {urbs.map((u) => (
                  <a key={u.id} href={ir({ u: u.id })} className="flex items-center gap-4 rounded-xl p-1 hover:bg-hondo">
                    {u.fotos[0] && <img src={u.fotos[0]} alt="" className="h-14 w-20 rounded-lg object-cover" />}
                    <span>
                      <span className="block font-semibold">{nombreLindo(u.nombre)}</span>
                      <span className="block text-[13.5px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "")}</span>
                    </span>
                  </a>
                ))}
              </Caja>
            )}

            {/* Ubicación: el lote dibujado sobre la foto satelital, con sus medidas, o el pin en el punto publicado */}
            <section className="rounded-2xl border border-linea bg-white p-5 sm:p-6">
              <MapaFicha p={p} ficha={ficha} fallo={fallo} />
            </section>

            {esTerreno(p) && <p className="text-[13px] text-suave">{SITIO.pie.legales[0]}</p>}
          </div>

          {/* En la compu, la consulta al costado, como el "Recibir más información" de su ficha */}
          <aside className="hidden md:block">
            <div className="sticky top-28 space-y-3 rounded-2xl border border-linea bg-white p-5">
              <p className="font-display text-[15px] font-bold tracking-wide text-terracota uppercase">Recibí más información</p>
              <a href={whatsapp} target="_blank" rel="noopener" data-consultar className="flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-5 py-3 font-semibold text-black hover:brightness-95">
                <IconoWhatsApp className="h-5 w-5" /> Consultar por WhatsApp
              </a>
              <a href={LLAMAR} className={SECUNDARIO}>Llamar</a>
              <button onClick={compartir} className={`${SECUNDARIO} w-full`}>{copiado ? "Link copiado" : "Compartir"}</button>
              <a href={mail} data-mail className="block pt-1 text-center text-[14px] text-tinta/75 underline underline-offset-4 hover:text-tinta">Prefiero que me escriban por mail</a>
            </div>
          </aside>
        </div>

        {otras.length > 0 && (
          <section className="mt-14 px-5 sm:px-0">
            <Titulo centrado>Búsquedas relacionadas</Titulo>
            <div className="mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3" data-parecidas>
              {otras.map((o) => (
                <Tarjeta key={o.id} p={o} op={p.operacion[0]} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* En el celular, los dos botones siempre a mano, abajo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white/95 px-3 py-2.5 backdrop-blur md:hidden" data-barra-contacto>
        <div className="grid grid-cols-2 gap-2">
          <a href={LLAMAR} className="rounded-full border border-linea py-2.5 text-center font-semibold">Llamar</a>
          <a href={whatsapp} target="_blank" rel="noopener" data-whatsapp-ficha className="flex items-center justify-center gap-2 rounded-full bg-[#25d366] py-2.5 font-semibold text-black">
            <IconoWhatsApp className="h-5 w-5" /> WhatsApp
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
