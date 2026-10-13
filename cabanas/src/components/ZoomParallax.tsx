// Adaptado de "Zoom Parallax" de Efferd (21st.dev).
// Cambios: título propio arriba y leyenda que entra cuando la foto central llena la pantalla,
// tamaños pensados también para celular vertical, carga diferida y colores de la página.
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface Foto {
  src: string;
  alt: string;
}

interface Props {
  /** La primera es la que termina a pantalla completa. Máximo 7. */
  fotos: Foto[];
  titulo: ReactNode;
  leyenda: string;
}

// Dónde arranca cada foto alrededor de la central (la 0 va al centro, sin clases extra)
const LUGARES = [
  "",
  "[&>div]:!-top-[30vh] [&>div]:!left-[5vw] [&>div]:!h-[30vh] [&>div]:!w-[35vw]",
  "[&>div]:!-top-[10vh] [&>div]:!-left-[25vw] [&>div]:!h-[45vh] [&>div]:!w-[20vw]",
  "[&>div]:!left-[27.5vw] [&>div]:!h-[25vh] [&>div]:!w-[25vw]",
  "[&>div]:!top-[27.5vh] [&>div]:!left-[5vw] [&>div]:!h-[25vh] [&>div]:!w-[20vw]",
  "[&>div]:!top-[27.5vh] [&>div]:!-left-[22.5vw] [&>div]:!h-[25vh] [&>div]:!w-[30vw]",
  "[&>div]:!top-[22.5vh] [&>div]:!left-[25vw] [&>div]:!h-[15vh] [&>div]:!w-[15vw]",
];

export default function ZoomParallax({ fotos, titulo, leyenda }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: contenedor, offset: ["start start", "end end"] });

  const scale4 = useTransform(scrollYProgress, [0, 1], [1, 4]);
  const scale5 = useTransform(scrollYProgress, [0, 1], [1, 5]);
  const scale6 = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const scale8 = useTransform(scrollYProgress, [0, 1], [1, 8]);
  const scale9 = useTransform(scrollYProgress, [0, 1], [1, 9]);
  const escalas = [scale4, scale5, scale6, scale5, scale6, scale8, scale9];

  const leyendaOpacidad = useTransform(scrollYProgress, [0.82, 1], [0, 1]);

  return (
    <>
    {/* El título va antes de la galería: adentro, las fotos lo tapaban */}
    <div className="px-6 pt-24 pb-4 text-center md:pt-32">{titulo}</div>
    <div ref={contenedor} className="relative h-[300vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {fotos.slice(0, 7).map(({ src, alt }, i) => (
          <motion.div key={src} style={{ scale: escalas[i] }} className={`absolute top-0 flex h-full w-full items-center justify-center ${LUGARES[i]}`}>
            <div className="relative h-[25vh] w-[25vw]">
              <img src={src} alt={alt} loading="lazy" className="h-full w-full rounded-[2px] object-cover" />
            </div>
          </motion.div>
        ))}

        <motion.p
          style={{ opacity: leyendaOpacidad }}
          className="pointer-events-none absolute inset-x-0 bottom-[14svh] z-10 px-6 text-center font-serif text-3xl text-white italic drop-shadow-[0_2px_18px_rgba(0,0,0,0.7)] md:text-5xl"
        >
          {leyenda}
        </motion.p>
      </div>
    </div>
    </>
  );
}
