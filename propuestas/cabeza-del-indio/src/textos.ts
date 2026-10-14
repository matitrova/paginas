// Propuesta para Mirador Cabeza del Indio (Pasos Malos, Villa de Merlo, San Luis).
// Todos los datos salen de lo que el negocio publicó. Las fuentes están al lado de cada bloque.
// Lo que no publicaron (horario del restaurante, carta, valor del refugio) no se inventa: se consulta.

export const NEGOCIO = "Mirador Cabeza del Indio";
export const foto = (nombre: string) => `./fotos/${nombre}.webp`;

// Bio de @cabeza_del_indio (13/10/2026)
export const ESLOGAN = "El verdadero sabor a Tradición Argentina";
export const WHATSAPP_TEXTO = "266 430-4222";
export const INSTAGRAM = "https://www.instagram.com/cabeza_del_indio/";
export const INSTAGRAM_LABERINTO = "https://www.instagram.com/laberinto_tematico/";
// Ficha de Google Maps "El Mirador Cabeza Del Indio"
export const MAPA = "https://www.google.com/maps/search/?api=1&query=-32.3225822,-64.9795517";

// 7 hectáreas: posteo del 14/07/2026. Tres cocciones: su Facebook. Mirador 360: bio de Instagram.
// 5 km: Google Maps da 5,3 km desde la plaza. Cada parte dice si va destacada.
export const FRASE: [string, boolean?][] = [
  ["Siete hectáreas", true],
  [" de sierra, "],
  ["tres fuegos", true],
  [" y un mirador de "],
  ["360°", true],
  [", a "],
  ["5 km", true],
  [" del centro."],
];

// Los platos que nombraron en Cadena 3 (01/02/2021)
export const PLATOS = ["Chivito al disco", "Carne al pozo", "Carne rellena al horno de barro", "Asado", "Matambre"];

// El día, parada por parada. No hay hora para el almuerzo porque el horario del restaurante no está publicado.
export interface Parada {
  hora: string;
  foto: string;
  alt: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  /** El horario publicado, si lo hay: "10 a 19". */
  dato?: string;
}

export const PARADAS: Parada[] = [
  {
    // Reel del 29/01/2026 (publicación de verano)
    hora: "10 h",
    foto: foto("sendero"),
    alt: "Dos personas caminan por un sendero de piedra entre los árboles",
    etiqueta: "A la mañana",
    titulo: "El laberinto y los piletones",
    dato: "10 a 19",
    texto: "Un sendero por el bosque nativo que termina en piletones con agua del arroyo. En temporada, todos los días.",
  },
  {
    // Facebook del negocio y Cadena 3 (01/02/2021)
    hora: "Mediodía",
    foto: foto("picada"),
    alt: "Una tabla con quesos, fiambres y huevos sobre una mesa de madera, al aire libre",
    etiqueta: "Al mediodía",
    titulo: "La mesa criolla",
    texto: "Cocina criolla en tres cocciones: disco de arado, horno de barro y pozo. El chivito al disco se cocina entre tres y cuatro horas.",
  },
  {
    // Reel del 16/04/2026
    hora: "Sobremesa",
    foto: foto("te"),
    alt: "Una tetera de barro y cuencos con yuyos sobre una mesa de madera",
    etiqueta: "La sobremesa",
    titulo: "Té digestivo de yuyos",
    texto: "Al final del almuerzo llega un té con yuyos de la zona. Es el ritual de la casa.",
  },
  {
    // Reel de abril de 2026
    hora: "16 h",
    foto: foto("higos"),
    alt: "Higos en almíbar en un cuenco de vidrio",
    etiqueta: "A la tarde",
    titulo: "La casa de té",
    dato: "16 a 19",
    texto: "Mesa compartida, algo caliente y opciones dulces. De jueves a domingo.",
  },
];

// Reel del 29/01/2026 de @cabeza_del_indio y lo que se ve en los reels de @laberinto_tematico
export const LABERINTO = [
  "Sendero por el bosque nativo",
  "Esculturas de animales autóctonos y carteles de la flora",
  "Piletones con agua del arroyo al final del recorrido",
];
// Reel del 13/10/2026 de @laberinto_tematico
export const NOVEDAD = "Juegos con cuerda: tirolesa, puentes colgantes y red para trepar.";
// "Valores 2026", reel del 29/01/2026
export const ENTRADAS: [string, string][] = [
  ["Mayores", "$15.000"],
  ["De 3 a 10 años", "$12.000"],
  ["Residentes", "$10.000"],
];

// Las postales del predio, cada una con su leyenda
export const POSTALES = [
  { src: foto("camino"), alt: "La sierra y el monte desde el camino de Pasos Malos", leyenda: "Pasos Malos" },
  { src: foto("bosque"), alt: "Dos personas entre los árboles del bosque nativo", leyenda: "Bosque nativo" },
  { src: foto("hamaca"), alt: "Una hamaca colgada entre los árboles, sobre las piedras", leyenda: "La hamaca" },
  { src: foto("bandera"), alt: "La bandera argentina contra el cielo", leyenda: "Bandera en lo alto" },
  { src: foto("pileton"), alt: "Un piletón de agua verde entre las piedras", leyenda: "Los piletones" },
  { src: foto("carpintero"), alt: "Escultura de un pájaro carpintero en el laberinto", leyenda: "El laberinto" },
  { src: foto("te"), alt: "La tetera de barro del té digestivo", leyenda: "Té de yuyos" },
];

// Posteos del 14/07/2026 y del 28/08/2026
export const REFUGIO = "Un refugio de montaña dentro del predio, pensado para dos personas.";

// Lo que ellos reservan: almuerzos, cenas, casa de té y refugio (posteo del 14/07/2026)
export const RESERVAS = ["Almuerzo", "Cena", "Casa de té", "Refugio de montaña"];

export const HORARIOS = [
  { titulo: "Restaurante", texto: "Almuerzos y cenas, con reserva." },
  { titulo: "Casa de té", texto: "Jueves a domingo, de 16 a 19." },
  { titulo: "Laberinto y piletones", texto: "En temporada, todos los días de 10 a 19." },
];

export const PREGUNTAS = [
  { p: "¿Hay que reservar?", r: "Sí. Los almuerzos, las cenas y el refugio se reservan por WhatsApp o por teléfono. Si venís por el chivito al disco, avisanos al reservar." },
  { p: "¿El laberinto se paga aparte?", r: "Sí, tiene su propia entrada. Los valores publicados en enero de 2026 están más arriba; confirmá el valor actual al reservar." },
  { p: "¿Se puede ir con chicos?", r: "Sí. El laberinto tiene entrada para chicos de 3 a 10 años y juegos con cuerda: tirolesa, puentes colgantes y red para trepar." },
  { p: "¿Cuándo abre la casa de té?", r: "De jueves a domingo, de 16 a 19." },
  { p: "¿Cuánto sale comer?", r: "Te pasamos la carta y los valores actualizados por WhatsApp." },
];
