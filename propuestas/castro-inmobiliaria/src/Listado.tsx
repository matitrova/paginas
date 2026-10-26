import { useLayoutEffect, useState } from "react";
import { ir, Tarjeta } from "./componentes";
import { contar, esTerreno, porM2, PROPIEDADES, TIPOS, type Propiedad } from "./datos";

// Rangos fijos en vez de un deslizador: con 272 propiedades se elige rápido y se entiende de un vistazo
const PRECIOS = [
  { valor: "0-50000", texto: "Hasta USD 50.000" },
  { valor: "50000-100000", texto: "USD 50.000 a 100.000" },
  { valor: "100000-150000", texto: "USD 100.000 a 150.000" },
  { valor: "150000-250000", texto: "USD 150.000 a 250.000" },
  { valor: "250000-", texto: "Más de USD 250.000" },
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
  { valor: "m2", texto: "Menor USD por m²" },
];

const CLAVES = ["op", "tipo", "zona", "precio", "dorm", "sup", "orden"] as const;
// De a cuántas se muestran: 249 tarjetas de una son una tira interminable en el celular
const TANDA = 30;
type Filtros = Record<(typeof CLAVES)[number], string>;

const dentro = (n: number | null, rango: string) => {
  if (!rango) return true;
  if (n === null) return false;
  const [desde, hasta] = rango.split("-").map((x) => (x ? Number(x) : null));
  return n >= (desde ?? 0) && (hasta === null || n < hasta);
};

export function filtrar(f: Filtros): Propiedad[] {
  const op = f.op || "venta";
  const lista = PROPIEDADES.filter(
    (p) =>
      p.operacion.includes(op) &&
      (!f.tipo || p.tipo === f.tipo) &&
      (!f.zona || p.zona === f.zona) &&
      (op !== "venta" || !f.precio || (p.moneda === "USD" && dentro(p.precio, f.precio))) &&
      (!f.dorm || (p.dormitorios ?? 0) >= Number(f.dorm)) &&
      (!f.sup || dentro(p.terreno, f.sup)),
  );
  const precioUsd = (p: Propiedad) => (p.moneda === "USD" ? p.precio : null);
  const sinDato = (n: number | null, alto: boolean) => n ?? (alto ? -Infinity : Infinity);
  if (f.orden === "menor") return lista.sort((a, b) => sinDato(precioUsd(a) ?? a.precio, false) - sinDato(precioUsd(b) ?? b.precio, false));
  if (f.orden === "mayor") return lista.sort((a, b) => sinDato(precioUsd(b) ?? b.precio, true) - sinDato(precioUsd(a) ?? a.precio, true));
  if (f.orden === "m2") return lista.sort((a, b) => sinDato(porM2(a), false) - sinDato(porM2(b), false));
  return lista.sort((a, b) => b.alta.localeCompare(a.alta));
}

function Selector({ etiqueta, valor, opciones, alCambiar }: { etiqueta: string; valor: string; opciones: { valor: string; texto: string }[]; alCambiar: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12.5px] font-medium text-suave">
      {etiqueta}
      <select value={valor} onChange={(e) => alCambiar(e.target.value)} className="h-11 min-w-0 rounded-xl border border-linea bg-white px-3 text-[15px] text-tinta">
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
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
    history.scrollRestoration = "manual";
    let guardado: { busqueda: string; id: string; arriba: number } | null = null;
    try {
      guardado = JSON.parse(sessionStorage.getItem(VOLVER) ?? "null");
    } catch {
      return;
    }
    const volviendo = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "back_forward";
    if (!guardado || !volviendo || guardado.busqueda !== location.search) return;
    const tarjeta = document.querySelector(`[data-tarjeta="${guardado.id}"]`);
    if (tarjeta) scrollTo({ top: scrollY + tarjeta.getBoundingClientRect().top - guardado.arriba, behavior: "instant" });
  }, []);
}

export default function Listado() {
  useVolverATarjeta();
  const [f, setF] = useState<Filtros>(() => {
    const q = new URLSearchParams(location.search);
    return Object.fromEntries(CLAVES.map((k) => [k, q.get(k) ?? ""])) as Filtros;
  });
  // Cuántas se ven también queda en la dirección: al volver de una ficha, el navegador encuentra la tarjeta donde estaba
  const [cuantas, setCuantas] = useState(() => Math.max(TANDA, Number(new URLSearchParams(location.search).get("n")) || 0));

  // Los filtros viven en la dirección, sin sumar pasos al historial: "atrás" desde una ficha vuelve a esta búsqueda
  const cambiar = (cambios: Partial<Filtros>) => {
    const nuevo = { ...f, ...cambios };
    if (cambios.tipo !== undefined) Object.assign(nuevo, { dorm: "", sup: "", orden: nuevo.orden === "m2" ? "" : nuevo.orden });
    if (cambios.op !== undefined) Object.assign(nuevo, { tipo: "", zona: "", precio: "", dorm: "", sup: "" });
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
  const lista = filtrar(f);
  const conCasas = !f.tipo || ["Casa", "Departamento", "Hotel"].includes(f.tipo);
  const conTerreno = f.tipo === "Terreno" || f.tipo === "Campo";
  const hayFiltros = CLAVES.some((k) => k !== "op" && k !== "orden" && f[k]);

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
      <h1 className="font-display text-[2rem] leading-tight sm:text-[2.6rem]">Propiedades en {op === "venta" ? "venta" : "alquiler"}</h1>

      <div className="mt-5 flex gap-2" role="group" aria-label="Operación">
        {["venta", "alquiler"].map((o) => (
          <button key={o} onClick={() => cambiar({ op: o === "venta" ? "" : o })} aria-pressed={op === o} className="rounded-full border border-linea px-5 py-2.5 text-[15px] font-semibold capitalize aria-pressed:border-tinta aria-pressed:bg-tinta aria-pressed:text-white">
            {o === "venta" ? "Comprar" : "Alquilar"}
          </button>
        ))}
      </div>

      <div data-libre className="sin-barra -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Tipo de propiedad">
        <button onClick={() => cambiar({ tipo: "" })} aria-pressed={!f.tipo} className="shrink-0 rounded-full border border-linea bg-white px-4 py-2 text-[14.5px] whitespace-nowrap aria-pressed:border-naranja aria-pressed:bg-naranja aria-pressed:font-semibold aria-pressed:text-white">
          Todas <span className="opacity-70">{deLaOperacion.length}</span>
        </button>
        {tipos.map(([tipo, n]) => (
          <button key={tipo} data-filtro-tipo={tipo} onClick={() => cambiar({ tipo })} aria-pressed={f.tipo === tipo} className="shrink-0 rounded-full border border-linea bg-white px-4 py-2 text-[14.5px] whitespace-nowrap aria-pressed:border-naranja aria-pressed:bg-naranja aria-pressed:font-semibold aria-pressed:text-white">
            {TIPOS[tipo] ?? tipo} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Selector etiqueta="Zona" valor={f.zona} alCambiar={(zona) => cambiar({ zona })} opciones={[{ valor: "", texto: "Todas las zonas" }, ...zonas.map(([z, n]) => ({ valor: z, texto: `${z} (${n})` }))]} />
        {op === "venta" && <Selector etiqueta="Precio" valor={f.precio} alCambiar={(precio) => cambiar({ precio })} opciones={[{ valor: "", texto: "Cualquier precio" }, ...PRECIOS]} />}
        {conCasas && !conTerreno && (
          <Selector etiqueta="Dormitorios" valor={f.dorm} alCambiar={(dorm) => cambiar({ dorm })} opciones={[{ valor: "", texto: "Cualquiera" }, ...[1, 2, 3, 4].map((n) => ({ valor: String(n), texto: `${n} o más` }))]} />
        )}
        {conTerreno && <Selector etiqueta="Superficie" valor={f.sup} alCambiar={(sup) => cambiar({ sup })} opciones={[{ valor: "", texto: "Cualquiera" }, ...SUPERFICIES]} />}
        <Selector etiqueta="Ordenar" valor={f.orden} alCambiar={(orden) => cambiar({ orden })} opciones={ORDENES.filter((o) => o.valor !== "m2" || conTerreno)} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-b border-linea pb-3">
        <p className="text-[15px]" data-resultados={lista.length}>
          <b className="font-semibold">{lista.length}</b> {lista.length === 1 ? "propiedad" : "propiedades"}
        </p>
        {hayFiltros && (
          <button onClick={() => cambiar({ tipo: "", zona: "", precio: "", dorm: "", sup: "" })} className="text-[14px] font-semibold text-naranja-osc">
            Limpiar filtros
          </button>
        )}
      </div>

      {lista.length ? (
        <div onClick={recordarTarjeta} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lista.slice(0, cuantas).map((p) => (
            <Tarjeta key={p.id} p={p} />
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
      {lista.some(esTerreno) && f.orden === "m2" && <p className="mt-6 text-[13px] text-suave">Las que no publican superficie van al final.</p>}
    </section>
  );
}
