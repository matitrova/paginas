// En las páginas de muestra y en las propuestas los formularios no mandan nada: abren esto, que
// muestra el mensaje tal como le llegaría al dueño en su WhatsApp. Es lo que se le muestra al comerciante.
import { useEffect, useRef } from "react";
import { quieroUnaAsi } from "./contacto";

interface Props {
  /** El mensaje armado; null = cerrado. */
  mensaje: string | null;
  negocio: string;
  pagina: string;
  /** "propuesta" = página armada para un comercio real; cambia el texto de abajo. */
  tipo?: "ejemplo" | "propuesta";
  /** Qué le llega al negocio: "el pedido" a un comercio, "la consulta" a una inmobiliaria. */
  que?: string;
  /** El WhatsApp del negocio (5492665024444). Si viene, además de mostrar el mensaje se puede mandar: abre el chat
   *  real con el mensaje listo. Nunca se manda solo: la persona elige tocar el botón. */
  enviarA?: string;
  alCerrar: () => void;
}

export default function VistaWhatsApp({ mensaje, negocio, pagina, tipo = "ejemplo", que = "el pedido", enviarA, alCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const link = quieroUnaAsi(pagina);

  useEffect(() => {
    const d = dialogo.current!;
    if (mensaje !== null && !d.open) d.showModal();
    if (mensaje === null && d.open) d.close();
  }, [mensaje]);

  return (
    <dialog
      ref={dialogo}
      onClose={alCerrar}
      onClick={(e) => e.target === dialogo.current && alCerrar()}
      className="m-auto w-[min(92vw,26rem)] overflow-hidden rounded-3xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="bg-[#075e54] px-5 py-4 text-white">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-80">Así te llega {que}</p>
        <p className="mt-0.5 text-lg font-semibold">WhatsApp de {negocio}</p>
      </div>
      <div className="bg-[#e5ddd5] px-4 py-5">
        <div className="relative ml-auto w-fit max-w-[88%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-line [overflow-wrap:anywhere] shadow-sm" data-mensaje>
          {mensaje}
          <span className="mt-1 block text-right text-[11px] text-neutral-500">ahora ✓✓</span>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm text-neutral-600">
          {enviarA
            ? `Todavía no se mandó nada. Si querés, mandalo: se abre el WhatsApp de ${negocio} con el mensaje listo.`
            : tipo === "propuesta"
            ? "Esto es una propuesta de diseño, así que no se envió nada. En la página real, el cliente toca el botón y el mensaje llega armado al WhatsApp del negocio."
            : "Este sitio es de ejemplo, así que no se envió nada. En tu página, el cliente toca el botón y el mensaje te llega armado, sin que tenga que escribir."}
        </p>
        <div className="flex flex-wrap gap-2">
          {enviarA && mensaje && (
            <a href={`https://wa.me/${enviarA}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener" data-enviar-whatsapp className="rounded-full bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-black">
              Mandarlo por WhatsApp
            </a>
          )}
          {link && tipo === "ejemplo" && (
            <a href={link} target="_blank" rel="noopener" className="rounded-full bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-black">
              Quiero una página así
            </a>
          )}
          <button onClick={alCerrar} className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  );
}
