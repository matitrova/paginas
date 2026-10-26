// Los datos de Castro tal cual los publica su sitio, armados por scripts/castro_datos.py.
// El índice viene en el paquete (lo usan la portada y el listado); la ficha completa se pide al abrirla.
import indiceCrudo from "./datos/indice.json";
import sitioCrudo from "./datos/sitio.json";

export interface Propiedad {
  id: string;
  codigo: string;
  titulo: string;
  operacion: string[];
  tipo: string;
  zona: string;
  localidad: string;
  urbanizacion: string[];
  precio: number | null;
  moneda: string;
  ambientes: number | null;
  dormitorios: number | null;
  banos: number | null;
  cubierta: number | null;
  construido: number | null;
  terreno: number | null;
  alta: string;
  destacada: boolean;
  lat: number;
  lng: number;
  fotos: number;
}

export interface Ficha {
  id: string;
  descripcion: string;
  adicionales: string[];
  servicios: string[];
  fotos: string[];
  semicubierta: number | null;
  cochera: number | null;
  plantas: number | null;
  antiguedad: string | null;
  operaciones: { operacion: string; precio: string; moneda: string }[];
}

export const PROPIEDADES = indiceCrudo as Propiedad[];
export const SITIO = sitioCrudo;
export const URBANIZACIONES = sitioCrudo.urbanizaciones;
export const porId = new Map(PROPIEDADES.map((p) => [p.id, p]));

export const NEGOCIO = "Castro Inmobiliaria";

/** El sitio llama "Hotel" a los complejos turísticos; acá se dice como lo entiende el que busca. */
export const TIPOS: Record<string, string> = {
  Casa: "Casas",
  Terreno: "Terrenos",
  Departamento: "Departamentos",
  Hotel: "Complejos y hoteles",
  Campo: "Campos",
  Local: "Locales",
  Oficina: "Oficinas",
  Galpón: "Galpones",
};

const miles = (n: number) => Math.round(n).toLocaleString("es-AR");

export function precio(p: Pick<Propiedad, "precio" | "moneda">) {
  if (!p.precio) return null;
  return p.moneda === "USD" ? `USD ${miles(p.precio)}` : `$ ${miles(p.precio)}`;
}

/** 600 → "600 m²"; desde una hectárea, en hectáreas: 131700 → "13,2 ha". */
export function superficie(m2: number | null) {
  if (!m2) return null;
  if (m2 >= 10000) return `${(m2 / 10000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} ha`;
  return `${miles(m2)} m²`;
}

export function porM2(p: Propiedad) {
  return p.precio && p.terreno && p.moneda === "USD" ? p.precio / p.terreno : null;
}

export const esTerreno = (p: Propiedad) => p.tipo === "Terreno" || p.tipo === "Campo";

/** Cuántas hay de cada valor, de más a menos. */
export function contar<T>(lista: T[], clave: (x: T) => string) {
  const cuenta = new Map<string, number>();
  for (const x of lista) {
    const k = clave(x);
    if (k) cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  return [...cuenta].sort((a, b) => b[1] - a[1]);
}

const fichas = new Map<string, Promise<Ficha>>();
export function pedirFicha(id: string) {
  if (!fichas.has(id)) fichas.set(id, fetch(`./fichas/${id}.json`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))));
  return fichas.get(id)!;
}

export const portada = (id: string) => `./fotos/p-${id}.webp`;

/** El link de WhatsApp como debe ser: 549 + característica sin 0 + número sin 15. */
export const WHATSAPP = "5492665024444";
export const TELEFONO = "266 502 4444";
