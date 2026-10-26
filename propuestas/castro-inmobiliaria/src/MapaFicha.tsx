// El mapa de la ficha, al estilo MojonApp: la foto satelital calzada con el catastro, el lote con borde blanco y
// relleno naranja, la medida de cada lado y la trama de parcelas de alrededor punteada. Donde no hay forma del lote,
// un círculo de zona aproximada. Todo lo que muestra el mapa también está escrito abajo.
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { lugar } from "./componentes";
import { miles, superficie, type Ficha, type Forma as DatosForma, type Propiedad } from "./datos";
import { aLatLng, cargarLeaflet, centroDe, crearMapa, ESTILO_LOTE, ESTILO_VECINA, ESTILO_ZONA, seguirElCalce, type Altura, type Cercano, type Fondo, type MapaDatos } from "./mapa";
import Mapa3D from "./Mapa3D";

export type FichaConMapa = Ficha & { mapa?: MapaDatos; cercanos?: Cercano[]; altura?: Altura | null };

/** Una ficha sin datos de mapa se muestra como una propiedad sin forma: zona aproximada y sin trama. */
const SIN_MAPA: MapaDatos = { calce: null, celda: "", zmax: 17, lote: null, lados: null, zona: { radio: 150, compartido: 0 }, alrededor: [] };

function datosDelMapa(p: Propiedad, ficha: FichaConMapa) {
  const m = ficha.mapa ?? SIN_MAPA;
  const lote = m.lote?.length ? m.lote : null;
  return { m, lote, centro: lote ? centroDe(lote) : ([p.lat, p.lng] as [number, number]), radio: m.zona?.radio ?? 150 };
}

const coma = (n: number) => String(n).replace(".", ",");

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

export default function MapaFicha({ p, ficha }: { p: Propiedad; ficha: FichaConMapa | null }) {
  const caja = useRef<HTMLDivElement>(null);
  const control = useRef<{ mapa: Leaflet.Map; fondo: (f: Fondo) => void } | null>(null);
  const [listo, setListo] = useState(false);
  const [fondo, setFondo] = useState<Fondo>("satelital");
  const [grande, setGrande] = useState(false);
  const [ver3d, setVer3d] = useState(false);
  // En el celular el mapa no se arrastra con un dedo (no se roba el scroll de la página); en pantalla completa, sí
  const tactil = matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const el = caja.current;
    if (!el || !ficha) return;
    const { m, lote, centro, radio } = datosDelMapa(p, ficha);
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
          if (m.alrededor.length) L.polygon(m.alrededor.map((a) => [aLatLng(a)]), ESTILO_VECINA).addTo(mapa);
          let encuadre: Leaflet.LatLngBounds;
          if (lote) {
            encuadre = L.polygon(aLatLng(lote), ESTILO_LOTE).addTo(mapa).getBounds().pad(0.35);
            for (const l of m.lados ?? []) {
              const html = `<span style="transform:translate(-50%,-50%) translate(${l.afuera[0] * 14}px,${l.afuera[1] * 14}px) rotate(${l.ang}deg)">${l.texto}</span>`;
              L.marker([l.lat, l.lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: "lado", iconSize: [0, 0], html }) }).addTo(mapa);
            }
          } else {
            L.circle(centro, { ...ESTILO_ZONA, radius: radio }).addTo(mapa);
            if (m.zona?.compartido) L.marker(centro, { interactive: false, keyboard: false, icon: L.divIcon({ className: "zona-texto", iconSize: [0, 0], html: "<span>Ubicación del barrio, no de la propiedad</span>" }) }).addTo(mapa);
            encuadre = L.latLng(centro).toBounds(radio * 2.5);
          }
          mapa.fitBounds(encuadre, { maxZoom: 19, animate: false });
          mapa.setMaxBounds(L.latLng(centro).toBounds(Math.max(600, radio * 2 + 300)));
          seguirElCalce(mapa, () => m.calce); // recién ahora, con centro y zoom ya fijados (b71b306)
          r.foto.once("load", () => vivo && setListo(true));
          control.current = { mapa, fondo: r.fondo };
          ro.observe(el);
        });
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => {
      vivo = false;
      io.disconnect();
      ro.disconnect();
      mapa?.remove();
      control.current = null;
    };
  }, [p, ficha, tactil]);

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
    // Pantalla completa hecha con CSS: Safari en iPhone no la deja pedir para un div
    document.documentElement.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setGrande(false);
    addEventListener("keydown", tecla);
    return () => {
      document.documentElement.style.overflow = "";
      removeEventListener("keydown", tecla);
    };
  }, [grande, tactil]);

  const d = ficha && datosDelMapa(p, ficha);
  const lote = d?.lote ?? null;
  const lados = d?.m.lados ?? [];
  const cercanos = ficha?.cercanos ?? [];
  const altura = ficha?.altura;
  const [lat, lng] = d?.centro ?? [p.lat, p.lng];
  const compartido = !lote && (d?.m.zona?.compartido ?? 0) > 0;

  return (
    <section id="mapa" className="mt-9 scroll-mt-28 md:scroll-mt-44">
      <h2 className="font-display text-2xl">{lote ? "El lote y su entorno" : "Ubicación"}</h2>
      <p className="mt-1 text-[15px] text-suave">{lugar(p)}</p>
      <div
        className={`isolate overflow-hidden bg-hondo ${grande ? "fixed inset-x-0 top-8 bottom-0 z-50" : "relative mt-4 h-[340px] rounded-2xl border border-linea sm:h-[440px]"}`}
        data-libre
        data-mapa-ficha
        data-mapa-listo={listo || undefined}
      >
        <div ref={caja} className="absolute inset-0 z-0" />
        {!listo &&
          (ficha?.forma && lote ? <Forma f={ficha.forma} /> : <p className="absolute inset-0 grid place-items-center text-[14px] text-suave">Cargando el mapa…</p>)}
        <div role="group" aria-label="Tipo de mapa" className="absolute top-3 left-3 z-10 flex gap-0.5 rounded-full bg-white/95 p-1 shadow">
          {(["satelital", "calles"] as const).map((f) => (
            <button key={f} onClick={() => setFondo(f)} aria-pressed={fondo === f} disabled={!listo} data-fondo={f} className={BOTON}>
              {f === "satelital" ? "Satelital" : "Calles"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setGrande(!grande)}
          aria-label={grande ? "Cerrar la pantalla completa" : "Ver el mapa en pantalla completa"}
          data-pantalla-completa
          className="absolute top-3 right-3 z-10 grid h-10 min-w-10 place-items-center rounded-full bg-white/95 px-2.5 text-[14px] font-semibold shadow"
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
        {ver3d && <Mapa3D centro={[lat, lng]} lote={lote} radio={d?.radio ?? 150} zmax={d?.m.zmax ?? 17} etiqueta={p.tipo === "Terreno" ? "Este terreno" : "Esta propiedad"} alCerrar={() => setVer3d(false)} />}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button onClick={() => setVer3d(true)} disabled={!ficha} data-ver-3d className="rounded-2xl border border-linea bg-white px-4 py-1.5 text-left hover:bg-hondo">
          <span className="block text-[14.5px] font-semibold">Ver en 3D</span>
          <span className="block text-[12px] text-suave">Usa unos 3 MB de datos</span>
        </button>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`} target="_blank" rel="noopener" data-mapa className="font-semibold whitespace-nowrap text-naranja-osc">
          Cómo llegar →
        </a>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-suave" data-nota-mapa>
        {lote
          ? "Forma según el catastro de San Luis. Las medidas son aproximadas: las definitivas, según la mensura."
          : compartido
            ? "Ubicación del barrio, no de la propiedad: la inmobiliaria publica el mismo punto para varias propiedades."
            : "Zona aproximada, alrededor de la ubicación que publica la inmobiliaria."}
      </p>

      {ficha && (lados.length > 0 || cercanos.length > 0 || altura || lote) && (
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
          {cercanos.length > 0 && (
            <div>
              <dt className="text-[13px] font-semibold text-suave">A cuánto queda</dt>
              <dd className="mt-1">
                <ul className="space-y-0.5">
                  {cercanos.map((c) => (
                    <li key={c.lugar} data-cercano>
                      {c.min ? `${c.lugar}: ${coma(c.km)} km · ${c.min} min en auto` : `A ${coma(c.km)} km de ${c.lugar}`}
                    </li>
                  ))}
                </ul>
                <span className="mt-1 block text-[12.5px] text-suave">Aproximado, en auto, según OpenStreetMap.</span>
              </dd>
            </div>
          )}
          {altura && (
            <div>
              <dt className="text-[13px] font-semibold text-suave">Altura y pendiente</dt>
              <dd className="mt-1" data-altura>
                ≈ {miles(altura.m)} m sobre el nivel del mar · {altura.pendiente === "plana" ? "zona plana" : `zona de pendiente ${altura.pendiente}${altura.hacia ? ` hacia el ${altura.hacia}` : ""}`}
              </dd>
              <span className="mt-1 block text-[12.5px] text-suave">Aproximado: habla de la zona, no del lote (relieve SRTM, de unos 30 m).</span>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
