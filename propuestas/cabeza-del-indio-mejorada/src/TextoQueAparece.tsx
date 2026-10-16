// Adaptado de "Text Reveal" de Magic UI (Dillion Verma, 21st.dev).
// Cambios: las palabras destacadas van en el color de la página, la letra es la de los títulos,
// el tramo es más corto en celular y, con las animaciones desactivadas, el texto se ve entero.
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

interface Props {
  /** Partes del texto; las marcadas con true van en el color de acento. */
  partes: [string, boolean?][];
}

export default function TextoQueAparece({ partes }: Props) {
  const tramo = useRef<HTMLDivElement>(null);
  const quieto = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: tramo, offset: ["start start", "end end"] });
  const palabras = partes.flatMap(([texto, destacado]) =>
    texto
      .split(" ")
      .filter(Boolean)
      .map((p) => ({ p, destacado: !!destacado })),
  );

  return (
    <div ref={tramo} className={quieto ? "relative" : "relative h-[170vh] md:h-[200vh]"} data-libre>
      <div className={quieto ? "" : "sticky top-0 flex h-[100svh] items-center"}>
        <p aria-label={partes.map(([t]) => t).join("")} className="font-display mx-auto flex max-w-6xl flex-wrap px-5 py-16 text-[2.4rem] leading-[1.12] md:px-10 md:text-7xl md:leading-[1.08]">
          {palabras.map(({ p, destacado }, i) => (
            <Palabra key={i} progreso={scrollYProgress} rango={[i / palabras.length, (i + 1) / palabras.length]} destacado={destacado} quieto={!!quieto}>
              {p}
            </Palabra>
          ))}
        </p>
      </div>
    </div>
  );
}

function Palabra({ children, progreso, rango, destacado, quieto }: { children: string; progreso: MotionValue<number>; rango: [number, number]; destacado: boolean; quieto: boolean }) {
  // Las palabras se encienden entre el 10 % y el 85 % del tramo: arriba y abajo queda aire para leer
  const opacidad = useTransform(progreso, [0.1 + rango[0] * 0.75, 0.1 + rango[1] * 0.75], [0, 1]);
  return (
    <span aria-hidden className="relative mr-[0.28em]">
      <span className="absolute opacity-15">{children}</span>
      <motion.span data-palabra style={{ opacity: quieto ? 1 : opacidad }} className={destacado ? "text-acento" : "text-tinta"}>
        {children}
      </motion.span>
    </span>
  );
}
