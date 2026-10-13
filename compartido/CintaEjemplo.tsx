// La cinta fija que avisa que el negocio es inventado. Si está cargado el WhatsApp de Matías,
// suma el botón para pedirle una página igual.
import { quieroUnaAsi } from "./contacto";

export default function CintaEjemplo({ pagina }: { pagina: string }) {
  const link = quieroUnaAsi(pagina);
  return (
    <aside
      aria-label="Aviso: sitio de ejemplo"
      className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-black/80 py-1.5 pr-1.5 pl-4 text-xs whitespace-nowrap text-white shadow-lg backdrop-blur"
    >
      <span>
        <b className="font-semibold">Sitio de ejemplo</b> · Diseño: Matías Trovato
      </span>
      {link ? (
        <a href={link} target="_blank" rel="noopener" className="rounded-full bg-white px-3 py-1.5 font-semibold text-black">
          Quiero una así
        </a>
      ) : (
        <span className="pr-2.5" />
      )}
    </aside>
  );
}
