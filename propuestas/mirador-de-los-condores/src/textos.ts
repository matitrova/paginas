// Propuesta para Mirador de los Cóndores (Circuito Aventura), Merlo, San Luis.
// Todos los datos salen de lo que el negocio publicó. Las fuentes están al lado de cada bloque.
// Lo que no publicaron (precio, edad mínima) no se inventa: la página manda a consultarlo.

export const NEGOCIO = "Mirador de los Cóndores";
export const foto = (nombre: string) => `./fotos/${nombre}.webp`;

// Bio de @miradordeloscondores (13/10/2026)
export const WHATSAPP_TEXTO = "266 488-3207";
export const INSTAGRAM = "https://www.instagram.com/miradordeloscondores/";
// Coordenadas que publican en su Facebook (facebook.com/condoresaventura)
export const MAPA = "https://www.google.com/maps/search/?api=1&query=-32.403410,-64.933184";

// Su descripción del circuito, repetida en los posteos del 7 y el 12/10/2026:
// instagram.com/miradordeloscondores/p/DeM39TqCfle/
export const DURACION = "2\u00a0horas"; // con espacio duro, para que el título no corte entre el número y la palabra

export interface Tramo {
  foto: string;
  alt: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  /** El número que se destaca en el tramo: "70 m". */
  dato?: string;
}

export const TRAMOS: Tramo[] = [
  {
    foto: foto("tirolesa"),
    alt: "Una persona cruza el lago colgada de la tirolesa",
    etiqueta: "Tirolesas",
    titulo: "Volás sobre el lago",
    dato: "+1000 m",
    texto: "Tres tramos de tirolesa que atraviesan un lago y parte de la quebrada.",
  },
  {
    foto: foto("balcones"),
    alt: "Un grupo camina por el filo, con el valle abajo",
    etiqueta: "Senderos",
    titulo: "Los balcones de la quebrada",
    texto: "Una caminata por todos los balcones de los senderos de la quebrada, hasta llegar a los puentes.",
  },
  {
    foto: foto("puentes"),
    alt: "Dos personas cruzan un puente colgante con todo el valle debajo",
    etiqueta: "Puentes colgantes",
    titulo: "Cruzás en el aire",
    dato: "30 y 70 m",
    texto: "Dos puentes colgantes, uno a 30 metros de altura y otro a 70.",
  },
  {
    foto: foto("escalada"),
    alt: "Varias personas escalan una pared de roca",
    etiqueta: "Escalada",
    titulo: "Y terminás trepando",
    dato: "15 m",
    texto: "El circuito cierra con 15 metros de escalada en roca.",
  },
];

// Dos tiras de fotos que se cruzan al bajar
export const TIRAS = [
  [
    { src: foto("g-brazos"), alt: "Tres personas con los brazos en alto sobre el puente colgante" },
    { src: foto("g-nubes"), alt: "Una persona sobre el puente, entre las nubes" },
    { src: foto("g-arnes"), alt: "Una persona con arnés y casco en la tirolesa" },
    { src: foto("g-mar"), alt: "El filo de la sierra sobre un mar de nubes" },
    { src: foto("tirolesa"), alt: "Una persona cruza el lago colgada de la tirolesa" },
    { src: foto("camino"), alt: "El camino de montaña que sube al filo" },
  ],
  [
    { src: foto("g-valle"), alt: "El valle visto desde el puente" },
    { src: foto("g-puente"), alt: "El puente colgante visto desde adentro" },
    { src: foto("g-cima"), alt: "Un grupo en la cima" },
    { src: foto("balcones"), alt: "Un grupo camina por el filo, con el valle abajo" },
    { src: foto("escalada"), alt: "Varias personas escalan una pared de roca" },
    { src: foto("puentes"), alt: "Dos personas cruzan un puente colgante" },
  ],
];

// Mismos posteos de octubre de 2026
export const CUANDO = [
  { titulo: "Vacaciones de invierno y de verano", texto: "Todos los días." },
  { titulo: "El resto del año", texto: "Viernes, sábados, domingos y feriados." },
];
export const TURNOS = ["11:00", "13:00", "15:00", "16:00"];

// agenciasanluis.com (19/11/2021), visitarsanluis.com y villademerlo.tur.ar/experiencias-de-aventura/
export const TAMBIEN = [
  { titulo: "Confitería", texto: "Para llegar antes o quedarse después, con el valle del otro lado del vidrio." },
  { titulo: "Cabalgatas", texto: "Salidas a caballo por la quebrada." },
  { titulo: "Parapente", texto: "Vuelos biplaza con instructor, desde el filo." },
];

export const PREGUNTAS = [
  { p: "¿Hay que reservar?", r: "Sí. La actividad se hace solo con reserva previa, por WhatsApp." },
  { p: "¿Cuánto dura?", r: "El circuito completo dura aproximadamente 2 horas." },
  { p: "¿Es para toda la familia?", r: "Está diseñado para toda la familia. Si vas con chicos, consultanos por la edad mínima al reservar." },
  { p: "¿Cuánto sale?", r: "Te pasamos el valor actualizado por WhatsApp cuando reservás." },
  { p: "¿Qué llevo?", r: "Arriba hace más frío y hay viento, incluso en verano: llevá abrigo y calzado cerrado." },
];
