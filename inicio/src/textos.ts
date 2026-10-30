// La página de Matías: arriba la oferta, después rubros, cómo trabaja, el abono, lo que ya hizo y preguntas.
// Sin precios publicados: se pasan según lo que pida cada uno (decidido el 30/10).

export const captura = (nombre: string) => `./inicio/${nombre}.webp`;

export const MENSAJE = "Hola Matías! Vi tus páginas y quiero una para mi negocio.";
export const MENSAJE_DIAGNOSTICO = "Hola Matías! Quiero el diagnóstico gratis de cómo aparece mi negocio en Google. Mi negocio es:";
export const MENSAJE_OTRO_RUBRO = "Hola Matías! Mi rubro no está en tu página, pero quiero una para mi negocio. Es:";

export const PORTADA = {
  titulo: ["Tu negocio,", "en el celular", "de tus clientes."],
  bajada: "Páginas web y apps a medida para comercios, emprendedores y profesionales de todo el país. Trabajo a distancia.",
  garantia: "Pagás la mitad para arrancar y el resto cuando tu página ya está publicada.",
  extras: ["Dominio a tu nombre", "Sin permanencia", "Presupuesto sin compromiso"],
  // Los tres celulares de la portada, como en el flyer
  muestras: [
    { id: "autoshine", titulo: "Páginas web", alt: "Captura de la página de AutoShine", color: "bg-acento text-[#1d0c04]" },
    { id: "sumapuntos", titulo: "Puntos", alt: "Captura de Sumapuntos, el programa de puntos", color: "bg-verde text-[#f1f6ef]" },
    { id: "mojonapp", titulo: "Sistemas", alt: "Captura de MojonApp con lotes sobre el mapa", color: "bg-azul text-[#eef4f6]" },
  ],
};

export interface Ejemplo {
  nombre: string;
  /** Qué es, para que nadie confunda un ejemplo o una propuesta con un cliente */
  tipo: "cliente" | "app" | "ejemplo" | "propuesta";
  href: string;
}

export const RUBROS: { id: string; titulo: string; texto: string; color: string; ejemplos: Ejemplo[] }[] = [
  {
    id: "autos",
    titulo: "Talleres y estética de autos",
    texto: "El cliente elige el servicio y el horario, y el turno te llega armado al WhatsApp.",
    color: "bg-acento text-[#1d0c04]",
    ejemplos: [{ nombre: "AutoShine", tipo: "cliente", href: "https://autoshine.com.ar" }],
  },
  {
    id: "inmobiliarias",
    titulo: "Inmobiliarias",
    texto: "Tus propiedades y lotes sobre el mapa, y un sistema para seguir clientes y ventas.",
    color: "bg-azul text-[#eef4f6]",
    ejemplos: [{ nombre: "MojonApp", tipo: "app", href: "#apps" }],
  },
  {
    id: "locales",
    titulo: "Locales con clientes que vuelven",
    texto: "Un programa de puntos para que vuelvan, y la carta o los precios siempre al día en el celular.",
    color: "bg-verde text-[#f1f6ef]",
    ejemplos: [
      { nombre: "Sumapuntos", tipo: "app", href: "#apps" },
      { nombre: "Casa Tala", tipo: "ejemplo", href: "./casa-tala/" },
    ],
  },
  {
    id: "turismo",
    titulo: "Cabañas y turismo",
    texto: "Fotos, fechas y consultas directo a tu WhatsApp, sin pagarle comisión a ninguna aplicación.",
    color: "bg-tinta text-fondo",
    ejemplos: [
      { nombre: "Cielo de Piedra", tipo: "ejemplo", href: "./cabanas/" },
      { nombre: "Propuestas", tipo: "propuesta", href: "#propuestas" },
    ],
  },
];

export const NOMBRE_TIPO: Record<Ejemplo["tipo"], string> = {
  cliente: "cliente",
  app: "app propia",
  ejemplo: "ejemplo",
  propuesta: "propuesta",
};

export const PASOS = [
  { titulo: "Me contás", texto: "Por WhatsApp: qué hace tu negocio, qué querés que haga la página y, si tenés, tus fotos y tu Instagram." },
  { titulo: "Te paso el presupuesto", texto: "Sin compromiso, según lo que necesites. Si te cierra, arrancamos." },
  { titulo: "La armo y la ajustamos", texto: "Con la seña del 50% empiezo. La ves andando en tu celular y la ajustamos juntos antes de publicarla." },
  { titulo: "Se publica", texto: "Queda en línea con tu dominio, y recién ahí pagás el resto." },
];

// Lo que trae cada página
export const INCLUYE = [
  { titulo: "Pensada para el celular", texto: "Casi todos van a entrar desde el teléfono. Se diseña primero para eso." },
  { titulo: "Consultas a tu WhatsApp", texto: "Turnos, reservas o pedidos te llegan armados, sin que el cliente tenga que escribir." },
  { titulo: "Te encuentran en Google", texto: "Página propia y ficha en Google Maps, para el que todavía no te conoce." },
  { titulo: "Tu dominio, a tu nombre", texto: "tunegocio.com.ar queda registrado a tu nombre. Es tuyo." },
  { titulo: "Probada antes de entregarla", texto: "Vengo del testing de software: la pruebo en celulares y computadoras antes de publicarla." },
  { titulo: "Hecha a medida", texto: "No es una plantilla. Se arma con tus fotos, tus colores y lo que necesita tu negocio." },
];

// El abono es opcional y sin permanencia; el dominio lo paga el cliente
export const ABONO = {
  titulo: "Después, si querés, me ocupo yo",
  texto: "Un abono mensual opcional y sin permanencia.",
  incluye: [
    "La mantengo en línea y reviso que ande",
    "Hasta 5 cambios por mes de textos, fotos o precios",
    "Soporte por WhatsApp",
  ],
  pagos: "Pagás por transferencia o Mercado Pago, y el abono puede ir por débito automático.",
  dominio: "El dominio lo pagás vos y queda a tu nombre. Yo lo configuro.",
};

export interface Trabajo {
  id: string;
  nombre: string;
  rubro: string;
  texto: string;
  /** Sin href, la tarjeta no es un link (las apps piden usuario para entrar) */
  href?: string;
}

export interface Seccion {
  id: string;
  titulo: string;
  /** Qué es cada página de la sección: va en la tarjeta, para que nadie la confunda con un cliente. */
  tipo: "cliente" | "app" | "ejemplo" | "propuesta";
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
    id: "apps",
    titulo: "Apps y sistemas",
    tipo: "app",
    etiqueta: "App propia",
    detalle: "Desarrollada por mí",
    nota: "Se usan con usuario y contraseña, por eso no tienen link. Si querés verlas andando, escribime y te las muestro.",
    trabajos: [
      {
        id: "sumapuntos",
        nombre: "Sumapuntos",
        rubro: "Programa de puntos para locales",
        texto: "Los clientes suman puntos en cada compra y vuelven por el premio. El local los carga en segundos desde la caja.",
      },
      {
        id: "mojonapp",
        nombre: "MojonApp",
        rubro: "Sistema para inmobiliarias",
        texto: "Clientes, ventas y los lotes dibujados sobre el mapa satelital.",
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

export const PREGUNTAS = [
  {
    p: "¿Cuánto sale?",
    r: "Depende de lo que necesites: no es lo mismo una página de una sola pantalla que una con turnos o un sistema. Me contás por WhatsApp y te paso el presupuesto sin compromiso.",
  },
  { p: "¿Cuánto tarda?", r: "Depende del tamaño. Lo acordamos antes de empezar, junto con el presupuesto." },
  {
    p: "Estoy en otra provincia, ¿se puede?",
    r: "Sí. Trabajo a distancia con negocios de todo el país: hablamos por WhatsApp y la vas viendo en tu celular.",
  },
  { p: "¿Cómo se paga?", r: "La mitad para arrancar y la otra mitad cuando la página está publicada, por transferencia o Mercado Pago." },
  {
    p: "¿Voy a aparecer en Google?",
    r: "La dejo preparada para que Google la encuentre y te ayudo con la ficha de Google Maps. El primer puesto no lo puede prometer nadie: si alguien te lo promete, desconfiá.",
  },
  { p: "¿La página es mía?", r: "Sí. El dominio lo pagás vos y queda registrado a tu nombre: la dirección es tuya." },
  {
    p: "¿Cómo pido cambios?",
    r: "Con el abono me escribís por WhatsApp y te hago hasta 5 cambios por mes de textos, fotos o precios. Sin abono también: me escribís y te paso el presupuesto del cambio.",
  },
];
