// La página de Matías, tipo Linktree: todas las páginas que hizo, cada una con una etiqueta que
// dice qué es. Sin precios publicados: se pasan según lo que pida cada uno.

export const captura = (nombre: string) => `./inicio/${nombre}.webp`;

export const MENSAJE = "Hola Matías! Vi tus páginas y quiero una para mi negocio.";

export interface Trabajo {
  id: string;
  nombre: string;
  rubro: string;
  texto: string;
  href: string;
}

export interface Seccion {
  id: string;
  titulo: string;
  /** Qué es cada página de la sección: va en la tarjeta, para que nadie la confunda con un cliente. */
  tipo: "cliente" | "ejemplo" | "propuesta";
  etiqueta: string;
  detalle: string;
  nota?: string;
  trabajos: Trabajo[];
}

export const SECCIONES: Seccion[] = [
  {
    id: "clientes",
    titulo: "Hecha para un cliente",
    tipo: "cliente",
    etiqueta: "Cliente",
    detalle: "Página real, funcionando",
    trabajos: [
      {
        id: "autoshine",
        nombre: "AutoShine",
        rubro: "Lavadero y estética de autos · Merlo",
        texto: "Los clientes piden turno en la página y el pedido le llega directo al WhatsApp.",
        href: "https://autoshine.com.ar",
      },
    ],
  },
  {
    id: "ejemplos",
    titulo: "Ejemplos",
    tipo: "ejemplo",
    etiqueta: "Ejemplo",
    detalle: "Negocio inventado · Fotos de internet",
    nota: "Negocios que no existen, hechos para mostrar distintos estilos. Las fotos son de internet.",
    trabajos: [
      {
        id: "cabanas",
        nombre: "Cabañas Cielo de Piedra",
        rubro: "Cabañas",
        texto: "Los huéspedes consultan fechas por WhatsApp, sin pagar comisión a ninguna aplicación.",
        href: "./cabanas/",
      },
      {
        id: "casa-tala",
        nombre: "Casa Tala",
        rubro: "Café y bar",
        texto: "Muestra la carta en el celular y cambia sola: de día café, de noche bar.",
        href: "./casa-tala/",
      },
    ],
  },
  {
    id: "propuestas",
    titulo: "Propuestas para negocios de Merlo",
    tipo: "propuesta",
    etiqueta: "Propuesta",
    detalle: "No la encargaron · Fotos de sus redes",
    nota: "Las armé para mostrar cómo podría ser la página de negocios de acá. No las encargaron ni son sus páginas oficiales, y las fotos están sacadas de sus redes.",
    trabajos: [
      {
        id: "mirador-de-los-condores",
        nombre: "Mirador de los Cóndores",
        rubro: "Circuito de aventura",
        texto: "Muestra el recorrido con fotos y el turno se reserva por WhatsApp.",
        href: "./propuestas/mirador-de-los-condores/",
      },
      {
        id: "cabeza-del-indio",
        nombre: "Mirador Cabeza del Indio",
        rubro: "Restaurante y laberinto",
        texto: "Muestra la comida, el laberinto y el refugio, y la reserva llega por WhatsApp.",
        href: "./propuestas/cabeza-del-indio/",
      },
      {
        id: "hosteria-vegetariana",
        nombre: "Hostería Vegetariana",
        rubro: "Hostería y retiros",
        texto: "Muestra la estadía y los próximos retiros, y la consulta llega por WhatsApp.",
        href: "./propuestas/hosteria-vegetariana/",
      },
    ],
  },
];
