// El cartel fijo de las propuestas para comercios reales. Tiene que quedar claro, en todo
// momento, que la página la hizo Matías como propuesta y que no es la del negocio.
import { contacto } from "./contacto";

// Va junto a la galería y en el pie: las fotos salen de las redes del negocio, no de sus originales.
export const NOTA_FOTOS = "Las fotos están tomadas de sus redes, por eso la calidad. Con las originales se ve mucho mejor.";

export default function CintaPropuesta({ negocio }: { negocio: string }) {
  const c = contacto(`Hola Matías! Vi la propuesta de página para ${negocio}.`);
  return (
    <aside
      aria-label="Aviso: propuesta de diseño, no es la página oficial"
      className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center gap-2.5 bg-black px-3 text-[10.5px] leading-tight whitespace-nowrap text-white sm:text-xs"
    >
      <a href="../../" className="font-semibold underline-offset-2 hover:underline">
        ← <span className="hidden sm:inline">Más trabajos</span>
        <span className="sm:hidden">Trabajos</span>
      </a>
      {/* En celular va la versión corta, para que entre en un renglón y no tape el encabezado */}
      <span>
        <b className="font-semibold">Propuesta de diseño</b>
        <span className="hidden sm:inline"> de Matías Trovato para {negocio}</span> · No es la página oficial
      </span>
      <a href={c.href} target={c.canal === "whatsapp" ? "_blank" : undefined} rel="noopener" className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-black">
        <span className="sm:hidden">Matías</span>
        <span className="hidden sm:inline">Hablar con Matías</span>
      </a>
    </aside>
  );
}
