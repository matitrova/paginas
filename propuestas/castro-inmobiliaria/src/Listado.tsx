import { useLayoutEffect, useState } from "react";
import { ir, Tarjeta, useConsulta } from "./componentes";
import { contar, esTerreno, porM2, precioEn, PROPIEDADES, TIPOS, type Propiedad } from "./datos";

// Rangos fijos en vez de un deslizador: con 272 propiedades se elige rápido y se entiende de un vistazo
const PRECIOS = [
  { valor: "0-50000", texto: "Hasta USD 50.000" },
  { valor: "50000-100000", texto: "USD 50.000 a 100.000" },
  { valor: "100000-150000", texto: "USD 100.000 a 150.000" },
  { valor: "150000-250000", texto: "USD 150.000 a 250.000" },
  { valor: "250000-", texto: "Más de USD 250.000" },
];
// Los alquileres se publican casi todos en pesos
const PRECIOS_ALQUILER = [
  { valor: "0-300000", texto: "Hasta $ 300.000" },
  { valor: "300000-600000", texto: "$ 300.000 a 600.000" },
  { valor: "600000-1000000", texto: "$ 600.000 a 1.000.000" },
  { valor: "1000000-", texto: "Más de $ 1.000.000" },
];
const SUPERFICIES = [
  { valor: "0-500", texto: "Hasta 500 m²" },
  { valor: "500-1000", texto: "500 a 1.000 m²" },
  { valor: "1000-2000", texto: "1.000 a 2.000 m²" },
  { valor: "2000-10000", texto: "2.000 m² a 1 ha" },
  { valor: "10000-", texto: "Más de 1 ha" },
];
const ORDENES = [
  { valor: "", texto: "Más nuevas" },
  { valor: "menor", texto: "Menor precio" },
  { valor: "mayor", texto: "Mayor precio" },
  { valor: "m2", texto: "Menor USD/m²" },
  { valor: "superficie", texto: "Más m²" },
];

const CLAVES = ["op", "tipo", "zona", "precio", "dorm", "sup", "orden", "q"] as const;
// De a cuántas se muestran: 249 tarjetas de una son una tira interminable en el celular
const TANDA = 30;
type Filtros = Record<(typeof CLAVES)[number], string>;

const dentro = (n: number | null, rango: string) => {
  if (!rango) return true;
  if (n === null) return false;
  const [desde, hasta] = rango.split("-").map((x) => (x ? Number(x) : null));
  return n >= (desde ?? 0) && (hasta === null || n < hasta);
};

// Lo que mide: lo construido en una casa, el terreno en un lote
const metros = (p: Propiedad) => (esTerreno(p) ? p.terreno : (p.cubierta ?? p.construido ?? p.terreno));
const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Buscar por código (el que publican en Instagram, CHO…), por zona o por palabras del título. */
const buscar = (p: Propiedad, q: string) => sinTildes(`${p.codigo} ${p.id} ${p.titulo} ${p.zona} ${p.localidad}`).includes(sinTildes(q.trim()));

export function filtrar(f: Filtros): Propiedad[] {
  const op = f.op || "venta";
  const lista = PROPIEDADES.filter(
    (p) =>
      p.operacion.includes(op) &&
      (!f.tipo || p.tipo === f.tipo) &&
      (!f.zona || p.zona === f.zona) &&
      (!f.precio || (precioEn(p, op).moneda === (op === "venta" ? "USD" : "ARS") && dentro(precioEn(p, op).precio, f.precio))) &&
      (!f.q || buscar(p, f.q)) &&
      (!f.dorm || (p.dormitorios ?? 0) >= Number(f.dorm)) &&
      (!f.sup || dentro(p.terreno, f.sup)),
  );
  // Pesos y dólares no se comparan entre sí (no se inventa un tipo de cambio): primero los pesos, después los dólares
  const valor = (p: Propiedad) => precioEn(p, op);
  const moneda = (a: Propiedad, b: Propiedad) => Number(valor(a).moneda === "USD") - Number(valor(b).moneda === "USD");
  const sinDato = (n: number | null, alto: boolean) => n ?? (alto ? -Infinity : Infinity);
  if (f.orden === "menor") return lista.sort((a, b) => moneda(a, b) || sinDato(valor(a).precio, false) - sinDato(valor(b).precio, false));
  if (f.orden === "mayor") return lista.sort((a, b) => moneda(a, b) || sinDato(valor(b).precio, true) - sinDato(valor(a).precio, true));
  if (f.orden === "m2") return lista.sort((a, b) => sinDato(porM2(a, op), false) - sinDato(porM2(b, op), false));
  if (f.orden === "superficie") return lista.sort((a, b) => sinDato(metros(b), true) - sinDato(metros(a), true));
  return lista.sort((a, b) => b.alta.localeCompare(a.alta));
}

function Selector({ nombre, etiqueta, valor, opciones, alCambiar }: { nombre: string; etiqueta: string; valor: string; opciones: { valor: string; texto: string }[]; alCambiar: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12.5px] font-medium text-suave">
      {etiqueta}
      <select name={nombre} value={valor} onChange={(e) => alCambiar(e.target.value)} className="h-11 min-w-0 rounded-xl border border-linea bg-white px-3 text-[15px] text-tinta">
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}

export function filtrosDeLaDireccion(): Filtros {
  const q = new URLSearchParams(location.search);
  return Object.fromEntries(CLAVES.map((k) => [k, q.get(k) ?? ""])) as Filtros;
}

/** "terrenos en venta en Las Magdalenas, hasta USD 50.000, 500 a 1.000 m²": la búsqueda dicha en palabras. */
export function resumen(f: Filtros) {
  const op = f.op || "venta";
  const precios = op === "venta" ? PRECIOS : PRECIOS_ALQUILER;
  return [
    `${(TIPOS[f.tipo] ?? "propiedades").toLowerCase()} en ${op}`,
    f.zona && `en ${f.zona}`,
    precios.find((x) => x.valor === f.precio)?.texto.toLowerCase(),
    f.dorm && `${f.dorm} dormitorios o más`,
    SUPERFICIES.find((x) => x.valor === f.sup)?.texto,
    f.q && `que diga "${f.q}"`,
  ].filter(Boolean).join(", ");
}

// Al volver de una ficha, la tarjeta tocada queda donde estaba. No se le deja al navegador porque devuelve
// el mismo número de píxeles, y las tarjetas que no se ven tienen una altura estimada: volvía corrido o arriba de todo.
const VOLVER = "castro-volver-al-listado";

function recordarTarjeta(e: React.MouseEvent) {
  const tarjeta = (e.target as Element).closest("[data-tarjeta]");
  if (!tarjeta) return;
  try {
    sessionStorage.setItem(VOLVER, JSON.stringify({ busqueda: location.search, id: tarjeta.getAttribute("data-tarjeta"), arriba: tarjeta.getBoundingClientRect().top }));
  } catch {
    /* sin almacenamiento (ventana privada): vuelve arriba, nada se rompe */
  }
}

function useVolverATarjeta() {
  useLayoutEffect(() => {
    let guardado: { busqueda: string; id: string; arriba: number } | null = null;
    try {
      guardado = JSON.parse(sessionStorage.getItem(VOLVER) ?? "null");
    } catch {
      return; // sin almacenamiento, que el navegador haga lo que pueda
    }
    history.scrollRestoration = "manual";
    const volviendo = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "back_forward";
    if (!guardado || !volviendo || guardado.busqueda !== location.search) return;
    const tarjeta = document.querySelector(`[data-tarjeta="${guardado.id}"]`);
    if (tarjeta) scrollTo({ top: scrollY + tarjeta.getBoundingClientRect().top - guardado.arriba, behavior: "instant" });
  }, []);
}

export default function Listado() {
  useVolverATarjeta();
  const consulta = useConsulta();
  const [f, setF] = useState<Filtros>(filtrosDeLaDireccion);
  // Cuántas se ven también queda en la dirección: al volver de una ficha, el navegador encuentra la tarjeta donde estaba
  const [cuantas, setCuantas] = useState(() => Math.max(TANDA, Number(new URLSearchParams(location.search).get("n")) || 0));

  // Los filtros viven en la dirección, sin sumar pasos al historial: "atrás" desde una ficha vuelve a esta búsqueda
  const cambiar = (cambios: Partial<Filtros>) => {
    const nuevo = { ...f, ...cambios };
    const op = nuevo.op || "venta";
    if (cambios.tipo !== undefined) {
      Object.assign(nuevo, { dorm: "", sup: "", orden: nuevo.orden === "m2" ? "" : nuevo.orden });
      // Si en esa zona no hay de este tipo, la zona se suelta: si no, quedaba "0 propiedades" sin saber por qué
      if (nuevo.zona && !PROPIEDADES.some((p) => p.operacion.includes(op) && p.zona === nuevo.zona && (!nuevo.tipo || p.tipo === nuevo.tipo))) nuevo.zona = "";
    }
    if (cambios.op !== undefined) Object.assign(nuevo, { tipo: "", zona: "", precio: "", dorm: "", sup: "", orden: nuevo.orden === "m2" ? "" : nuevo.orden });
    setF(nuevo);
    setCuantas(TANDA);
    history.replaceState(null, "", ir({ ver: "propiedades", ...nuevo }));
  };
  const verMas = () => {
    const n = cuantas + TANDA;
    setCuantas(n);
    history.replaceState(null, "", ir({ ver: "propiedades", ...f, n }));
  };

  const op = f.op || "venta";
  const deLaOperacion = PROPIEDADES.filter((p) => p.operacion.includes(op));
  const tipos = contar(deLaOperacion, (p) => p.tipo);
  const zonas = contar(deLaOperacion.filter((p) => !f.tipo || p.tipo === f.tipo), (p) => p.zona);
  // Una zona que llegó por un link y no tiene nada acá igual aparece elegida: el selector nunca dice "Todas" si no es así
  if (f.zona && !zonas.some(([z]) => z === f.zona)) zonas.unshift([f.zona, 0]);
  const lista = filtrar(f);
  const conCasas = !f.tipo || ["Casa", "Departamento", "Hotel"].includes(f.tipo);
  const conTerreno = f.tipo === "Terreno" || f.tipo === "Campo";
  const hayFiltros = CLAVES.some((k) => k !== "op" && k !== "orden" && f[k]);

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
      <h1 className="font-display text-[2rem] leading-tight sm:text-[2.6rem]">Propiedades en {op === "venta" ? "venta" : "alquiler"}</h1>

      <form onSubmit={(e) => e.preventDefault()} className="mt-4">
        <label className="sr-only" htmlFor="buscar">Buscar por código, zona o palabra</label>
        <input
          id="buscar"
          type="search"
          value={f.q}
          onChange={(e) => cambiar({ q: e.target.value })}
          placeholder="Buscar por código (CHO…), zona o palabra"
          data-buscar
          className="h-12 w-full rounded-xl border border-linea bg-white px-4 text-[16px]"
        />
      </form>

      <div className="mt-4 flex gap-2" role="group" aria-label="Operación">
        {["venta", "alquiler"].map((o) => (
          <button key={o} onClick={() => cambiar({ op: o === "venta" ? "" : o })} aria-pressed={op === o} className="rounded-full border border-linea px-5 py-2.5 text-[15px] font-semibold capitalize aria-pressed:border-tinta aria-pressed:bg-tinta aria-pressed:text-white">
            {o === "venta" ? "Comprar" : "Alquilar"}
          </button>
        ))}
      </div>

      <div data-libre className="sin-barra -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Tipo de propiedad">
        <button onClick={() => cambiar({ tipo: "" })} aria-pressed={!f.tipo} className="shrink-0 rounded-full border border-linea bg-white px-4 py-2 text-[14.5px] whitespace-nowrap aria-pressed:border-naranja-osc aria-pressed:bg-naranja-osc aria-pressed:font-semibold aria-pressed:text-white">
          Todas <span className="opacity-70">{deLaOperacion.length}</span>
        </button>
        {tipos.map(([tipo, n]) => (
          <button key={tipo} data-filtro-tipo={tipo} onClick={() => cambiar({ tipo })} aria-pressed={f.tipo === tipo} className="shrink-0 rounded-full border border-linea bg-white px-4 py-2 text-[14.5px] whitespace-nowrap aria-pressed:border-naranja-osc aria-pressed:bg-naranja-osc aria-pressed:font-semibold aria-pressed:text-white">
            {TIPOS[tipo] ?? tipo} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Selector nombre="zona" etiqueta="Zona" valor={f.zona} alCambiar={(zona) => cambiar({ zona })} opciones={[{ valor: "", texto: "Todas las zonas" }, ...zonas.map(([z, n]) => ({ valor: z, texto: `${z} (${n})` }))]} />
        <Selector nombre="precio" etiqueta="Precio" valor={f.precio} alCambiar={(precio) => cambiar({ precio })} opciones={[{ valor: "", texto: "Cualquier precio" }, ...(op === "venta" ? PRECIOS : PRECIOS_ALQUILER)]} />
        {conCasas && !conTerreno && (
          <Selector nombre="dorm" etiqueta="Dormitorios" valor={f.dorm} alCambiar={(dorm) => cambiar({ dorm })} opciones={[{ valor: "", texto: "Cualquiera" }, ...[1, 2, 3, 4].map((n) => ({ valor: String(n), texto: `${n} o más` }))]} />
        )}
        {conTerreno && <Selector nombre="sup" etiqueta="Superficie" valor={f.sup} alCambiar={(sup) => cambiar({ sup })} opciones={[{ valor: "", texto: "Cualquiera" }, ...SUPERFICIES]} />}
        <Selector nombre="orden" etiqueta="Ordenar" valor={f.orden} alCambiar={(orden) => cambiar({ orden })} opciones={ORDENES.filter((o) => o.valor !== "m2" || conTerreno)} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-b border-linea pb-3">
        <p className="text-[15px]" data-resultados={lista.length}>
          <b className="font-semibold">{lista.length}</b> {lista.length === 1 ? "propiedad" : "propiedades"}
        </p>
        {hayFiltros && (
          <button onClick={() => cambiar({ tipo: "", zona: "", precio: "", dorm: "", sup: "", q: "" })} className="text-[14px] font-semibold text-naranja-osc">
            Limpiar filtros
          </button>
        )}
      </div>
      {hayFiltros && (
        <button onClick={() => consulta.abrir(`Hola, avisenme si entra algo así: ${resumen(f)}.\nLa búsqueda: ${location.href}`)} data-avisame className="mt-3 text-[14px] font-semibold text-tinta/80 underline underline-offset-4">
          Avisame por WhatsApp si entra algo así
        </button>
      )}

      {lista.length ? (
        <div onClick={recordarTarjeta} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lista.slice(0, cuantas).map((p) => (
            <Tarjeta key={p.id} p={p} op={op} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl bg-hondo p-8 text-center text-[16px] text-suave">No hay propiedades con esos filtros. Probá sacando alguno.</p>
      )}
      {lista.length > cuantas && (
        <div className="mt-8 text-center">
          <p className="text-[14px] text-suave">Viendo {cuantas} de {lista.length}</p>
          <button onClick={verMas} data-ver-mas className="mt-3 rounded-full border border-tinta/20 bg-white px-7 py-3.5 text-[15px] font-semibold hover:bg-hondo">
            Ver {Math.min(TANDA, lista.length - cuantas)} más
          </button>
        </div>
      )}
      {consulta.vista}
      {lista.some(esTerreno) && f.orden === "m2" && <p className="mt-6 text-[13px] text-suave">Las que no publican superficie van al final.</p>}
    </section>
  );
}
