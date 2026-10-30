// El mapa de todas las propiedades, con la misma foto calzada que la ficha (src/mapa.ts). Lo que se ve depende de
// qué tan cerca se mira: de lejos una burbuja por zona con su cantidad, más cerca el precio de cada una, y de cerca
// los terrenos con su forma real. Tocar una marca abre su tarjeta; la tarjeta lleva a la ficha.
// Lo usan el listado (con sus filtros), la portada y la página de cada urbanización. El mapa de urbanizaciones
// (Desde el 30/10 solo lo usa la página de cada urbanización: la portada y el listado no llevan mapa.)
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ir } from "./componentes";
import { portada, precio, precioEn, type Propiedad } from "./datos";
import { aLatLng, cargarLeaflet, celdaDe, crearMapa, ESTILO_LOTE, ESTILO_ZONA, seguirElCalce } from "./mapa";

type L = typeof Leaflet;
type Datos = { calces: Record<string, [number, number]>; lotes: Record<string, [number, number][]> };
type Base = { L: L; mapa: Leaflet.Map; datos: Datos };

// Sin mapa.json (no llegó o no se pudo leer) el mapa se dibuja igual: las marcas vienen en el paquete; faltan el calce
// y las formas de los lotes
const VACIO: Datos = { calces: {}, lotes: {} };
let datos: Promise<Datos> | null = null;
const pedirDatos = () => (datos ??= fetch("./mapa.json").then((r) => (r.ok ? r.json() : VACIO)).catch(() => VACIO));

const MERLO: [number, number] = [-32.3427, -65.0137];
// Más cerca que 17 el calce de la celda del centro deja de alcanzar para las celdas vecinas (difieren hasta 6 m):
// el detalle de cada lote está en su ficha
const ZOOM_MAXIMO = 17;
const ZOOM_LOTES = 15;

/** La base que comparten los mapas: Leaflet y mapa.json se bajan recién cuando el mapa está por verse. Si Leaflet no
 *  baja (mala señal, o una pestaña abierta antes de publicar otra versión) queda error, para avisarlo. */
function useMapaBase(caja: RefObject<HTMLDivElement | null>, arrastrable: boolean, rueda = false) {
  const [base, setBase] = useState<Base | null>(null);
  const [error, setError] = useState(false);
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
          const r = crearMapa(L, el, { zmax: 18, maxZoom: ZOOM_MAXIMO, minZoom: 9, dragging: arrastrable, touchZoom: true, scrollWheelZoom: rueda });
          mapa = r.mapa;
          // Leaflet trae fijo "Close popup" en la X de las tarjetas
          mapa.on("popupopen", (e) => e.popup.getElement()?.querySelector(".leaflet-popup-close-button")?.setAttribute("aria-label", "Cerrar"));
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
        }).catch(() => vivo && setError(true));
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
  }, [caja, arrastrable, rueda]);
  return { base, error };
}

/** Lo que queda en lugar del mapa si Leaflet no bajó. Reintentar en la misma página no sirve (Chrome recuerda el
 *  import fallido): hay que recargar. Arriba y no en el medio: del mapa del listado, al entrar, se ve solo la parte
 *  de arriba. */
const SinMapa = () => (
  <div className="absolute inset-0 grid content-start justify-items-center gap-3 px-6 pt-16 text-center text-[15px] text-suave" data-sin-mapa>
    <p>No se pudo cargar el mapa.</p>
    <button type="button" onClick={() => location.reload()} className="rounded-full bg-tinta px-5 py-2.5 font-semibold text-white">
      Recargar
    </button>
  </div>
);

/** "USD 120 mil", "USD 1,2 M", "$ 600 mil": lo que entra en una pastilla del mapa. */
function precioCorto(p: Propiedad, op?: string) {
  const { precio: n, moneda } = precioEn(p, op);
  if (!n) return "Consultar";
  const signo = moneda === "USD" ? "USD" : "$";
  if (n >= 1_000_000) return `${signo} ${String(Math.round(n / 100_000) / 10).replace(".", ",")} M`;
  if (n >= 1000) return `${signo} ${Math.round(n / 1000)} mil`;
  return `${signo} ${n}`;
}

/** Ancho en pantalla de una marca con ese texto: el texto medido con la misma letra (600 13px de --font-sans) más el
 *  relleno, 26 px en una burbuja y 20 en una pastilla. Mientras la letra no bajó, 7,5 px por letra: lo más ancho que se
 *  midió es "USD 800", y mejor que sobre a que falte, porque si falta se pisan. */
let lienzo: CanvasRenderingContext2D | null = null;
function anchoDe(texto: string, relleno: number) {
  lienzo ??= document.createElement("canvas").getContext("2d");
  if (!lienzo || !document.fonts.check("600 13px Figtree")) return relleno + texto.length * 7.5;
  lienzo.font = `600 13px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans")}`;
  return relleno + lienzo.measureText(texto).width;
}

/** En el primer encuadre, una marca a medias en el borde se ve rota. Se corre el mapa sin cambiar el zoom (así no se
 *  rearman las marcas) lo menos posible para que ninguna quede a medias: que entre entera o que salga del todo, sin
 *  sacar a ninguna de las que se ven enteras. Si no hay cómo, queda como está. Se mide lo dibujado (con el número que
 *  asoma de un logo), no un ancho estimado. */
function sinCortadas(mapa: Leaflet.Map, caja: HTMLElement) {
  const m = caja.getBoundingClientRect();
  const cajas = [...caja.querySelectorAll(".marca-mapa > *")].map((e) => {
    const rs = [e, ...e.querySelectorAll("*")].map((x) => x.getBoundingClientRect()).filter((r) => r.width);
    return {
      x: [Math.min(...rs.map((r) => r.left)) - m.left, Math.max(...rs.map((r) => r.right)) - m.left],
      y: [Math.min(...rs.map((r) => r.top)) - m.top, Math.max(...rs.map((r) => r.bottom)) - m.top],
    };
  });
  // En un eje. A medias: cruza un borde o queda a menos de `g` px de él por dentro. Las candidatas son los
  // corrimientos que dejan a alguna justo afuera (a 1 px) o justo adentro (a 6 px), y se elige la más cerca de 0
  const correr = (v: number[][], largo: number) => {
    const aMedias = (s: number, g: number) => v.some(([lo, hi]) => (lo + s < g && hi + s > 0) || (lo + s < largo && hi + s > largo - g));
    if (!aMedias(0, 0)) return 0;
    const enteras = v.filter(([lo, hi]) => lo >= 0 && hi <= largo);
    const [a, b] = [Math.max(-Infinity, ...enteras.map(([lo]) => -lo)), Math.min(Infinity, ...enteras.map(([, hi]) => largo - hi))];
    const vale = (s: number) => s >= a && s <= b && !aMedias(s, 5);
    return v.flatMap(([lo, hi]) => [-hi - 1, 6 - lo, largo - 6 - hi, largo - lo + 1]).filter(vale).sort((x, y) => Math.abs(x) - Math.abs(y))[0] ?? 0;
  };
  const sx = correr(cajas.filter((c) => c.y[1] > 0 && c.y[0] < m.height).map((c) => c.x), m.width);
  const sy = correr(cajas.filter((c) => c.x[1] + sx > 0 && c.x[0] + sx < m.width).map((c) => c.y), m.height);
  if (sx || sy) mapa.panBy([-sx, -sy], { animate: false });
}

const marca = (L: L, latlng: Leaflet.LatLngExpression, html: string, titulo: string) =>
  L.marker(latlng, { keyboard: false, title: titulo, riseOnHover: true, icon: L.divIcon({ className: "marca-mapa", iconSize: [0, 0], html }) });

/** Acerca a esos puntos; si el encuadre no acercaría (pasa con el mapa angosto del celular), acerca dos niveles ahí. */
function acercar(mapa: Leaflet.Map, limites: Leaflet.LatLngBounds, padding: number) {
  const z = mapa.getZoom();
  const destino = Math.min(mapa.getBoundsZoom(limites, false, [padding * 2, padding * 2] as unknown as Leaflet.Point), ZOOM_MAXIMO);
  if (destino > z) mapa.fitBounds(limites, { padding: [padding, padding], maxZoom: ZOOM_MAXIMO });
  else mapa.setView(limites.getCenter(), Math.min(z + 2, ZOOM_MAXIMO));
}

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
  /** El mapa pegado al costado del listado en la compu: acerca con la rueda del mouse y, como al entrar solo se ve su
   *  parte de arriba (el resto queda abajo de la pantalla hasta que se pega), encuadra en esa parte */
  costado?: boolean;
}

export default function MapaGeneral({ props, op, resaltada, lugarVacio, className = "h-[60vh]", arrastrable, costado = false }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  // El listado arma la lista en cada render: el mapa se redibuja solo si cambian las propiedades, no la referencia
  const clave = props.map((p) => p.id).join(" ");
  const actuales = useRef(props);
  actuales.current = props;
  const [vLat, vLng, vTexto] = [lugarVacio?.lat, lugarVacio?.lng, lugarVacio?.texto];
  const tactil = matchMedia("(pointer: coarse)").matches;
  const { base, error } = useMapaBase(caja, arrastrable ?? !tactil, costado);
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
    const vacio = L.layerGroup().addTo(mapa);
    marcas.current.clear();

    // De cerca: los terrenos con su forma real (los mismos 84 que tienen la forma en su ficha)
    for (const p of conPunto) {
      const anillo = d.lotes[p.id];
      if (anillo) L.polygon(aLatLng(anillo), { ...ESTILO_LOTE, className: "lote" }).on("click", () => abrir([p], [p.lat, p.lng])).addTo(lotes);
    }
    if (!conPunto.length && lugarVacio) L.circle([lugarVacio.lat, lugarVacio.lng], { ...ESTILO_ZONA, radius: 250, interactive: false }).bindTooltip(lugarVacio.texto, { permanent: true, direction: "center", className: "zona-tooltip" }).addTo(vacio);

    // Sola, cada propiedad es una pastilla con su precio. Las que se pisarían en pantalla (por el ancho de su texto, no
    // solo por la distancia entre los puntos) se juntan en una burbuja con la cantidad, en el medio del grupo, y con la
    // zona si son todas de la misma. Se rearma en cada zoom.
    // Si todo el mapa es de una sola zona (la página de una urbanización, el listado filtrado por zona), el nombre en
    // cada burbuja no diría nada y solo la haría más ancha
    const unaZona = new Set(conPunto.map((x) => x.zona || x.localidad)).size === 1;
    type Grupo = { lista: Propiedad[]; limites: Leaflet.LatLngBounds; centro: Leaflet.LatLng; px: Leaflet.Point; w: number; zona: string; mismoPunto: boolean };
    const etiqueta = ({ lista, zona, mismoPunto }: Pick<Grupo, "lista" | "zona" | "mismoPunto">) =>
      mismoPunto ? `${lista.length} propiedades` : zona && !unaZona ? `${escapar(zona)} <b>${lista.length}</b>` : `${lista.length}`;
    const armar = (lista: Propiedad[]): Grupo => {
      const limites = L.latLngBounds(lista.map((x) => [x.lat, x.lng]));
      // En el promedio de los puntos y no en el medio del recuadro: sumar una lejana casi no corre una burbuja grande
      const centro = L.latLng(lista.reduce((t, x) => t + x.lat, 0) / lista.length, lista.reduce((t, x) => t + x.lng, 0) / lista.length);
      const mismoPunto = lista.every((x) => x.lat === lista[0].lat && x.lng === lista[0].lng);
      const zonas = new Set(lista.map((x) => x.zona || x.localidad));
      const zona = zonas.size === 1 ? [...zonas][0] : "";
      const texto = lista.length === 1 ? "" : etiqueta({ lista, zona, mismoPunto });
      const w = lista.length === 1 ? anchoDe(precioCorto(lista[0], op), 20) : anchoDe(texto.replace(/<[^>]+>/g, ""), texto.includes("<b>") ? 30 : 26);
      return { lista, limites, centro, px: mapa.project(centro), w, zona, mismoPunto };
    };
    // Dos marcas se pisan si sus cajas se tocan (una pastilla mide 27 px de alto y una burbuja 31)
    const alto = (g: Grupo) => (g.lista.length === 1 ? 27 : 31);
    const sePisan = (a: Grupo, b: Grupo) => Math.abs(a.px.x - b.px.x) < (a.w + b.w) / 2 && Math.abs(a.px.y - b.px.y) < (alto(a) + alto(b)) / 2;
    const dibujar = () => {
      marcasCapa.clearLayers();
      marcas.current.clear();
      const grupos: Grupo[] = [];
      for (const p of conPunto) {
        // Al juntarse, la burbuja cambia de ancho y se corre al medio: se vuelve a probar contra las demás
        let g = armar([p]);
        for (let i = grupos.findIndex((x) => sePisan(x, g)); i >= 0; i = grupos.findIndex((x) => sePisan(x, g))) g = armar([...grupos.splice(i, 1)[0].lista, ...g.lista]);
        grupos.push(g);
      }
      const z = mapa.getZoom();
      for (const g of grupos) {
        const { lista, limites, centro, zona, mismoPunto } = g;
        const p = lista[0];
        if (lista.length === 1) {
          const valor = precioCorto(p, op);
          const html = `<button type="button" class="pildora" data-cantidad="1" data-pin-prop="${p.id}" aria-label="${escapar(`${p.titulo}, ${valor}`)}">${escapar(valor)}</button>`;
          const m = marca(L, centro, html, p.titulo).on("click", () => abrir(lista, centro)).addTo(marcasCapa);
          const el = m.getElement()?.querySelector<HTMLElement>(".pildora");
          if (el) marcas.current.set(p.id, el);
          continue;
        }
        // Si están todas en el mismo punto (o ya no se puede acercar más) no hay zoom que las separe: se abre la lista
        const abreLista = mismoPunto || z >= ZOOM_MAXIMO;
        const nombre = `${lista.length} propiedades${zona ? ` en ${zona}` : ""}, ${abreLista ? "ver la lista" : "acercar"}`;
        const ids = lista.map((x) => x.id).join(" ");
        const html = `<button type="button" class="burbuja" data-cantidad="${lista.length}" data-pin-prop="${ids}" aria-label="${escapar(nombre)}">${etiqueta(g)}</button>`;
        const m = marca(L, centro, html, `${lista.length} propiedades`)
          .on("click", () => (abreLista ? abrir(lista, centro) : acercar(mapa, limites, 60)))
          .addTo(marcasCapa);
        const el = m.getElement()?.querySelector<HTMLElement>(".burbuja");
        if (el) for (const x of lista) marcas.current.set(x.id, el);
      }
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
      // Con margen para que las marcas del borde no queden cortadas (una pastilla mide unos 90 px de ancho)
      const r = caja.current?.getBoundingClientRect();
      const oculto = costado && r ? Math.max(0, Math.min(r.bottom - innerHeight, r.height - 240)) : 0;
      mapa.fitBounds([[la1, ln1], [la2, ln2]], { paddingTopLeft: [56, 40], paddingBottomRight: [56, 40 + oculto], maxZoom: 15, animate: false });
    } else if (lugarVacio) mapa.setView([lugarVacio.lat, lugarVacio.lng], 15, { animate: false });
    dibujar();
    // El margen no alcanza para las que el recorte del 5% deja justo afuera del encuadre
    if (!vista && caja.current) sinCortadas(mapa, caja.current);
    caja.current?.setAttribute("data-total", String(conPunto.length));

    return () => {
      mapa.off("zoomend", segunZoom);
      mapa.closePopup();
      for (const capa of [marcasCapa, lotes, vacio]) capa.remove();
    };
  }, [base, clave, op, vLat, vLng, vTexto, costado]);

  useEffect(() => {
    // Una burbuja junta varias propiedades: se prende la marca de la resaltada y se apagan todas las demás
    const activa = marcas.current.get(resaltada ?? "");
    for (const el of new Set(marcas.current.values())) el.classList.toggle("activa", el === activa);
    marcas.current.get(resaltada ?? "")?.closest(".leaflet-marker-icon")?.classList.add("arriba");
    return () => {
      marcas.current.get(resaltada ?? "")?.closest(".leaflet-marker-icon")?.classList.remove("arriba");
    };
  }, [resaltada, base, clave]);

  return (
    <div className={`relative isolate overflow-hidden rounded-[3px] bg-hondo ${className}`}>
      <div ref={caja} className="absolute inset-0" data-mapa-general data-libre role="region" aria-label="Mapa de las propiedades" />
      {error && <SinMapa />}
    </div>
  );
}
