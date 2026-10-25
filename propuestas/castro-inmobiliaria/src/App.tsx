import { motion } from "framer-motion";
import CintaPropuesta from "../../../compartido/CintaPropuesta";
import { contacto } from "../../../compartido/contacto";
import { CAIDA, CARTERA, CONTACTO, DOMINIO, DONDE, foto, INCLUYE, NEGOCIO, NOTA_FOTOS, PANTALLA, PUBLICACIONES, TELEFONO, TERRENOS } from "./textos";

const aparece = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

/** La pantalla que ve hoy cualquiera que entra. Dibujada, no una captura:
 *  así se ve igual en cualquier pantalla y no depende de una imagen. */
function PantallaDeError() {
  return (
    <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-[0_18px_50px_-24px_rgb(29_27_23/0.5)]">
      <div className="flex items-center gap-2 border-b border-linea bg-papel-hondo px-3 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="block h-2.5 w-2.5 rounded-full bg-[#e5574b]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#e5b04b]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#5bb85b]" />
        </span>
        <span className="ml-2 flex-1 truncate rounded bg-white px-2.5 py-1 text-[11px] text-suave">
          🔓 {DOMINIO}
        </span>
      </div>
      <div className="px-6 py-8 sm:px-10 sm:py-11">
        <div className="mb-5 text-4xl" aria-hidden="true">⚠️</div>
        <h3 className="font-sans text-xl font-semibold sm:text-2xl">{PANTALLA.titulo}</h3>
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

function Carta() {
  return (
    <header className="mx-auto max-w-2xl px-5 pt-20 pb-14 sm:pt-28">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-sierra uppercase">
        Para {CONTACTO} · {NEGOCIO}
      </p>
      <h1 className="font-display mt-5 text-[2rem] leading-[1.12] font-medium text-balance sm:text-5xl">
        Mauro, tu página está caída.
      </h1>
      <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-tinta/85">
        <p>
          Te escribo por eso, antes que por cualquier otra cosa. Desde el{" "}
          <b className="font-semibold">{CAIDA.vencio}</b> —hace {CAIDA.dias} días— el que entra a{" "}
          {DOMINIO} no ve la página: ve una pantalla roja que le dice que el sitio no es seguro.
        </p>
        <p>
          No es que esté lenta ni que se vea mal. <b className="font-semibold">No se puede entrar.</b> Ni
          escribiendo el dominio con www ni sin www.
        </p>
        <p className="text-suave">
          Me di cuenta de casualidad y me pareció que alguien te lo tenía que decir.
        </p>
      </div>
    </header>
  );
}

function Diagnostico() {
  return (
    <section className="border-y border-linea bg-papel-hondo/60 py-16">
      <div className="mx-auto max-w-2xl px-5">
        <motion.div {...aparece}>
          <PantallaDeError />
        </motion.div>
        <motion.div {...aparece} className="mt-10 space-y-4 text-[17px] leading-relaxed text-tinta/85">
          <p>
            El motivo es chico: el certificado de seguridad de tu dominio venció y no se renovó solo.
            Lo emite {CAIDA.emisor} y se renueva cada tres meses. Esta vez no pasó.
          </p>
          <p>
            <b className="font-semibold">Esto lo arregla quien te hizo la página, en una tarde.</b> Pasale
            este mensaje y listo, no hace falta que me contrates para eso. Te dejo abajo cómo explicárselo.
          </p>
        </motion.div>
        <motion.div {...aparece} className="mt-8 rounded-xl border border-linea bg-white p-5 sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-suave uppercase">
            Para pasarle a quien maneja el sitio
          </p>
          <p className="mt-3 font-mono text-[13px] leading-relaxed text-tinta/90">
            El certificado SSL de {DOMINIO} venció el {CAIDA.vencio}. Hay que renovarlo y revisar por qué
            falló la renovación automática de {CAIDA.emisor}. El error que devuelve es «{CAIDA.error}», y
            afecta a los dos dominios, con www y sin www.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/** Sus propias fotos, detras de la pantalla de error. Son el argumento:
 *  el trabajo esta hecho y cargado, y hoy no se ve. */
function Detras() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
      <motion.div {...aparece} className="mx-auto max-w-2xl">
        <h2 className="font-display text-[1.7rem] leading-tight font-medium text-balance sm:text-4xl">
          Detr&aacute;s de esa pantalla est&aacute; todo esto.
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-tinta/85">
          {CARTERA.total} propiedades cargadas, con sus fotos, sus medidas y sus precios. El trabajo
          est&aacute; hecho. Estas son ocho.
        </p>
      </motion.div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {PUBLICACIONES.map((pub, i) => (
          <motion.figure
            key={pub.n}
            {...aparece}
            transition={{ ...aparece.transition, delay: Math.min(i, 7) * 0.05 }}
            className="overflow-hidden rounded-lg border border-linea bg-papel-hondo"
          >
            <img
              src={foto(pub.n)}
              alt={`${pub.titulo} en ${pub.donde}`}
              width={900}
              height={900}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full max-w-full object-cover"
            />
            <figcaption className="px-3 py-2.5">
              <p className="text-[13px] leading-snug font-medium">{pub.titulo}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-suave">{pub.donde}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>

      <motion.p {...aparece} className="mx-auto mt-10 max-w-2xl text-[17px] leading-relaxed text-tinta/85">
        Ninguna de estas se puede ver desde el {CAIDA.vencio}. No porque falte cargarlas: porque la puerta
        de entrada est&aacute; cerrada.
      </motion.p>
    </section>
  );
}

function Ahora() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
      <motion.div {...aparece}>
        <h2 className="font-display text-[1.7rem] leading-tight font-medium text-balance sm:text-4xl">
          Ahora sí, lo otro que te quería mostrar.
        </h2>
        <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-tinta/85">
          <p>
            Me llamó la atención que una inmobiliaria con {CARTERA.total} propiedades publicadas esté tres
            días caída y nadie lo note. No es que te hayan hecho una mala página: es que no hay nadie
            mirándola.
          </p>
          <p>
            Yo hago páginas y las miro. Si algo se cae, me entero el mismo día. Eso es la mitad de lo que
            te estoy ofreciendo; la otra mitad es la página en sí.
          </p>
          <p className="text-suave">
            Tus propiedades las seguís cargando donde las cargás hoy. Eso no lo toco.
          </p>
        </div>
      </motion.div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-linea bg-linea sm:grid-cols-2">
        {INCLUYE.map((item) => (
          <motion.div key={item.titulo} {...aparece} className="bg-papel p-6">
            <h3 className="font-display text-xl font-medium">{item.titulo}</h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-suave">{item.texto}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Terrenos() {
  return (
    <section className="border-t border-linea bg-sierra py-16 text-papel sm:py-20">
      <div className="mx-auto max-w-2xl px-5">
        <motion.div {...aparece}>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-papel/60 uppercase">
            Lo que no hace ningún otro
          </p>
          <h2 className="font-display mt-4 text-[1.7rem] leading-tight font-medium text-balance sm:text-4xl">
            Tus dos terrenos, mostrados como terrenos.
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-papel/85">
            <p>
              Una casa se vende con fotos. Un terreno no: el que lo mira quiere saber dónde termina, qué
              forma tiene y qué hay alrededor. Hoy, en cualquier portal, un terreno es un punto en un mapa
              y dos fotos de pasto.
            </p>
            <p>
              Yo armé un sistema que dibuja el lote con{" "}
              <b className="font-semibold text-papel">su forma real del catastro de San Luis</b>, sobre la
              foto satelital. Se ve el terreno, los vecinos, la calle y por dónde se entra.
            </p>
          </div>
        </motion.div>

        <motion.ul {...aparece} className="mt-9 space-y-2.5">
          {TERRENOS.map((t) => (
            <li key={t} className="flex items-start gap-3 text-[15px] text-papel/80">
              <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-papel/50" aria-hidden="true" />
              {t}
            </li>
          ))}
        </motion.ul>
        <motion.p {...aparece} className="mt-5 text-[14px] leading-relaxed text-papel/55">
          Son los dos que tenés publicados hoy. Con {CARTERA.casas} casas y {CARTERA.terrenos} terrenos,
          esto no te cambia el negocio — pero no lo tiene nadie más en Merlo, y el día que sumes un loteo
          ya está hecho.
        </motion.p>

        <motion.div {...aparece} className="mt-9">
          <a
            href="https://preview.mojonapp.pages.dev/propiedades"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full bg-papel px-6 py-3 text-[15px] font-semibold text-sierra transition hover:brightness-95"
          >
            Verlo funcionando →
          </a>
          <p className="mt-3 text-[13px] text-papel/50">
            Es una demostración con terrenos de ejemplo, para que veas cómo se ve.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Cierre() {
  const c = contacto(`Hola Matías! Soy ${CONTACTO} de ${NEGOCIO}. Vi lo de la página.`);
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <motion.div {...aparece}>
        <h2 className="font-display text-[1.7rem] leading-tight font-medium text-balance sm:text-4xl">
          Si te interesa, hablamos.
        </h2>
        <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-tinta/85">
          <p>
            Y si no, igual arreglá lo del certificado: cada día que pasa es gente que busca una propiedad
            en Merlo, llega a tu página y se vuelve.
          </p>
          <p>
            No te paso un precio acá porque depende de qué quieras. Escribime y lo vemos en cinco minutos.
          </p>
        </div>
        <a
          href={c.href}
          target={c.canal === "whatsapp" ? "_blank" : undefined}
          rel="noopener"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-sierra px-7 py-3.5 text-[15px] font-semibold text-papel transition hover:brightness-110"
        >
          Escribirle a Matías
        </a>
        <p className="mt-10 border-t border-linea pt-6 text-[13px] leading-relaxed text-suave">
          Matías Trovato · Hago páginas web en Merlo.
          <br />
          {NOTA_FOTOS}
        </p>
        <p className="mt-4 text-[12px] text-suave/70">
          Datos de {NEGOCIO} tomados de su propio sitio y de su ficha de Google el 25/10/2026:{" "}
          {TELEFONO} · {DONDE}.
        </p>
      </motion.div>
    </section>
  );
}

export default function App() {
  return (
    <main className="pt-8">
      <CintaPropuesta negocio={NEGOCIO} />
      <Carta />
      <Diagnostico />
      <Detras />
      <Ahora />
      <Terrenos />
      <Cierre />
    </main>
  );
}
