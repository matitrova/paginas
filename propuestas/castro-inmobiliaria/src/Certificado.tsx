import { contacto, WHATSAPP_MATIAS_TEXTO } from "../../../compartido/contacto";
import { CAIDA, CONTACTO, DOMINIO, PANTALLA } from "./textos";

/** La pantalla que ve hoy cualquiera que entra. Dibujada, no una captura:
 *  así se ve igual en cualquier pantalla y no depende de una imagen. */
function PantallaDeError() {
  return (
    <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-[0_18px_50px_-24px_rgb(33_28_24/0.5)]">
      <div className="flex items-center gap-2 border-b border-linea bg-hondo px-3 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="block h-2.5 w-2.5 rounded-full bg-[#e5574b]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#e5b04b]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#5bb85b]" />
        </span>
        <span className="ml-2 flex-1 truncate rounded bg-white px-2.5 py-1 text-[11px] text-suave">
          <span className="font-medium text-[#d93025]">⚠ No seguro</span> {DOMINIO}
        </span>
      </div>
      <div className="px-6 py-8 sm:px-10 sm:py-11">
        <div className="mb-5 text-4xl" aria-hidden="true">⚠️</div>
        <h3 className="text-xl font-semibold sm:text-2xl">{PANTALLA.titulo}</h3>
        <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-suave">{PANTALLA.cuerpo}</p>
        <p className="mt-4 font-mono text-[11px] tracking-wide text-suave">{PANTALLA.codigo}</p>
        <div className="mt-6 flex gap-2.5">
          <span className="rounded bg-[#1a73e8] px-4 py-2 text-[13px] font-medium text-white">Volver</span>
          <span className="rounded border border-linea px-4 py-2 text-[13px] text-suave">Configuración avanzada</span>
        </div>
      </div>
    </div>
  );
}

export default function Certificado() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-naranja-osc uppercase">Para {CONTACTO} · Lo que pasa hoy</p>
      <h1 className="font-display mt-4 text-[2rem] leading-tight text-balance sm:text-5xl">Su página hoy no abre.</h1>
      <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-tinta/85">
        <p>
          Desde el <b className="font-semibold">{CAIDA.vencio}</b>, el que entra a {DOMINIO} no ve las propiedades: ve una pantalla que
          le dice que el sitio no es seguro. Pasa con www y sin www.
        </p>
      </div>
      <div className="mt-8">
        <PantallaDeError />
      </div>
      <div className="mt-10 space-y-4 text-[17px] leading-relaxed text-tinta/85">
        <p>
          El motivo es chico: el certificado de seguridad del dominio venció y no se renovó solo. Lo emite {CAIDA.emisor} y se renueva
          cada tres meses. Esta vez no pasó.
        </p>
        <p>
          <b className="font-semibold">Lo arregla quien les hizo la página, en una tarde.</b> No hace falta contratarme para eso: abajo
          está el texto para pasarle.
        </p>
      </div>
      <div className="mt-8 rounded-xl border border-linea bg-white p-5 sm:p-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-suave uppercase">Para pasarle a quien maneja el sitio</p>
        <p className="mt-3 font-mono text-[13px] leading-relaxed text-tinta/90" data-para-el-tecnico>
          El certificado SSL de {DOMINIO} venció el {CAIDA.vencio}. Hay que renovarlo y revisar por qué falló la renovación automática
          de {CAIDA.emisor}. El error que devuelve es «{CAIDA.error}», y afecta a los dos dominios, con www y sin www.
        </p>
      </div>
      <p className="mt-10 text-[17px] leading-relaxed text-tinta/85">
        Mientras tanto, armé cómo podría quedar la página nueva, con sus 272 propiedades.{" "}
        <a href="./" className="font-semibold text-naranja-osc underline underline-offset-4">Mirarla →</a>
      </p>
      <p className="mt-8 border-t border-linea pt-6 text-[15px] text-suave">
        Matías Trovato · Hago páginas web.{" "}
        <a href={contacto(`Hola Matías! Soy ${CONTACTO} de Castro Inmobiliaria. Vi lo de la página.`).href} target="_blank" rel="noopener" className="font-semibold text-naranja-osc">
          WhatsApp {WHATSAPP_MATIAS_TEXTO}
        </a>
      </p>
    </section>
  );
}
