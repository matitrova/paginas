// Contenido de la página de venta. Sin precios publicados: se pasan según lo que pida cada uno.

export const captura = (nombre: string) => `./inicio/${nombre}.webp`;

export const EJEMPLOS = [
  {
    id: "autoshine",
    nombre: "AutoShine",
    rubro: "Estética vehicular",
    tipo: "Cliente real",
    href: "https://autoshine.com.ar",
    texto: "Un taller de detailing de Merlo. La portada se abre sobre el auto, los servicios cambian con un efecto de vidrio y los turnos le llegan armados al WhatsApp.",
    puntos: ["Turnos por WhatsApp", "Galería 3D con sus fotos", "Dominio propio"],
  },
  {
    id: "cabanas",
    nombre: "Cielo de Piedra",
    rubro: "Cabañas",
    tipo: "Página de ejemplo",
    href: "./cabanas/",
    texto: "Cálida y tranquila, con la sierra a pantalla completa. Quien la visita consulta fechas en tres toques, sin pasar por una plataforma que cobra comisión.",
    puntos: ["Consulta de fechas directa", "Cada cabaña con sus comodidades", "Galería que crece al bajar"],
  },
  {
    id: "casa-tala",
    nombre: "Casa Tala",
    rubro: "Café y bar",
    tipo: "Página de ejemplo",
    href: "./casa-tala/",
    texto: "De día es una cafetería y de noche un bar: la página cambia sola con la hora, con otra carta y otros colores.",
    puntos: ["Carta para leer en el celular", "Cartel de “abierto ahora”", "Reserva de mesa por WhatsApp"],
  },
];

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

export const PREGUNTAS = [
  { p: "¿Cuánto sale?", r: "Depende de lo que necesite tu negocio. Escribime, me contás qué tenés en mente y te paso el presupuesto sin compromiso." },
  {
    p: "Ya tengo Instagram, ¿para qué quiero una página?",
    r: "Instagram es para los que ya te siguen. La página es para el que te busca en Google sin conocerte. Y ahí los precios, la carta o los turnos no se pierden entre las publicaciones.",
  },
  { p: "¿Tengo que saber de computadoras?", r: "No. Me mandás los cambios por WhatsApp y los hago yo." },
  { p: "¿El dominio es mío?", r: "Sí. Se registra a tu nombre y es tuyo, aunque algún día dejemos de trabajar juntos." },
  { p: "¿Cuánto tarda?", r: "Alrededor de una semana desde que me pasás las fotos y los datos." },
];

export const PORTFOLIO = "https://matitrova.github.io/";
