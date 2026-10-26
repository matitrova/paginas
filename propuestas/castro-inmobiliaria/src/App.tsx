// Cada pantalla es una dirección propia (?p=7876886, ?ver=propiedades&tipo=Terreno, ?u=4008) y se pasa de una a
// otra con links comunes que recargan la página. Así no hace falta un router: el "atrás" del celular, la vuelta
// al mismo lugar del listado y abrir en otra pestaña los resuelve el navegador.
import { useEffect } from "react";
import CintaPropuesta from "../../../compartido/CintaPropuesta";
import Certificado from "./Certificado";
import { AvisoCaida, Encabezado, Pie } from "./componentes";
import { NEGOCIO } from "./datos";
import Ficha from "./Ficha";
import Listado from "./Listado";
import Portada from "./Portada";
import { Contacto, Nosotros, Urbanizacion, Urbanizaciones } from "./Secciones";

const TITULOS: Record<string, string> = {
  propiedades: "Propiedades en Villa de Merlo",
  certificado: "Su página hoy no abre",
};

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
    : ver === "certificado" ? <Certificado />
    : <Portada />;

  return (
    <div className="pt-8">
      <CintaPropuesta negocio={NEGOCIO} />
      <Encabezado actual={ver} />
      {ver !== "certificado" && <AvisoCaida />}
      <main>{pantalla}</main>
      <Pie pegado={ver === "nosotros"} abajo={!!p} />
    </div>
  );
}
