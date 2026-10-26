import { useEffect, useRef, useState } from "react";
import { BotonGuardar, Etiquetas, ir, linkPropiedad, lugar, Tarjeta, tipoTexto, useConsulta } from "./componentes";
import { esTerreno, pedirFicha, portada, porId, precio, PROPIEDADES, SITIO, superficie, TELEFONO, TIPOS, URBANIZACIONES, type Propiedad } from "./datos";
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

const ATAJOS = [
  { id: "fotos", texto: "Fotos" },
  { id: "mapa", texto: "Mapa" },
  { id: "datos", texto: "Datos" },
  { id: "descripcion", texto: "Descripción" },
];

// Guardar y Compartir: el mismo botón secundario
const SECUNDARIO = "flex items-center gap-2 rounded-full border border-linea bg-white px-4 py-2.5 text-[14.5px] font-semibold hover:bg-hondo";

// Lo que queda debajo del encabezado fijo (y de la barra de la ficha en la compu) al saltar a una sección
const DEBAJO_DE_LAS_BARRAS = "scroll-mt-28 md:scroll-mt-44";

export default function Ficha({ id }: { id: string }) {
  const p = porId.get(id);
  const [ficha, setFicha] = useState<FichaConMapa | null>(null);
  const [fallo, setFallo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const consulta = useConsulta();
  // La barra fija de la compu aparece recién cuando el precio grande sale de la pantalla: si no, el precio se veía dos
  // veces al abrir la ficha. Los 96 px de arriba son la cinta y el encabezado, que lo tapan antes de que salga.
  const precioGrande = useRef<HTMLParagraphElement>(null);
  const [conBarra, setConBarra] = useState(false);
  useEffect(() => {
    if (!precioGrande.current) return;
    const io = new IntersectionObserver(([e]) => setConBarra(!e.isIntersecting), { rootMargin: "-96px 0px 0px 0px" });
    io.observe(precioGrande.current);
    return () => io.disconnect();
  }, [p]);

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
  const link = linkPropiedad(p.id);
  const mensaje = `Hola, me interesa: ${p.titulo} (cód. ${p.codigo}), ${precios.join(" / ")}. ¿Sigue disponible?\n${link}`;
  const mail = `mailto:${SITIO.contacto.email}?subject=${encodeURIComponent(`Consulta por ${p.titulo} (cód. ${p.codigo})`)}&body=${encodeURIComponent(`Hola, me interesa esta propiedad: ${p.titulo} (cód. ${p.codigo}), ${precios.join(" / ")}.\n${link}\n\nMi nombre:\nMi teléfono:`)}`;
  const tel = `tel:+54${TELEFONO.replace(/\D/g, "")}`;
  const atajos = ATAJOS.filter((a) => a.id !== "descripcion" || ficha?.descripcion);
  const compartir = async () => {
    if (navigator.share) return navigator.share({ title: p.titulo, url: link }).catch(() => {});
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  };

  return (
    <article className="pb-28 md:pb-0">
      {/* En la compu, una barra fija con el precio, los atajos y la consulta (en el celular, la barra de abajo). Va dentro de
          una caja pegajosa de alto 0: aparece encima de la página sin correrla */}
      <div className="sticky top-24 z-30 hidden h-0 md:block">
        <div className={`border-b border-linea bg-fondo/95 backdrop-blur transition duration-200 ${conBarra ? "" : "invisible -translate-y-2 opacity-0"}`} data-barra-ficha>
          {/* Con venta y alquiler, un precio debajo del otro; si igual no entran (tablet), se recortan y no empujan los botones */}
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-2.5">
            <p className={`min-w-0 font-semibold tracking-tight ${precios.length > 1 ? "text-[14.5px] leading-tight" : "text-[17px]"}`}>
              {precios.map((x) => (
                <span key={x} className="block truncate" title={x}>{x}</span>
              ))}
            </p>
            <nav aria-label="Ir a" className="flex shrink-0 gap-0.5 text-[14.5px]">
              {atajos.map((a) => (
                <a key={a.id} href={`#${a.id}`} className="rounded-full px-3 py-1.5 whitespace-nowrap text-tinta/80 hover:bg-hondo">{a.texto}</a>
              ))}
            </nav>
            {/* En la tablet no entra la palabra: va el ícono */}
            <a href={tel} aria-label="Llamar" className="ml-auto flex shrink-0 items-center rounded-full border border-linea px-2.5 py-2 text-[14.5px] font-semibold whitespace-nowrap hover:bg-hondo lg:px-4">
              <svg viewBox="0 0 24 24" className="h-5 w-5 lg:hidden" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
              <span className="hidden lg:inline">Llamar</span>
            </a>
            <button onClick={() => consulta.abrir(mensaje)} data-consultar className="shrink-0 rounded-full bg-[#25d366] px-5 py-2 text-[14.5px] font-semibold whitespace-nowrap text-black hover:brightness-95">
              <span className="hidden lg:inline">Consultar por </span>WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl sm:px-6">
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

        <div id="fotos" className={DEBAJO_DE_LAS_BARRAS}>
          <Galeria p={p} fotos={ficha?.fotos ?? null} />
        </div>
        <div className="px-5 sm:px-0">
          {/* En la compu, la consulta va al lado del precio: la barra fija aparece cuando el precio sale de la pantalla, así
              que siempre hay una a la vista (en el celular está la barra de abajo) */}
          <div className="mt-6 flex items-center gap-4">
            {/* Precio y código se acomodan entre ellos: con venta y alquiler no entran en un renglón y el botón quedaba solo abajo */}
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
              <p ref={precioGrande} className="text-[28px] font-semibold tracking-tight" data-precio-ficha>{precios.join(" · ")}</p>
              <p className="text-[13.5px] text-suave">{p.operacion.map((o) => (o === "venta" ? "Venta" : "Alquiler")).join(" y ")} · Cód. {p.codigo}</p>
            </div>
            <button onClick={() => consulta.abrir(mensaje)} data-consultar-arriba className="hidden shrink-0 rounded-full bg-[#25d366] px-5 py-2.5 text-[14.5px] font-semibold text-black hover:brightness-95 md:block">
              Consultar por WhatsApp
            </button>
          </div>
          <h1 className="font-display mt-2 text-[25px] leading-tight font-normal text-balance sm:text-[30px]">{p.titulo}</h1>
          {fallo && (
            <p className="mt-3 rounded-xl bg-hondo px-4 py-3 text-[14.5px]">
              No se pudo cargar el detalle de esta propiedad.{" "}
              <button onClick={() => location.reload()} className="font-semibold text-naranja-osc underline">Reintentar</button>
            </p>
          )}
          <p className="mt-2 text-[15px] text-suave">{tipoTexto(p.tipo)} · {lugar(p)}</p>
          <div className="mt-3">
            <Etiquetas p={p} max={4} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <BotonGuardar id={p.id} texto="Guardar" className={SECUNDARIO} />
            <button onClick={compartir} className={SECUNDARIO}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
              {copiado ? "Link copiado" : "Compartir"}
            </button>
          </div>
          <p className="mt-3 text-[14px]">
            <a href={mail} data-mail className="text-tinta/75 underline underline-offset-4 hover:text-tinta">Prefiero que me escriban por mail</a>
          </p>

          <dl id="datos" className={`mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 ${DEBAJO_DE_LAS_BARRAS}`}>
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

          <MapaFicha p={p} ficha={ficha} fallo={fallo} />

          {ficha?.descripcion && (
            <section id="descripcion" className={`mt-10 ${DEBAJO_DE_LAS_BARRAS}`}>
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

          {esTerreno(p) && <p className="mt-8 text-[13px] text-suave">{SITIO.pie.legales[0]}</p>}
        </div>

        {otras.length > 0 && (
          <section className="mt-14 px-5 sm:px-0">
            <h2 className="font-display text-2xl sm:text-3xl">Parecidas</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-parecidas>
              {otras.map((o) => (
                <Tarjeta key={o.id} p={o} op={p.operacion[0]} />
              ))}
            </div>
            <a href={ir({ ver: "propiedades", tipo: p.tipo, op: p.operacion[0] === "venta" ? undefined : p.operacion[0] })} className="mt-5 inline-block font-semibold text-naranja-osc">
              Ver más {(TIPOS[p.tipo] ?? "propiedades").toLowerCase()} →
            </a>
          </section>
        )}
      </div>

      {/* En el celular: los atajos y los dos botones siempre a mano, abajo, sin tapar media pantalla */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white/95 px-3 pt-1 pb-2.5 backdrop-blur md:hidden" data-barra-contacto>
        <nav aria-label="Ir a" className="grid auto-cols-fr grid-flow-col text-center text-[13px] font-medium text-tinta/75">
          {atajos.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="py-1.5">{a.texto}</a>
          ))}
        </nav>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <a href={tel} className="rounded-full border border-linea py-2.5 text-center font-semibold">Llamar</a>
          <button onClick={() => consulta.abrir(mensaje)} className="rounded-full bg-[#25d366] py-2.5 font-semibold text-black">WhatsApp</button>
        </div>
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
