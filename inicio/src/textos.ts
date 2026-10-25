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
    titulo: "Propuestas para negocios reales",
    tipo: "propuesta",
    etiqueta: "Propuesta",
    detalle: "No la encargaron · Fotos de sus redes",
    nota: "Las armé para mostrar cómo podría ser la página de negocios reales de Merlo. No las encargaron ni son sus páginas oficiales, y las fotos están sacadas de sus redes.",
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

// Lo que trae cada página y cómo se trabaja: los textos de la página de venta anterior
export const INCLUYE = [
  { titulo: "Pensada para el celular", texto: "Casi todos van a entrar desde el teléfono. Se diseña primero para eso." },
  { titulo: "Consultas a tu WhatsApp", texto: "Turnos, reservas o pedidos te llegan armados, sin que el cliente tenga que escribir." },
  { titulo: "Te encuentran en Google", texto: "Página propia y ficha en Google Maps, para el que todavía no te conoce." },
  { titulo: "Tu dominio, a tu nombre", texto: "tunegocio.com.ar queda registrado a tu nombre. Es tuyo." },
  { titulo: "Cambios incluidos", texto: "Cambió un precio, un horario o una foto: me escribís y lo actualizo." },
  { titulo: "Hecha a medida", texto: "No es una plantilla. Se arma con tus fotos, tus colores y lo que necesita tu negocio." },
];

export const PASOS = [
  { titulo: "Me contás", texto: "Me pasás tus fotos, tu Instagram y qué querés que haga la página." },
  { titulo: "Te la muestro", texto: "En pocos días la ves andando en tu celular y la ajustamos juntos." },
  { titulo: "Queda en línea", texto: "En alrededor de una semana, con tu dominio. Después me ocupo de que siga funcionando." },
];
