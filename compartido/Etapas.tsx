// Un recorrido en pasos. En pantallas grandes la foto queda fija y va cambiando mientras pasan
// los textos; en celular cada paso es su foto y su texto, uno abajo del otro.
// Usa los colores de la página que lo incluye: tinta, suave, acento, linea (ver su index.css).
import { useEffect, useRef, useState } from "react";

export interface Etapa {
  foto: string;
  alt: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  /** Un número o dato corto para destacar: "70 m", "16 a 19 h". */
  dato?: string;
}

export default function Etapas({ etapas }: { etapas: Etapa[] }) {
  const [activa, setActiva] = useState(0);
  const pasos = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Activo = el paso que cruza la mitad de la pantalla
    const io = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setActiva(Number((e.target as HTMLElement).dataset.paso))),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    pasos.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, []);

  return (
    <div className="md:grid md:grid-cols-2 md:gap-14">
      <div className="sticky top-0 hidden h-screen items-center py-16 md:flex">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          {etapas.map((e, i) => (
            <img
              key={e.foto}
              src={e.foto}
              alt={e.alt}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${i === activa ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
            />
          ))}
        </div>
      </div>

      <ol>
        {etapas.map((e, i) => (
          <li
            key={e.titulo}
            data-paso={i}
            ref={(el) => {
              pasos.current[i] = el;
            }}
            className="flex flex-col justify-center py-10 md:min-h-screen md:py-0"
          >
            <img src={e.foto} alt={e.alt} loading="lazy" className="mb-7 aspect-[4/5] w-full rounded-2xl object-cover md:hidden" />
            <p className="text-sm font-bold tracking-[0.22em] text-acento uppercase">
              {String(i + 1).padStart(2, "0")} · {e.etiqueta}
            </p>
            <h3 className="mt-3 font-display text-4xl leading-[1.02] text-tinta md:text-6xl">{e.titulo}</h3>
            {e.dato && <p className="mt-4 font-display text-6xl leading-none text-acento md:text-8xl">{e.dato}</p>}
            <p className="mt-5 max-w-md text-lg leading-relaxed text-suave">{e.texto}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
