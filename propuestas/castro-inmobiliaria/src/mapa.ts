// El mapa de Leaflet con la foto satelital calzada al catastro, portado de MojonApp (js/calce-aplicar.js y
// js/calce-imagen.js del commit 69a159f, con el arreglo de b71b306). Lo usa la ficha y lo va a usar el mapa general.
//
// LO QUE ESTÁ MAL ES LA FOTO, NO EL CATASTRO: el mosaico de Esri está corrido hasta 25 m según la zona. Por eso la
// foto va sola en un pane propio y se corre ese pane; el lote, las parcelas y las calles nunca se mueven.
// Leaflet se baja recién cuando el mapa está por entrar en pantalla (cargarLeaflet), no en el paquete principal.
import type * as Leaflet from "leaflet";

type L = typeof Leaflet;

/** Lo que trae cada ficha para su mapa (lo arma scripts/castro_satelite.py; ver el contrato de datos). */
export interface MapaDatos {
  /** Corrimiento de la foto en esa celda (este, norte) en metros; null = celda sin calzar */
  calce: [number, number] | null;
  celda: string;
  /** Zoom máximo con foto real de Esri en ese lugar */
  zmax: number;
  /** Anillo exterior del lote [lng, lat] (solo los terrenos con forma confirmada) */
  lote: [number, number][] | null;
  lados: { lat: number; lng: number; ang: number; afuera: [number, number]; texto: string }[] | null;
  /** Sin lote: cuántas OTRAS propiedades publican el mismo punto (radio quedó de cuando era un círculo) */
  zona: { radio?: number; compartido: number } | null;
  alrededor: [number, number][][];
}

let leaflet: Promise<L> | null = null;
export function cargarLeaflet() {
  leaflet ??= Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([m]) => ((m as { default?: L }).default ?? m) as L);
  return leaflet;
}

export const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
export const FOTO = `${ESRI}World_Imagery/MapServer/tile/{z}/{y}/{x}`;
export const ATRIBUCION_FOTO = "Foto: Esri, Maxar, Earthstar Geographics";
const ATRIBUCION_CALLES = "Calles: Esri, HERE, Garmin, © OpenStreetMap";
export const PANE_FOTO = "foto";

// 0,02° (unos 2 km): el mismo tamaño de celda que MojonApp y que CALCES en scripts/castro_satelite.py
export const celdaDe = (lat: number, lng: number) => `c${Math.floor(lat / 0.02)}_${Math.floor(lng / 0.02)}`;

/** Metros por píxel en Web Mercator (256 px por tile). */
export const metrosPorPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

/** El calce está en metros y lo que se mueve son píxeles: hay que recalcularlo en cada zoom. Y crece hacia el sur. */
export function corrimientoEnPixeles([este, norte]: [number, number], lat: number, zoom: number) {
  const mpp = metrosPorPixel(lat, zoom);
  return { x: Math.round(este / mpp), y: Math.round(-norte / mpp) };
}

/** La capa de la foto con un tile de más por lado: al correr el pane no queda una franja gris en el borde. */
function capaConMargen(L: L, url: string, opciones: Leaflet.TileLayerOptions): Leaflet.TileLayer {
  const base = L.TileLayer.prototype as unknown as { _getTiledPixelBounds(c: Leaflet.Point): Leaflet.Bounds };
  const ConMargen = L.TileLayer.extend({
    _getTiledPixelBounds(centro: Leaflet.Point) {
      const b = base._getTiledPixelBounds.call(this, centro);
      return L.bounds(b.min!.subtract([256, 256]), b.max!.add([256, 256]));
    },
  });
  return new (ConMargen as unknown as new (u: string, o: Leaflet.TileLayerOptions) => Leaflet.TileLayer)(url, opciones);
}

export type Fondo = "satelital" | "calles";

/** El mapa con la foto en su pane, los nombres de las calles encima (fuera del pane: no se corren), el plano de
 *  calles como alternativa, la escala y los controles en castellano. scrollWheelZoom apagado salvo que se pida. */
export function crearMapa(L: L, el: HTMLElement, { zmax, ...opciones }: Leaflet.MapOptions & { zmax: number }) {
  const mapa = L.map(el, { maxZoom: 20, zoomControl: false, attributionControl: false, scrollWheelZoom: false, ...opciones });
  mapa.createPane(PANE_FOTO).style.zIndex = "199";
  const foto = capaConMargen(L, FOTO, { pane: PANE_FOTO, maxNativeZoom: zmax, maxZoom: 20, attribution: ATRIBUCION_FOTO });
  // Con todo el pueblo a la vista los nombres de cada calle son un empapelado: recién desde el zoom 16 (MojonApp)
  const nombres = L.tileLayer(`${ESRI}Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { minZoom: 16, maxNativeZoom: 19, maxZoom: 20, opacity: 0.75, attribution: ATRIBUCION_CALLES });
  const plano = L.tileLayer(`${ESRI}World_Street_Map/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 19, maxZoom: 20, attribution: ATRIBUCION_CALLES });
  // Abajo a la izquierda la atribución, de lado a lado, y la escala encima; el zoom arriba a la derecha
  L.control.attribution({ position: "bottomleft", prefix: false }).addTo(mapa);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(mapa);
  L.control.zoom({ position: "topright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(mapa);
  // Leaflet le pone "Close popup" a la X de cada popup
  mapa.on("popupopen", (e) => e.popup.getElement()?.querySelector(".leaflet-popup-close-button")?.setAttribute("aria-label", "Cerrar"));
  const fondo = (f: Fondo) => {
    for (const capa of f === "satelital" ? [plano] : [foto, nombres]) capa.remove();
    for (const capa of f === "satelital" ? [foto, nombres] : [plano]) capa.addTo(mapa);
  };
  fondo("satelital");
  return { mapa, foto, fondo };
}

/** Deja la foto calzada y la mantiene así en cada zoom y movimiento. calceDe dice el calce que corresponde (en la
 *  ficha, el de su celda; en el mapa general, el de la celda del centro). ?calce=0 lo apaga, para compararlo.
 *  Se engancha DESPUÉS de fijar centro y zoom (b71b306): antes, Leaflet tira "Set map center and zoom first" y el
 *  calce no se aplica nunca. El corrimiento aplicado en píxeles (data-calce) y el zoom y el centro con que se calculó (data-vista) quedan en
 *  el pane, para los chequeos. */
export function seguirElCalce(mapa: Leaflet.Map, calceDe: () => [number, number] | null) {
  const apagado = new URLSearchParams(location.search).get("calce") === "0";
  const mover = () => {
    const pane = mapa.getPane(PANE_FOTO);
    if (!pane) return;
    const calce = apagado ? null : calceDe();
    const { lat, lng } = mapa.getCenter();
    const zoom = mapa.getZoom();
    const { x, y } = calce ? corrimientoEnPixeles(calce, lat, zoom) : { x: 0, y: 0 };
    pane.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : "";
    pane.dataset.calce = `${x},${y}`;
    pane.dataset.vista = `${zoom},${lat},${lng}`;
  };
  mapa.on("zoomend moveend", mover);
  mover();
}

// La firma de MojonApp: el lote con borde blanco y relleno de color; alrededor, el "catastro cercano" punteado
export const ESTILO_LOTE: Leaflet.PathOptions = { className: "lote", color: "#ffffff", weight: 2, fillColor: "#FF8000", fillOpacity: 0.45 };
export const ESTILO_VECINA: Leaflet.PathOptions = { className: "vecina", color: "#f9a825", weight: 1.5, dashArray: "4 3", fillOpacity: 0.05, interactive: false };
export const ESTILO_ZONA: Leaflet.PathOptions = { className: "zona", color: "#ffffff", weight: 2, dashArray: "6 5", fillColor: "#FF8000", fillOpacity: 0.25 };

/** [lng, lat] del GeoJSON a [lat, lng] de Leaflet */
export const aLatLng = (anillo: [number, number][]) => anillo.map(([lng, lat]) => [lat, lng] as [number, number]);

/** Centro simple del anillo [lng, lat] (promedio de vértices, sin el que lo cierra), en [lat, lng]: alcanza para lotes chicos. */
export function centroDe(anillo: [number, number][]): [number, number] {
  const [a, z] = [anillo[0], anillo[anillo.length - 1]];
  const pts = a[0] === z[0] && a[1] === z[1] ? anillo.slice(0, -1) : anillo;
  return [pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[0], 0) / pts.length];
}
