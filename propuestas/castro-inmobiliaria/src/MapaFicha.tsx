// El mapa de la ficha, al estilo MojonApp: la foto satelital calzada con el catastro, el lote con borde blanco y
// relleno naranja, la medida de cada lado y la trama de parcelas de alrededor punteada. Donde no hay forma del lote,
// un pin en el punto que publica la inmobiliaria. Todo lo que muestra el mapa también está escrito abajo.
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { lugar } from "./componentes";
import { superficie, type Ficha, type Forma as DatosForma, type Propiedad } from "./datos";
import { aLatLng, cargarLeaflet, centroDe, crearMapa, ESTILO_LOTE, ESTILO_VECINA, seguirElCalce, type Fondo, type MapaDatos } from "./mapa";

export type FichaConMapa = Ficha & { mapa?: MapaDatos };

/** Una ficha sin datos de mapa se muestra como una propiedad sin forma: el pin en el punto publicado y sin trama. */
const SIN_MAPA: MapaDatos = { calce: null, celda: "", zmax: 17, lote: null, lados: null, zona: null, alrededor: [] };

function datosDelMapa(p: Propiedad, mapa?: MapaDatos) {
  const m = mapa ?? SIN_MAPA;
  const lote = m.lote?.length ? m.lote : null;
  return { m, lote, centro: lote ? centroDe(lote) : ([p.lat, p.lng] as [number, number]) };
}

/** El pin del punto publicado: la punta (abajo al medio del ícono) cae justo en el punto. Colores en index.css (.punto) */
const PIN = '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 40C15 40 2.5 25 2.5 14a12.5 12.5 0 0 1 25 0C27.5 25 15 40 15 40Z"/><circle cx="15" cy="14" r="4.5"/></svg>';

/** Rótulos de lados que se pisan (lados cortos y juntos): se esconde el del lado más corto, que igual está escrito
 *  debajo del mapa. Se vuelve a mirar en cada zoom, porque al acercarse se separan. */
function ocultarChoques(rotulos: HTMLElement[]) {
  const puestos: DOMRect[] = [];
  for (const r of rotulos) {
    r.style.visibility = "";
    const b = r.getBoundingClientRect();
    const choca = puestos.some((o) => Math.min(b.right, o.right) - Math.max(b.left, o.left) > 1 && Math.min(b.bottom, o.bottom) - Math.max(b.top, o.top) > 1);
    if (choca) r.style.visibility = "hidden";
    else puestos.push(b);
  }
}

/** Mientras baja el mapa, la imagen fija del lote que ya existía (la foto calzada con el dibujo encima). */
function Forma({ f }: { f: DatosForma }) {
  return (
    <div className="absolute inset-0" data-forma aria-hidden="true">
      <img src={f.img} alt="" className="h-full w-full object-cover" />
      <svg viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {f.vecinas.map((v) => (
          <polygon key={v} points={v} fill="none" stroke="#f9a825" strokeWidth={1.5} strokeDasharray="4 3" />
        ))}
        <polygon points={f.lote} fill="rgb(255 128 0 / 0.45)" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
        {f.lados.map((l) => (
          <text key={`${l.x},${l.y}`} x={l.x} y={l.y} transform={`rotate(${l.ang} ${l.x} ${l.y})`} textAnchor="middle" dominantBaseline="middle" fontSize={19} fontWeight={700} fill="#fff" stroke="rgb(0 0 0 / 0.75)" strokeWidth={4} paintOrder="stroke">
            {l.texto}
          </text>
        ))}
      </svg>
    </div>
  );
}

const BOTON = "rounded-full px-3 py-1.5 text-[13.5px] font-semibold aria-pressed:bg-tinta aria-pressed:text-white";

/** fallo: no se pudo bajar la ficha; el mapa igual muestra el pin en el punto publicado (sin trama ni calce). */
export default function MapaFicha({ p, ficha, fallo }: { p: Propiedad; ficha: FichaConMapa | null; fallo: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const control = useRef<{ mapa: Leaflet.Map; fondo: (f: Fondo) => void } | null>(null);
  const [listo, setListo] = useState(false);
  const [fondo, setFondo] = useState<Fondo>("satelital");
  const [grande, setGrande] = useState(false);
  // No hay mapa que mostrar: no bajó Leaflet (Chrome guarda el import fallido hasta recargar, así que lo único que sirve
  // es recargar la página) o no bajó ninguna imagen de la foto y queda la imagen fija. Sin Satelital/Calles, que no andarían
  const [error, setError] = useState(false);
  const botonGrande = useRef<HTMLButtonElement>(null);
  // En el celular el mapa no se arrastra con un dedo (no se roba el scroll de la página); en pantalla completa, sí
  const tactil = matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const el = caja.current;
    if (!el || (!ficha && !fallo)) return;
    const { m, lote, centro } = datosDelMapa(p, ficha?.mapa);
    let vivo = true; // StrictMode monta dos veces y el import puede volver después de desmontar
    let mapa: Leaflet.Map | undefined;
    const ro = new ResizeObserver(() => mapa?.invalidateSize());
    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        io.disconnect();
        cargarLeaflet().then((L) => {
          if (!vivo) return;
          const r = crearMapa(L, el, { zmax: m.zmax, dragging: !tactil, minZoom: 15 });
          mapa = r.mapa;
          const trama = m.alrededor.length ? L.polygon(m.alrededor.map((a) => [aLatLng(a)]), ESTILO_VECINA).addTo(mapa) : null;
          let encuadre: Leaflet.LatLngBounds;
          let rotulos: Leaflet.Marker[] = [];
          if (lote) {
            encuadre = L.polygon(aLatLng(lote), ESTILO_LOTE).addTo(mapa).getBounds().pad(0.35);
            // Del lado más largo al más corto: si dos rótulos se pisan, queda el del lado más largo
            const largo = (texto: string) => parseFloat(texto.replace(",", "."));
            rotulos = [...(m.lados ?? [])].sort((a, b) => largo(b.texto) - largo(a.texto)).map((l) => {
              const html = `<span style="transform:translate(-50%,-50%) translate(${l.afuera[0] * 14}px,${l.afuera[1] * 14}px) rotate(${l.ang}deg)">${l.texto}</span>`;
              return L.marker([l.lat, l.lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: "lado", iconSize: [0, 0], html }) }).addTo(r.mapa);
            });
          } else {
            L.marker(centro, { interactive: false, keyboard: false, icon: L.divIcon({ className: "punto", iconSize: [30, 40], iconAnchor: [15, 40], html: PIN }) }).addTo(mapa);
            // Un punto que la inmobiliaria repite para varias no es el de esta: que no parezca tan exacto como uno propio
            if (m.zona?.compartido) L.marker(centro, { interactive: false, keyboard: false, icon: L.divIcon({ className: "punto-aprox", iconSize: [0, 0], html: "<span>Punto aproximado</span>" }) }).addTo(mapa);
            encuadre = L.latLng(centro).toBounds(300);
          }
          mapa.fitBounds(encuadre, { maxZoom: 19, animate: false });
          // Unos 300 m alrededor, o más si el lote o la trama son más grandes: que se pueda ver todo lo dibujado
          const limite = L.latLng(centro).toBounds(600).extend(encuadre);
          if (trama) limite.extend(trama.getBounds());
          mapa.setMaxBounds(limite.pad(0.1));
          if (rotulos.length) {
            const mirar = () => ocultarChoques(rotulos.map((x) => x.getElement()?.firstElementChild as HTMLElement).filter(Boolean));
            mirar();
            mapa.on("zoomend", mirar);
          }
          seguirElCalce(mapa, () => m.calce); // recién ahora, con centro y zoom ya fijados (b71b306)
          // Listo cuando terminó de bajar la foto y llegó al menos una imagen: con Esri caído 'load' llega igual (todas
          // con error), y la imagen fija del lote es mejor respaldo que el gris. Sin imagen fija, el gris con el dibujo.
          let llego = !(ficha?.forma && lote);
          r.foto.on("tileload", () => {
            llego = true;
          });
          r.foto.on("load", () => vivo && (llego ? setListo(true) : setError(true)));
          control.current = { mapa, fondo: r.fondo };
          ro.observe(el);
        }).catch(() => vivo && setError(true));
      },
      // Recién cuando entra en pantalla: con la señal de Merlo, abrir la ficha no baja el mapa de arriba
      { rootMargin: "0px" },
    );
    io.observe(el);
    return () => {
      vivo = false;
      io.disconnect();
      ro.disconnect();
      mapa?.remove();
      control.current = null;
    };
  }, [p, ficha, fallo, tactil]);

  useEffect(() => {
    control.current?.fondo(fondo);
  }, [fondo]);

  useEffect(() => {
    const mapa = control.current?.mapa;
    if (mapa) {
      if (grande || !tactil) mapa.dragging.enable();
      else mapa.dragging.disable();
      if (grande) mapa.scrollWheelZoom.enable();
      else mapa.scrollWheelZoom.disable();
    }
    if (!grande) return;
    // Pantalla completa hecha con CSS: Safari en iPhone no la deja pedir para un div. Lo de atrás queda inerte, así el
    // Tab no se va a botones tapados por el mapa. La cinta de la propuesta no: queda a la vista arriba y sigue andando
    document.documentElement.style.overflow = "hidden";
    const inertes: HTMLElement[] = [];
    for (let e = caja.current?.parentElement; e && e !== document.body; e = e.parentElement)
      for (const h of Array.from(e.parentElement?.children ?? []))
        if (h !== e && h instanceof HTMLElement && !h.inert && !h.matches("aside[aria-label^='Aviso']")) {
          h.inert = true;
          inertes.push(h);
        }
    return () => {
      document.documentElement.style.overflow = "";
      for (const h of inertes) h.inert = false;
    };
    // listo: si se tocó pantalla completa antes de que bajara el mapa, recién ahora se le puede habilitar el arrastre
  }, [grande, tactil, listo]);

  // Escape cierra la pantalla completa (el de otro diálogo, como la galería, lo cierra a él)
  useEffect(() => {
    if (!grande) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target as Element).closest?.("dialog")) return;
      setGrande(false);
      botonGrande.current?.focus();
    };
    addEventListener("keydown", tecla);
    return () => removeEventListener("keydown", tecla);
  }, [grande]);

  const d = ficha || fallo ? datosDelMapa(p, ficha?.mapa) : null;
  const lote = d?.lote ?? null;
  const lados = d?.m.lados ?? [];
  const [lat, lng] = d?.centro ?? [p.lat, p.lng];
  // zona trae {radio, compartido} o solo {compartido}: del radio ya no se usa nada
  const compartido = lote ? 0 : (d?.m.zona?.compartido ?? 0);

  return (
    <section id="mapa" className="scroll-mt-28">
      <h2 className="text-[15px] font-bold tracking-wide text-terracota uppercase">{lote ? "Ubicación: el lote y su entorno" : "Ubicación"}</h2>
      <p className="mt-1 text-[15px] text-suave">{lugar(p)}</p>
      {/* En pantalla completa, diálogo sin aria-modal: lo de atrás ya queda inerte, salvo la cinta, que sigue andando */}
      <div
        className={`isolate overflow-hidden bg-hondo ${grande ? "fixed inset-x-0 top-8 bottom-0 z-50" : "relative mt-4 h-[340px] rounded-2xl border border-linea sm:h-[440px]"}`}
        role={grande ? "dialog" : "region"}
        aria-label={lote ? "Mapa del lote" : "Mapa de la ubicación"}
        data-libre
        data-mapa-ficha
        data-mapa-listo={listo || undefined}
      >
        <div ref={caja} className="absolute inset-0 z-0" />
        {!listo &&
          (ficha?.forma && lote ? (
            <Forma f={ficha.forma} />
          ) : error ? (
            <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 p-6 text-center text-[15px]" data-mapa-error>
              <p>No se pudo cargar el mapa.</p>
              <button onClick={() => location.reload()} className="rounded-full bg-naranja-osc px-4 py-2 font-semibold text-white">
                Recargar la página
              </button>
            </div>
          ) : (
            <p className="absolute inset-0 grid place-items-center text-[14px] text-suave">Cargando el mapa…</p>
          ))}
        {!error && (
          <div role="group" aria-label="Tipo de mapa" className="absolute top-3 left-3 z-10 flex gap-0.5 rounded-full bg-white/95 p-1 shadow">
            {(["satelital", "calles"] as const).map((f) => (
              <button key={f} onClick={() => setFondo(f)} aria-pressed={fondo === f} disabled={!listo} data-fondo={f} className={BOTON}>
                {f === "satelital" ? "Satelital" : "Calles"}
              </button>
            ))}
          </div>
        )}
        <button
          ref={botonGrande}
          onClick={(e) => {
            setGrande(!grande);
            e.currentTarget.focus(); // Safari no enfoca el botón al tocarlo
          }}
          aria-label={grande ? "Cerrar la pantalla completa" : "Ver el mapa en pantalla completa"}
          data-pantalla-completa
          className="absolute top-3 right-3 z-30 grid h-10 min-w-10 place-items-center rounded-full bg-white/95 px-2.5 text-[14px] font-semibold shadow"
        >
          {grande ? (
            "Cerrar"
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
          )}
        </button>
        {/* El mapa nunca gira: el norte siempre queda arriba */}
        <span className="pointer-events-none absolute top-15 right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white" title="Norte" data-norte>
          <svg viewBox="-12 -14 24 28" className="h-7 w-7" aria-hidden="true">
            <path d="M0 -12 L6 4 L0 1 L-6 4 Z" fill="#fff" />
            <text y={12} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff">N</text>
          </svg>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`} target="_blank" rel="noopener" data-mapa className="font-semibold whitespace-nowrap text-naranja-osc">
          Cómo llegar →
        </a>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-suave" data-nota-mapa>
        {lote
          ? "Forma según el catastro de San Luis. Las medidas son aproximadas: las definitivas, según la mensura."
          : compartido
            ? `La inmobiliaria publica este mismo punto para ${compartido + 1} propiedades: es aproximado.`
            : "Ubicación que publica la inmobiliaria."}
      </p>

      {ficha && (lados.length > 0 || lote) && (
        <dl className="mt-5 grid gap-x-8 gap-y-5 text-[15px] sm:grid-cols-2">
          {lados.length > 0 && (
            <div>
              <dt className="text-[13px] font-semibold text-suave">Medidas de los lados</dt>
              <dd className="mt-1" data-medidas>{lados.map((l) => l.texto).join(" · ")}</dd>
            </div>
          )}
          {lote && p.terreno ? (
            <div>
              <dt className="text-[13px] font-semibold text-suave">Superficie</dt>
              <dd className="mt-1" data-superficie>{superficie(p.terreno)}, la que publica la inmobiliaria</dd>
            </div>
          ) : null}
        </dl>
      )}
    </section>
  );
}
