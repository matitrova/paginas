// Adaptado de "Draggable Card" de Aceternity UI (Manu Arora, 21st.dev).
// Cambios: las postales quedan dentro de su recuadro (en celular no se pierden fuera de la pantalla),
// cada una arranca torcida y apilada, y la inclinación 3D sigue al mouse solo donde hay mouse.
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode, type RefObject } from "react";

const RESORTE = { stiffness: 100, damping: 20, mass: 0.5 };
// Con drag en los dos ejes framer-motion pone touch-action: none y la mesa atrapa el scroll en el celular
const TACTIL = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

export function Postal({ limites, giro, lugar, className = "", children }: { limites: RefObject<HTMLDivElement | null>; giro: number; lugar: { left: string; top: string }; className?: string; children: ReactNode }) {
  const tarjeta = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-300, 300], [25, -25]), RESORTE);
  const rotateY = useSpring(useTransform(mx, [-300, 300], [-25, 25]), RESORTE);
  const brillo = useSpring(useTransform(mx, [-300, 0, 300], [0.2, 0, 0.2]), RESORTE);

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = tarjeta.current!.getBoundingClientRect();
    mx.set(e.clientX - (r.left + r.width / 2));
    my.set(e.clientY - (r.top + r.height / 2));
  };
  const soltar = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={tarjeta}
      drag={TACTIL ? "x" : true}
      dragConstraints={limites}
      dragElastic={0.15}
      whileHover={{ scale: 1.03 }}
      whileDrag={{ scale: 1.06, zIndex: 50, cursor: "grabbing" }}
      onPointerMove={mover}
      onPointerLeave={soltar}
      initial={{ rotate: giro }}
      style={{ ...lugar, rotateX, rotateY, willChange: "transform" }}
      className={`absolute cursor-grab overflow-hidden bg-[#fffdf7] p-2.5 pb-0 shadow-[0_24px_48px_-20px_rgba(42,28,18,0.75)] [transform-style:preserve-3d] ${className}`}
    >
      {children}
      <motion.div style={{ opacity: brillo }} className="pointer-events-none absolute inset-0 bg-white select-none" />
    </motion.div>
  );
}

export function Mesa({ className = "", children }: { className?: string; children: (limites: RefObject<HTMLDivElement | null>) => ReactNode }) {
  const limites = useRef<HTMLDivElement>(null);
  return (
    <div ref={limites} className={`relative [perspective:3000px] ${className}`}>
      {children(limites)}
    </div>
  );
}
