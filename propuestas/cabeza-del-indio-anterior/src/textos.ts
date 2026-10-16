// Propuesta para Mirador Cabeza del Indio (Pasos Malos, Villa de Merlo, San Luis).
// Todos los datos salen de lo que el negocio publicó. Las fuentes están al lado de cada bloque.
// Lo que no publicaron (horario del restaurante, carta, valor del refugio) no se inventa: se consulta.

import type { Etapa } from "./Etapas";

export const NEGOCIO = "Mirador Cabeza del Indio";
// Versión anterior, guardada para comparar: usa las fotos de la versión actual
export const foto = (nombre: string) => `../cabeza-del-indio/fotos/${nombre}.webp`;

// Bio de @cabeza_del_indio (13/10/2026)
export const ESLOGAN = "El verdadero sabor a Tradición Argentina";
export const WHATSAPP_TEXTO = "266 430-4222";
export const INSTAGRAM = "https://www.instagram.com/cabeza_del_indio/";
export const INSTAGRAM_LABERINTO = "https://www.instagram.com/laberinto_tematico/";
// Ficha de Google Maps "El Mirador Cabeza Del Indio"
export const MAPA = "https://www.google.com/maps/search/?api=1&query=-32.3225822,-64.9795517";

// 7 hectáreas: posteo del 14/07/2026. Tres cocciones: su Facebook. Mirador 360: bio de Instagram.
// 5 km: Google Maps da 5,3 km desde la plaza.
export const DATOS: [string, string][] = [
  ["7 ha", "de predio privado en la sierra"],
  ["3 fuegos", "disco de arado, horno de barro y pozo"],
  ["360°", "de vista desde el mirador"],
  ["16 a 19", "casa de té, de jueves a domingo"],
];

// La cinta va con palabras de ellos: hashtags del 12/02 y el 16/04/2026, posteos del 18/07 y el 24/07/2026
export const PLATOS = ["Cocina criolla", "Bodegón de montaña", "Mesa dulce", "Té de yuyos", "Almacén serrano"];

export const ETAPAS: Etapa[] = [
  {
    // Reel del 29/01/2026 (publicación de verano)
    foto: foto("sendero"),
    alt: "Dos personas caminan por un sendero de piedra entre los árboles",
    etiqueta: "A la mañana",
    titulo: "El laberinto y los piletones",
    dato: "10 a 19",
    texto: "Un sendero por el bosque nativo que termina en piletones con agua del arroyo. En temporada, todos los días.",
  },
  {
    // Facebook del negocio y posteo del 18/07/2026
    foto: foto("picada"),
    alt: "Una tabla con quesos, fiambres y huevos sobre una mesa de madera, al aire libre",
    etiqueta: "Al mediodía",
    titulo: "La mesa criolla",
    texto: "Cocina criolla en tres cocciones: disco de arado, horno de barro y pozo. Platos abundantes y mesa dulce.",
  },
  {
    // Reel del 16/04/2026
    foto: foto("te"),
    alt: "Una tetera de barro y cuencos con yuyos sobre una mesa de madera",
    etiqueta: "La sobremesa",
    titulo: "Té digestivo de yuyos",
    texto: "Al final del almuerzo llega un té con yuyos de la zona. Es el ritual de la casa.",
  },
  {
    // Reel de abril de 2026
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
  "Un recorrido diferente, en contacto con la naturaleza",
  "Piletones con agua del arroyo al final del recorrido",
];
// Reel del 13/10/2026 de @laberinto_tematico
export const NOVEDAD = "Juegos con cuerda: tirolesa, puentes colgantes y red para trepar (fin de semana largo de octubre de 2026).";
// "Valores 2026", reel del 29/01/2026
export const ENTRADAS: [string, string][] = [
  ["Mayores", "$15.000"],
  ["De 3 a 10 años", "$12.000"],
  ["Residentes", "$10.000"],
];

// La primera es la que termina a pantalla completa. Máximo 7.
export const GALERIA = [
  { src: foto("camino"), alt: "La sierra y el monte desde el camino de Pasos Malos" },
  { src: foto("bosque"), alt: "Dos personas entre los árboles del bosque nativo" },
  { src: foto("hamaca"), alt: "Una hamaca colgada entre los árboles, sobre las piedras" },
  { src: foto("bandera"), alt: "La bandera argentina contra el cielo" },
  { src: foto("pileton"), alt: "Un piletón de agua verde entre las piedras" },
  { src: foto("carpintero"), alt: "Escultura de un pájaro carpintero en el laberinto" },
  { src: foto("te"), alt: "La tetera de barro del té digestivo" },
];

// Posteos del 14/07/2026 y del 28/08/2026
export const REFUGIO = "Un refugio de montaña dentro del predio, pensado para dos personas.";

// Lo que se reserva por WhatsApp o teléfono: almuerzos, cenas y refugio (posteos del 14/07 y el 16/04/2026)
export const RESERVAS = ["Almuerzo", "Cena", "Refugio de montaña"];

export const HORARIOS = [
  { titulo: "Restaurante", texto: "Almuerzos y cenas. Reservas al 2664 304222." },
  { titulo: "Casa de té", texto: "Jueves a domingo, de 16 a 19." },
  { titulo: "Laberinto y piletones", texto: "En temporada, todos los días de 10 a 19." },
];

export const PREGUNTAS = [
  { p: "¿Cómo se reserva?", r: "Los almuerzos, las cenas y el refugio se reservan por WhatsApp o por teléfono al 2664 304222." },
  { p: "¿El laberinto se paga aparte?", r: "Sí, tiene su propia entrada. Los valores publicados en enero de 2026 están más arriba; confirmá el valor actual al reservar." },
  { p: "¿Se puede ir con chicos?", r: "Sí. El laberinto tiene entrada para chicos de 3 a 10 años." },
  { p: "¿Cuándo abre la casa de té?", r: "En abril de 2026 publicaron de jueves a domingo, de 16 a 19. Confirmalo antes de ir." },
  { p: "¿Cuánto sale comer?", r: "La carta con precios no está publicada. Consultá por WhatsApp al 2664 304222." },
];
