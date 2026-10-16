import { EMAIL_MATIAS, WHATSAPP_MATIAS_TEXTO, mail, wa } from "../../compartido/contacto";
import Estrellas from "./components/Estrellas";
import { MENSAJE, SECCIONES, captura, type Seccion } from "./textos";

// El color de la etiqueta dice qué es cada página antes de leerla
const TONOS: Record<Seccion["tipo"], string> = {
  cliente: "bg-wa/15 text-wa ring-wa/40",
  ejemplo: "bg-cian/10 text-cian ring-cian/40",
  propuesta: "bg-amber-300/10 text-amber-300 ring-amber-300/40",
};

// Lo que lee un lector de pantalla: que una propuesta o un ejemplo no parezca la página del negocio
const ALT: Record<Seccion["tipo"], (nombre: string) => string> = {
  cliente: (n) => `Captura de la página de ${n}`,
  ejemplo: (n) => `Captura de la página de ejemplo ${n} (negocio inventado)`,
  propuesta: (n) => `Captura de la propuesta de página para ${n} (no es su página oficial)`,
};

const Whatsapp = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
    <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 10 9.9 5.2 16 5.2S27 10 27 15.9 22.1 26.4 16 26.4zm6-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.5z" />
  </svg>
);

const Sobre = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden className="h-6 w-6">
    <rect x="4" y="7" width="24" height="18" rx="3.5" />
    <path d="M5 9l11 8.5L27 9" strokeLinecap="round" />
  </svg>
);

function Contacto() {
  return (
    <div className="mt-8 grid gap-3">
      <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="flex items-center justify-center gap-3 rounded-2xl bg-wa px-5 py-4 font-semibold text-fondo transition hover:brightness-110">
        <Whatsapp />
        <span className="text-left leading-tight">
          WhatsApp
          <span className="block text-sm font-medium opacity-75">{WHATSAPP_MATIAS_TEXTO}</span>
        </span>
      </a>
      <a href={mail(MENSAJE)} data-contacto="mail" className="flex items-center justify-center gap-3 rounded-2xl bg-white/10 px-5 py-4 font-semibold ring-1 ring-white/15 transition hover:bg-white/15">
        <Sobre />
        <span className="min-w-0 text-left leading-tight">
          Mail
          <span className="block truncate text-sm font-medium text-suave">{EMAIL_MATIAS}</span>
        </span>
      </a>
    </div>
  );
}

function Tarjetas({ seccion }: { seccion: Seccion }) {
  return (
    <section id={seccion.id} className="mt-14">
      <h2 className="font-display text-2xl font-bold">{seccion.titulo}</h2>
      {seccion.nota && <p className="mt-3 text-[15px] leading-relaxed text-suave">{seccion.nota}</p>}
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {seccion.trabajos.map((t) => (
          <li key={t.id} className={seccion.trabajos.length === 1 ? "md:col-span-2" : undefined}>
            <a
              href={t.href}
              data-trabajo={t.id}
              data-tipo={seccion.tipo}
              className="group flex h-full gap-4 rounded-3xl bg-panel/85 p-3 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-acento/60"
            >
              <div className="telefono w-[5.6rem] shrink-0 self-start text-[6px]">
                <img src={captura(`${t.id}-movil`)} alt={ALT[seccion.tipo](t.nombre)} loading="lazy" />
              </div>
              <div className="flex min-w-0 flex-col py-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ring-1 ${TONOS[seccion.tipo]}`}>{seccion.etiqueta}</span>
                  <span className="text-sm text-tinta/80">{seccion.detalle}</span>
                </p>
                <h3 className="font-display mt-2 text-xl leading-tight font-bold">{t.nombre}</h3>
                <p className="text-sm text-suave">{t.rubro}</p>
                <p className="mt-2 text-[15px] leading-snug">{t.texto}</p>
                <span className="mt-auto pt-3">
                  <span className="inline-block rounded-full bg-acento px-4 py-2 text-sm font-semibold text-fondo transition group-hover:brightness-110">Ver la página</span>
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Estrellas />
      <main className="mx-auto max-w-md px-5 pt-14 pb-12 md:max-w-3xl md:pt-20">
        <header className="text-center md:mx-auto md:max-w-md">
          <p aria-hidden className="font-display mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-acento-fuerte to-cian text-3xl font-bold shadow-[0_0_60px_rgba(124,58,237,0.45)]">
            MT
          </p>
          <h1 className="font-display mt-5 text-3xl font-bold md:text-4xl">Matías Trovato</h1>
          <p className="mt-2 text-lg text-suave">
            Páginas web para comercios de <span className="degrade font-semibold">Merlo, San Luis</span>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-tinta/85">Te hago la página de tu negocio, con tus fotos y un botón para que te escriban por WhatsApp.</p>
          <Contacto />
        </header>

        {SECCIONES.map((s) => (
          <Tarjetas key={s.id} seccion={s} />
        ))}

        <section className="mt-16 rounded-3xl bg-gradient-to-br from-acento-fuerte/30 to-cian/10 p-7 text-center ring-1 ring-acento/40">
          <h2 className="font-display text-2xl font-bold">¿Querés una para tu negocio?</h2>
          <p className="mt-2 text-suave">Presupuesto sin compromiso: escribime y te paso el precio según lo que necesites.</p>
          <a href={wa(MENSAJE)} target="_blank" rel="noopener" data-contacto="whatsapp" className="mt-6 inline-flex items-center gap-3 rounded-full bg-wa px-7 py-3.5 font-semibold text-fondo transition hover:brightness-110">
            <Whatsapp className="h-5 w-5" />
            Escribime por WhatsApp
          </a>
        </section>

        <footer className="mt-10 text-center text-xs text-suave">Matías Trovato · Merlo, San Luis</footer>
      </main>
    </>
  );
}
