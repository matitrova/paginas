// Fondo de estrellas fijo detrás de toda la página. Cuanto más rápido se
// scrollea (o mientras se abre la portada), más se estiran: salto al hiperespacio.
// Con "reducir movimiento" quedan quietas.
import { useEffect, useRef } from "react";

interface Estrella {
  x: number; // -1..1 desde el centro
  y: number;
  z: number; // profundidad: 1 lejos, ~0 cerca
}

const CANTIDAD = 420;

const nueva = (): Estrella => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.9 + 0.1 });

export default function Estrellas() {
  const lienzo = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const estrellas = Array.from({ length: CANTIDAD }, nueva);
    let ancho = 0;
    let alto = 0;
    let impulso = 0; // velocidad extra que dan el scroll y la rueda
    let ultimoY = window.scrollY;
    let cuadro = 0;

    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const alScrollear = () => {
      impulso = Math.min(impulso + Math.abs(window.scrollY - ultimoY) * 0.0006, 0.06);
      ultimoY = window.scrollY;
    };
    // La portada bloquea el scroll mientras se abre: la rueda igual acelera.
    const alGirar = (e: WheelEvent) => {
      impulso = Math.min(impulso + Math.abs(e.deltaY) * 0.00004, 0.06);
    };

    const dibujar = () => {
      ctx.clearRect(0, 0, ancho, alto);
      const cx = ancho / 2;
      const cy = alto / 2;
      const velocidad = quieto ? 0 : 0.0006 + impulso;
      for (const e of estrellas) {
        const zAntes = e.z;
        e.z -= velocidad;
        if (e.z <= 0.02) Object.assign(e, nueva(), { z: 1 });
        const px = cx + (e.x / e.z) * cx;
        const py = cy + (e.y / e.z) * cy;
        if (px < 0 || px > ancho || py < 0 || py > alto) {
          Object.assign(e, nueva(), { z: 1 });
          continue;
        }
        const brillo = Math.min(1, (1 - e.z) * 1.4);
        const tamano = Math.max(0.4, (1 - e.z) * 2.2);
        if (impulso > 0.004) {
          // estela: desde donde estaba la estrella un instante antes
          const qx = cx + (e.x / zAntes) * cx;
          const qy = cy + (e.y / zAntes) * cy;
          ctx.strokeStyle = `rgba(196, 181, 253, ${brillo})`;
          ctx.lineWidth = tamano;
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(px, py);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${brillo})`;
          ctx.fillRect(px, py, tamano, tamano);
        }
      }
      impulso *= 0.94;
      if (!quieto) cuadro = requestAnimationFrame(dibujar);
    };

    medir();
    dibujar();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", alScrollear, { passive: true });
    window.addEventListener("wheel", alGirar, { passive: true });
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("wheel", alGirar);
    };
  }, []);

  return <canvas ref={lienzo} className="pointer-events-none fixed inset-0 -z-10 h-full w-full" aria-hidden="true" />;
}
