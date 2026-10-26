// El mapa de todas las propiedades, con la misma foto calzada que la ficha (src/mapa.ts). Lo que se ve depende de
// qué tan cerca se mira: de lejos una burbuja por zona con su cantidad, más cerca el precio de cada una, y de cerca
// los terrenos con su forma real. Tocar una marca abre su tarjeta; la tarjeta lleva a la ficha.
// Lo usan el listado (con sus filtros), la portada y la página de cada urbanización. El mapa de urbanizaciones
// (MapaUrbanizaciones, abajo) usa la misma base con los logos de los loteos.
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ir } from "./componentes";
import { portada, precio, precioEn, URBANIZACIONES, type Propiedad } from "./datos";
import { nombreLindo } from "./Ficha";
import { aLatLng, cargarLeaflet, celdaDe, crearMapa, ESTILO_LOTE, ESTILO_ZONA, seguirElCalce } from "./mapa";

type L = typeof Leaflet;
type Datos = { calces: Record<string, [number, number]>; lotes: Record<string, [number, number][]> };
type Base = { L: L; mapa: Leaflet.Map; datos: Datos };

let datos: Promise<Datos> | null = null;
const pedirDatos = () => (datos ??= fetch("./mapa.json").then((r) => (r.ok ? r.json() : { calces: {}, lotes: {} })));

const MERLO: [number, number] = [-32.3427, -65.0137];
// Más cerca que 17 el calce de la celda del centro deja de alcanzar para las celdas vecinas (difieren hasta 6 m):
// el detalle de cada lote está en su ficha
const ZOOM_MAXIMO = 17;
const ZOOM_LOTES = 15;

/** La base que comparten los mapas: Leaflet y mapa.json se bajan recién cuando el mapa está por verse. */
function useMapaBase(caja: RefObject<HTMLDivElement | null>, arrastrable: boolean) {
  const [base, setBase] = useState<Base | null>(null);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    let vivo = true; // StrictMode monta dos veces y lo que se baja puede volver después de desmontar
    let mapa: Leaflet.Map | undefined;
    const ro = new ResizeObserver(() => mapa?.invalidateSize());
    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        io.disconnect();
        Promise.all([cargarLeaflet(), pedirDatos()]).then(([L, d]) => {
          if (!vivo) return;
          const r = crearMapa(L, el, { zmax: 18, maxZoom: ZOOM_MAXIMO, minZoom: 9, dragging: arrastrable, touchZoom: true });
          mapa = r.mapa;
          mapa.setView(MERLO, 13, { animate: false });
          const m = mapa;
          seguirElCalce(m, () => {
            const c = m.getCenter();
            return d.calces[celdaDe(c.lat, c.lng)] ?? null;
          });
          r.foto.once("load", () => {
            if (vivo) el.dataset.mapaListo = "1";
          });
          ro.observe(el);
          setBase({ L, mapa, datos: d });
        });
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => {
      vivo = false;
      io.disconnect();
      ro.disconnect();
      mapa?.remove();
      setBase(null);
    };
  }, [caja, arrastrable]);
  return base;
}

/** "USD 120 mil", "USD 1,2 M", "$ 600 mil": lo que entra en una pastilla del mapa. */
function precioCorto(p: Propiedad, op?: string) {
  const { precio: n, moneda } = precioEn(p, op);
  if (!n) return "Consultar";
  const signo = moneda === "USD" ? "USD" : "$";
  if (n >= 1_000_000) return `${signo} ${String(Math.round(n / 100_000) / 10).replace(".", ",")} M`;
  if (n >= 1000) return `${signo} ${Math.round(n / 1000)} mil`;
  return `${signo} ${n}`;
}

const marca = (L: L, latlng: Leaflet.LatLngExpression, html: string, titulo: string) =>
  L.marker(latlng, { keyboard: false, title: titulo, riseOnHover: true, icon: L.divIcon({ className: "marca-mapa", iconSize: [0, 0], html }) });

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** La tarjeta que se abre al tocar una marca: foto, título y precio de cada una (hasta 6), con link a la ficha. */
function tarjetas(lista: Propiedad[], op: string | undefined, alAbrir: () => void) {
  const caja = document.createElement("div");
  caja.className = "tarjetas-mapa";
  caja.dataset.tarjetasMapa = "";
  for (const p of lista.slice(0, 6)) {
    const a = document.createElement("a");
    a.href = ir({ p: p.id });
    a.dataset.tarjetaMapa = p.id;
    a.addEventListener("click", alAbrir);
    const img = document.createElement("img");
    img.src = portada(p.id);
    img.alt = "";
    const texto = document.createElement("span");
    const titulo = document.createElement("span");
    titulo.textContent = p.titulo;
    const valor = document.createElement("b");
    valor.textContent = precio(precioEn(p, op));
    texto.append(titulo, valor);
    a.append(img, texto);
    caja.append(a);
  }
  if (lista.length > 6) {
    const mas = document.createElement("p");
    mas.textContent = `y ${lista.length - 6} más en el mismo punto`;
    caja.append(mas);
  }
  return caja;
}

// Al volver de una ficha abierta desde el mapa, el mapa queda donde estaba (no se reencuadra a todos los resultados)
const VISTA = "castro-mapa-vista";
function vistaGuardada(): { busqueda: string; centro: [number, number]; zoom: number } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(VISTA) ?? "null");
    const volviendo = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "back_forward";
    return v && volviendo && v.busqueda === location.search ? v : null;
  } catch {
    return null;
  }
}

interface Props {
  props: Propiedad[];
  op?: string;
  /** La tarjeta del listado que tiene el mouse encima: su marca se resalta */
  resaltada?: string | null;
  /** Sin propiedades (una urbanización sin publicaciones), se marca este lugar */
  lugarVacio?: { lat: number; lng: number; texto: string };
  className?: string;
  /** En pantallas táctiles el mapa embebido no se arrastra con un dedo, para no robarle el scroll a la página */
  arrastrable?: boolean;
}

export default function MapaGeneral({ props, op, resaltada, lugarVacio, className = "h-[60vh]", arrastrable }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  // El listado arma la lista en cada render: el mapa se redibuja solo si cambian las propiedades, no la referencia
  const clave = props.map((p) => p.id).join(" ");
  const actuales = useRef(props);
  actuales.current = props;
  const [vLat, vLng, vTexto] = [lugarVacio?.lat, lugarVacio?.lng, lugarVacio?.texto];
  const tactil = matchMedia("(pointer: coarse)").matches;
  const base = useMapaBase(caja, arrastrable ?? !tactil);
  const marcas = useRef(new Map<string, HTMLElement>());
  const primera = useRef(true);

  useEffect(() => {
    if (!base) return;
    const { L, mapa, datos: d } = base;
    const lugarVacio = vLat && vLng ? { lat: vLat, lng: vLng, texto: vTexto ?? "" } : undefined;
    const conPunto = actuales.current.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat && p.lng);
    const recordar = () => {
      try {
        const c = mapa.getCenter();
        sessionStorage.setItem(VISTA, JSON.stringify({ busqueda: location.search, centro: [c.lat, c.lng], zoom: mapa.getZoom() }));
      } catch {
        /* sin almacenamiento: al volver, el mapa se reencuadra */
      }
    };
    const abrir = (lista: Propiedad[], donde: Leaflet.LatLngExpression) =>
      L.popup({ closeButton: true, maxWidth: 280, minWidth: 240, autoPanPadding: [24, 24], className: "popup-mapa" }).setLatLng(donde).setContent(tarjetas(lista, op, recordar)).openOn(mapa);

    const marcasCapa = L.layerGroup().addTo(mapa);
    const lotes = L.layerGroup();
    const vacio = L.layerGroup();
    marcas.current.clear();

    // De cerca: los terrenos con su forma real (los mismos 84 que tienen la forma en su ficha)
    for (const p of conPunto) {
      const anillo = d.lotes[p.id];
      if (anillo) L.polygon(aLatLng(anillo), { ...ESTILO_LOTE, className: "lote" }).on("click", () => abrir([p], [p.lat, p.lng])).addTo(lotes);
    }
    if (!conPunto.length && lugarVacio) L.circle([lugarVacio.lat, lugarVacio.lng], { ...ESTILO_ZONA, radius: 250, interactive: false }).bindTooltip(lugarVacio.texto, { permanent: true, direction: "center", className: "zona-tooltip" }).addTo(vacio).addTo(mapa);

    // Las marcas que en pantalla caen a menos de JUNTAR px se juntan en una burbuja con la cantidad (y la zona, si
    // son todas de la misma). Sola, cada propiedad es una pastilla con su precio. Se rearma en cada zoom.
    const JUNTAR = 52;
    const dibujar = () => {
      marcasCapa.clearLayers();
      marcas.current.clear();
      const grupos: { px: Leaflet.Point; lista: Propiedad[] }[] = [];
      for (const p of conPunto) {
        const px = mapa.project([p.lat, p.lng]);
        const g = grupos.find((x) => x.px.distanceTo(px) < JUNTAR);
        if (g) g.lista.push(p);
        else grupos.push({ px, lista: [p] });
      }
      for (const { lista } of grupos) {
        const p = lista[0];
        const ids = lista.map((x) => x.id).join(" ");
        if (lista.length === 1) {
          const html = `<button type="button" class="pildora" data-cantidad="1" data-pin-prop="${p.id}">${escapar(precioCorto(p, op))}</button>`;
          const m = marca(L, [p.lat, p.lng], html, p.titulo).on("click", () => abrir(lista, [p.lat, p.lng])).addTo(marcasCapa);
          const el = m.getElement()?.querySelector<HTMLElement>(".pildora");
          if (el) marcas.current.set(p.id, el);
          continue;
        }
        const limites = L.latLngBounds(lista.map((x) => [x.lat, x.lng]));
        const mismoPunto = lista.every((x) => x.lat === p.lat && x.lng === p.lng);
        const zonasDelGrupo = new Set(lista.map((x) => x.zona || x.localidad));
        const nombre = zonasDelGrupo.size === 1 ? [...zonasDelGrupo][0] : "";
        const etiqueta = mismoPunto ? `${lista.length} propiedades` : nombre ? `${escapar(nombre)} <b>${lista.length}</b>` : `${lista.length}`;
        const html = `<button type="button" class="burbuja" data-cantidad="${lista.length}" data-pin-prop="${ids}">${etiqueta}</button>`;
        const centro = limites.getCenter();
        const m = marca(L, centro, html, `${lista.length} propiedades`)
          // Si están todas en el mismo punto no hay zoom que las separe: se abre la lista
          .on("click", () => (mismoPunto || mapa.getZoom() >= ZOOM_MAXIMO ? abrir(lista, centro) : mapa.fitBounds(limites, { padding: [60, 60], maxZoom: ZOOM_MAXIMO })))
          .addTo(marcasCapa);
        const el = m.getElement()?.querySelector<HTMLElement>(".burbuja");
        if (el) for (const x of lista) marcas.current.set(x.id, el);
      }
      const z = mapa.getZoom();
      if (z >= ZOOM_LOTES && !mapa.hasLayer(lotes)) lotes.addTo(mapa);
      if (z < ZOOM_LOTES && mapa.hasLayer(lotes)) lotes.remove();
      caja.current?.setAttribute("data-zoom", String(z));
      caja.current?.setAttribute("data-marcas", String(grupos.length));
    };
    const segunZoom = dibujar;
    mapa.on("zoomend", segunZoom);

    // Al cambiar los filtros se encuadra lo que quedó, sin dejar que dos o tres propiedades lejanas alejen todo el
    // mapa (se encuadra del 5% al 95% de los puntos); al volver de una ficha, donde estaba
    const vista = primera.current ? vistaGuardada() : null;
    primera.current = false;
    if (vista) mapa.setView(vista.centro, vista.zoom, { animate: false });
    else if (conPunto.length) {
      const corte = (v: number[]) => {
        const s = [...v].sort((a, b) => a - b);
        const k = s.length >= 20 ? Math.floor(s.length * 0.05) : 0;
        return [s[k], s[s.length - 1 - k]];
      };
      const [la1, la2] = corte(conPunto.map((p) => p.lat));
      const [ln1, ln2] = corte(conPunto.map((p) => p.lng));
      mapa.fitBounds([[la1, ln1], [la2, ln2]], { padding: [40, 40], maxZoom: 15, animate: false });
    } else if (lugarVacio) mapa.setView([lugarVacio.lat, lugarVacio.lng], 15, { animate: false });
    dibujar();
    caja.current?.setAttribute("data-total", String(conPunto.length));

    return () => {
      mapa.off("zoomend", segunZoom);
      mapa.closePopup();
      for (const capa of [marcasCapa, lotes, vacio]) capa.remove();
    };
  }, [base, clave, op, vLat, vLng, vTexto]);

  useEffect(() => {
    for (const [id, el] of marcas.current) el.classList.toggle("activa", id === resaltada);
    marcas.current.get(resaltada ?? "")?.closest(".leaflet-marker-icon")?.classList.add("arriba");
    return () => {
      marcas.current.get(resaltada ?? "")?.closest(".leaflet-marker-icon")?.classList.remove("arriba");
    };
  }, [resaltada, base, clave]);

  return (
    <div className={`relative isolate overflow-hidden rounded-3xl bg-hondo ${className}`}>
      <div ref={caja} className="absolute inset-0" data-mapa-general data-libre role="region" aria-label="Mapa de las propiedades" />
    </div>
  );
}

/** Las urbanizaciones sobre la foto satelital, cada una con su logo y cuántas propiedades tiene publicadas.
 *  Reemplaza al mapa dibujado de su sitio. Dos que publican el mismo punto se separan un poco para tocar las dos. */
export function MapaUrbanizaciones({ cantidades, className = "h-[64vh]" }: { cantidades: Record<string, number>; className?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const tactil = matchMedia("(pointer: coarse)").matches;
  const base = useMapaBase(caja, !tactil);

  useEffect(() => {
    if (!base) return;
    const { L, mapa } = base;
    const capa = L.layerGroup().addTo(mapa);
    const vistos = new Map<string, number>();
    const con = URBANIZACIONES.filter((u) => Number.isFinite(Number(u.lat)) && Number(u.lat));
    for (const u of con) {
      const clave = `${u.lat},${u.lng}`;
      const repetido = vistos.get(clave) ?? 0;
      vistos.set(clave, repetido + 1);
      const n = cantidades[u.id] ?? 0;
      const logo = u.fotos[0] ? `<img src="${escapar(u.fotos[0])}" alt="" loading="lazy">` : "";
      // El segundo que cae en el mismo punto se corre 46 px a la derecha
      const html = `<a href="${ir({ u: u.id })}" class="logo-urbanizacion" data-pin="${u.id}" style="--corrido:${repetido * 46}px">${logo}<span>${escapar(nombreLindo(u.nombre))}${n ? ` · ${n}` : ""}</span></a>`;
      marca(L, [Number(u.lat), Number(u.lng)], html, nombreLindo(u.nombre)).addTo(capa);
    }
    mapa.fitBounds(L.latLngBounds(con.map((u) => [Number(u.lat), Number(u.lng)])), { padding: [50, 50], maxZoom: 15, animate: false });
    return () => {
      capa.remove();
    };
  }, [base, cantidades]);

  return (
    <div className={`relative isolate overflow-hidden rounded-3xl bg-hondo ${className}`}>
      <div ref={caja} className="absolute inset-0" data-mapa-urbanizaciones data-libre role="region" aria-label="Mapa de las urbanizaciones" />
    </div>
  );
}
