// "Ver en 3D": la zona inclinada con las sierras de fondo y la propiedad marcada. MapLibre (unos cuantos cientos de
// KB) y el relieve se bajan recién al tocar el botón; con el ahorro de datos prendido, se pregunta antes.
// Sirve para ver el entorno, no para medir: por eso no lleva medidas ni números de parcela.
import type * as MapLibre from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { FOTO } from "./mapa";

type ML = typeof MapLibre;

function hayWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Un círculo de radio en metros como anillo [lng, lat], para marcar la zona cuando no hay lote. */
function circulo([lat, lng]: [number, number], radio: number) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [lng + (Math.cos(a) * radio) / kx, lat + (Math.sin(a) * radio) / 110540];
  });
}

const TEXTOS = {
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "NavigationControl.ResetBearing": "Volver al norte (arrastrá para girar)",
  "AttributionControl.ToggleAttribution": "Ver los créditos",
  "AttributionControl.MapFeedback": "Comentarios sobre el mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Usá dos dedos para mover el mapa",
  "CooperativeGesturesHandler.WindowsHelpText": "Usá Ctrl + la rueda para acercar",
  "CooperativeGesturesHandler.MacHelpText": "Usá ⌘ + la rueda para acercar",
  "Map.Title": "Mapa en 3D",
  "Marker.Title": "La propiedad",
  "ScaleControl.Meters": "m",
  "ScaleControl.Kilometers": "km",
};

type Props = { centro: [number, number]; lote: [number, number][] | null; radio: number; zmax: number; etiqueta: string; alCerrar: () => void };

export default function Mapa3D({ centro, lote, radio, zmax, etiqueta, alCerrar }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const [sinWebGL] = useState(() => !hayWebGL());
  const [seguir, setSeguir] = useState(() => !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [lat, lng] = centro;

  useEffect(() => {
    const el = caja.current;
    if (sinWebGL || !seguir || !el) return;
    let vivo = true;
    let mapa: MapLibre.Map | undefined;
    Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css")]).then(
      ([modulo]) => {
        if (!vivo) return;
        const ml = ((modulo as unknown as { default?: ML }).default ?? modulo) as ML;
        const anillo = lote ?? circulo([lat, lng], radio);
        // Solo se piden tiles de unos 30 km alrededor: el relieve de Terrarium existe hasta el zoom 14 y da 403 más allá
        const cerca: [number, number, number, number] = [lng - 0.3, lat - 0.3, lng + 0.3, lat + 0.3];
        mapa = new ml.Map({
          container: el,
          // Mirando al este, donde están las sierras de los Comechingones; el centro va unos 400 m adelante de la
          // propiedad para que ella quede un poco abajo (más, y en el celular se esconde detrás de los créditos)
          center: [lng + 0.004, lat],
          zoom: 14.4,
          pitch: 76,
          bearing: 90,
          maxPitch: 80,
          minZoom: 12,
          // ponytail: el 3D no aplica el calce de la foto (los calces son de 5 m o menos, 1 a 5 px hasta el zoom 17);
          // si hace falta acercarse más, un protocolo propio que corra los tiles
          maxZoom: 17,
          locale: TEXTOS,
          cooperativeGestures: matchMedia("(pointer: coarse)").matches,
          attributionControl: { compact: true },
          style: {
            version: 8,
            sources: {
              foto: { type: "raster", tiles: [FOTO], tileSize: 256, maxzoom: zmax, bounds: cerca, attribution: "Esri, Maxar, Earthstar Geographics" },
              relieve: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14, bounds: cerca, attribution: "Relieve: SRTM" },
              lugar: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [anillo] } } },
            },
            layers: [
              { id: "fondo", type: "background", paint: { "background-color": "#c9d6e3" } },
              { id: "foto", type: "raster", source: "foto" },
              { id: "lugar", type: "fill", source: "lugar", paint: { "fill-color": "#FF8000", "fill-opacity": 0.45 } },
              { id: "borde", type: "line", source: "lugar", paint: { "line-color": "#ffffff", "line-width": 2 } },
            ],
            terrain: { source: "relieve", exaggeration: 1.3 },
          },
        });
        // Sin esto MapLibre escribe en la consola cada tile que no llega
        mapa.on("error", () => {});
        mapa.addControl(new ml.NavigationControl({ visualizePitch: true }), "bottom-right");
        // A esta distancia el lote son pocos píxeles: lo marca un cartel con un palito que baja hasta el lugar
        const cartel = document.createElement("div");
        cartel.className = "flex flex-col items-center";
        cartel.innerHTML = '<span class="rounded-full bg-naranja-osc px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-white shadow"></span><span class="h-4 w-0.5 bg-white"></span><span class="h-2.5 w-2.5 rounded-full border-2 border-white bg-naranja-osc"></span>';
        cartel.firstElementChild!.textContent = etiqueta;
        new ml.Marker({ element: cartel, anchor: "bottom", offset: [0, 4] }).setLngLat([lng, lat]).addTo(mapa);
        mapa.once("idle", () => vivo && setCargando(false));
      },
      () => vivo && setFallo(true),
    );
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [sinWebGL, seguir, lat, lng, lote, radio, zmax, etiqueta]);

  const earth = `https://earth.google.com/web/@${lat.toFixed(6)},${lng.toFixed(6)},900a,1500d,35y,0h,60t,0r`;
  const aviso = (texto: string, botones: React.ReactNode) => (
    <div className="absolute inset-0 grid place-items-center bg-hondo p-6 text-center">
      <div className="max-w-sm">
        <p className="text-[15px]">{texto}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">{botones}</div>
      </div>
    </div>
  );
  const linkEarth = (
    <a href={earth} target="_blank" rel="noopener" data-google-earth className="rounded-full bg-naranja-osc px-4 py-2 font-semibold text-white">
      Abrir el lugar en Google Earth
    </a>
  );

  return (
    <div className="absolute inset-0 z-20 bg-hondo" data-mapa-3d>
      {/* h-full y no absolute: el CSS de MapLibre le pone position: relative al contenedor */}
      <div ref={caja} className="h-full w-full" />
      {sinWebGL || fallo
        ? aviso(sinWebGL ? "Este teléfono o navegador no puede mostrar el mapa en 3D." : "No se pudo cargar el mapa en 3D.", linkEarth)
        : !seguir
          ? aviso("Tenés prendido el ahorro de datos. El 3D usa unos 3 MB.", (
              <button onClick={() => setSeguir(true)} className="rounded-full bg-naranja-osc px-4 py-2 font-semibold text-white">
                Verlo igual
              </button>
            ))
          : cargando && <p className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-white/95 px-4 py-2 text-[14px] font-semibold shadow">Cargando el 3D…</p>}
      <button onClick={alCerrar} className="absolute top-3 left-3 z-10 rounded-full bg-white/95 px-4 py-2 text-[14px] font-semibold shadow" data-cerrar-3d>
        ← Volver al mapa
      </button>
    </div>
  );
}
