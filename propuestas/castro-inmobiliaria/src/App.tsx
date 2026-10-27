// Cada pantalla es una dirección propia (?p=7876886, ?ver=propiedades&tipo=Terreno, ?u=4008) y se pasa de una a
// otra con links comunes que recargan la página. Así no hace falta un router: el "atrás" del celular, la vuelta
// al mismo lugar del listado y abrir en otra pestaña los resuelve el navegador.
import { useEffect } from "react";
import CintaPropuesta from "../../../compartido/CintaPropuesta";
import { Encabezado, Pie, WhatsAppFlotante } from "./componentes";
import { NEGOCIO, URBANIZACIONES } from "./datos";
import Ficha, { nombreLindo } from "./Ficha";
import Listado, { filtrosDeLaDireccion, resumen } from "./Listado";
import Portada from "./Portada";
import { Contacto, Guardadas, Nosotros, Urbanizacion, Urbanizaciones, Vender } from "./Secciones";

const TITULOS: Record<string, string> = {
  propiedades: "Propiedades en Merlo y la zona",
};

/** El mensaje del botón flotante dice qué se estaba mirando. */
function mensajeFlotante(ver: string, u: string | null) {
  if (ver === "propiedades") return `Hola, estoy buscando ${resumen(filtrosDeLaDireccion())}.\n${location.href}`;
  const urb = u && URBANIZACIONES.find((x) => x.id === u);
  if (urb) return `Hola, quiero información sobre la urbanización ${nombreLindo(urb.nombre)}.`;
  if (ver === "vender") return "Hola, quiero vender o tasar mi propiedad.";
  return "Hola, quería hacerles una consulta.";
}

export default function App() {
  const q = new URLSearchParams(location.search);
  const p = q.get("p");
  const u = q.get("u");
  const ver = p ? "propiedades" : u ? "urbanizaciones" : (q.get("ver") ?? "");

  useEffect(() => {
    if (TITULOS[ver] && !p) document.title = `${TITULOS[ver]} · ${NEGOCIO}`;
  }, [ver, p]);

  const pantalla = p ? <Ficha id={p} />
    : u ? <Urbanizacion id={u} />
    : ver === "propiedades" ? <Listado />
    : ver === "urbanizaciones" ? <Urbanizaciones />
    : ver === "nosotros" ? <Nosotros />
    : ver === "contacto" ? <Contacto />
    : ver === "vender" ? <Vender />
    : ver === "guardadas" ? <Guardadas />
    : <Portada />;

  return (
    // Al menos el alto de la pantalla: en una página corta (Guardadas vacía) el pie llega hasta abajo
    <div className="flex min-h-dvh flex-col pt-8">
      <CintaPropuesta negocio={NEGOCIO} />
      <Encabezado actual={ver} />
      <main className="flex-1">{pantalla}</main>
      <Pie pegado={ver === "nosotros"} />
      {!p && <WhatsAppFlotante mensaje={() => mensajeFlotante(ver, u)} />}
    </div>
  );
}
