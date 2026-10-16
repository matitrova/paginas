// Propuesta para Mirador Cabeza del Indio, versión mejorada.
// Todos los datos salen de lo que el negocio publicó. Las fuentes están al lado de cada bloque.
// Lo que no publicaron (horario del restaurante, carta, valor del refugio) no se inventa: se consulta.
// Lo que sale de prensa o de fotos y hay que confirmar con el dueño está marcado "confirmar".

export const NEGOCIO = "Mirador Cabeza del Indio";
// Usa las mismas fotos que la versión actual, sin duplicarlas
export const foto = (nombre: string) => `../cabeza-del-indio/fotos/${nombre}.webp`;

// Bio de @cabeza_del_indio (13/10/2026). El número, escrito como lo ponen en sus posteos.
export const ESLOGAN = "El verdadero sabor a Tradición Argentina";
export const TELEFONO_TEXTO = "2664 304222";
export const TELEFONO = "tel:+5492664304222";
export const INSTAGRAM = "https://www.instagram.com/cabeza_del_indio/";
export const INSTAGRAM_LABERINTO = "https://www.instagram.com/laberinto_tematico/";
// Coordenadas de la ficha de Google Maps: abre el recorrido desde donde está la persona
export const MAPA = "https://www.google.com/maps/dir/?api=1&destination=-32.3225822,-64.9795517";

// Lo de arriba de todo: dónde y cuándo, con lo publicado. Sin "abierto hoy": no hay horario del restaurante.
// Casa de té: reel de abril de 2026. Laberinto: reel del 29/01/2026 (verano). Reservas: posteo del 16/04/2026.
export const FICHA = [
  { titulo: "Dónde", texto: "Camino de Pasos Malos, a 5 km del centro de Merlo." },
  { titulo: "Restaurante", texto: "Almuerzos y cenas. Reservas al 2664 304222." },
  { titulo: "Casa de té", texto: "Jueves a domingo, de 16 a 19." },
  { titulo: "Laberinto y piletones", texto: "Horario publicado en enero de 2026: de 10 a 19. Entrada aparte." },
];

// 7 hectáreas: posteo del 14/07/2026. Tres cocciones: su Facebook. Mirador 360: bio de Instagram.
// 5 km: Google Maps da 5,3 km desde la plaza. "Recorrer sin apuro": posteo propio del 12/02/2026.
export const FRASE: [string, boolean?][] = [
  ["Siete hectáreas", true],
  [" de sierra, "],
  ["tres fuegos", true],
  [" y un mirador de "],
  ["360°", true],
  [", a "],
  ["5 km", true],
  [" del centro. Un lugar para recorrer "],
  ["sin apuro.", true],
];

// Los platos que nombraron en Cadena 3 (01/02/2021). Confirmar con el dueño que siguen en la carta.
export const PLATOS = ["Chivito al disco", "Carne al pozo", "Carne rellena", "Asado", "Matambre"];

// Los tres fuegos (Facebook propio). Solo se le pone plato al fuego cuando el nombre del plato lo dice:
// qué sale del horno de barro no está publicado por ellos.
export const FUEGOS = [
  { fuego: "Disco de arado", plato: "Chivito al disco", dibujo: "disco" },
  { fuego: "Horno de barro", plato: "Consultá qué sale hoy", dibujo: "horno" },
  { fuego: "Pozo", plato: "Carne vacuna al pozo", dibujo: "pozo" },
] as const;
export const CHIVITO = "El chivito al disco se cocina entre 3 y 4 horas.";
// Posteo del 24/07/2026
export const ALMACEN = "Almacén serrano con productos regionales y artesanales.";

// El día, parada por parada. No hay hora para el almuerzo porque el horario del restaurante no está publicado.
export interface Parada {
  hora: string;
  foto: string;
  alt: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  /** El horario publicado, si lo hay. */
  dato?: string;
  /** La parada del mediodía muestra los tres fuegos. */
  fuegos?: boolean;
}

export const PARADAS: Parada[] = [
  {
    // Reel del 29/01/2026 (publicación de verano)
    hora: "10 h",
    foto: foto("sendero"),
    alt: "Dos personas caminan por un sendero de piedra entre los árboles",
    etiqueta: "A la mañana",
    titulo: "El laberinto y los piletones",
    dato: "10 a 19 h · horario de verano",
    texto: "Un sendero por el bosque nativo que termina en piletones con agua del arroyo.",
  },
  {
    // Facebook del negocio
    hora: "Mediodía",
    foto: foto("picada"),
    alt: "Una tabla con quesos, fiambres y huevos sobre una mesa de madera, al aire libre",
    etiqueta: "Al mediodía",
    titulo: "La mesa criolla",
    texto: "Cocina criolla en tres fuegos.",
    fuegos: true,
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
    dato: "16 a 19 h · jueves a domingo",
    texto: "Mesa compartida, algo caliente y opciones dulces.",
  },
];

// Reel del 29/01/2026 de @cabeza_del_indio y lo que se ve en los reels de @laberinto_tematico
export const LABERINTO = [
  "Sendero por el bosque nativo",
  "Esculturas de animales autóctonos y carteles de la flora",
  "Piletones con agua del arroyo al final del recorrido",
];
// Reel del 13/10/2026 de @laberinto_tematico: fue para el fin de semana largo; no se sabe si quedan
export const NOVEDAD = "Juegos con cuerda: tirolesa, puentes colgantes y red para trepar (fin de semana largo de octubre de 2026).";
// "Valores 2026", reel del 29/01/2026. Para menores de 3 no publicaron valor.
export const ENTRADAS: [string, string][] = [
  ["Mayores", "$15.000"],
  ["De 3 a 10 años", "$12.000"],
  ["Menores de 3", "Consultá"],
  ["Residentes", "$10.000"],
];

// Posteos del 14/07/2026 y del 28/08/2026
export const REFUGIO = "Un refugio de montaña dentro del predio, pensado para dos personas.";
export const REFUGIO_DATOS = ["Para 2 personas", "Dentro del predio de 7 hectáreas", "Sierras de los Comechingones"];

// Lo que se reserva por WhatsApp o teléfono: almuerzos, cenas y refugio (posteos del 14/07 y el 16/04/2026)
export const RESERVAS = ["Almuerzo", "Cena", "Refugio de montaña"];
export const REFUGIO_OPCION = "Refugio de montaña";

// Las postales del final: se pueden arrastrar
export const POSTALES = [
  { src: foto("bosque"), alt: "Dos personas entre los árboles del bosque nativo", leyenda: "Bosque nativo" },
  { src: foto("hamaca"), alt: "Una hamaca colgada entre los árboles, sobre las piedras", leyenda: "La hamaca" },
  { src: foto("bandera"), alt: "La bandera argentina contra el cielo", leyenda: "Bandera en lo alto" },
  { src: foto("carpintero"), alt: "Escultura de un pájaro carpintero en el laberinto", leyenda: "El laberinto" },
];

export const PREGUNTAS = [
  { p: "¿Cómo se reserva?", r: "Los almuerzos, las cenas y el refugio se reservan por WhatsApp o por teléfono al 2664 304222." },
  { p: "¿El laberinto se paga aparte?", r: "Sí, tiene su propia entrada. Los valores publicados en enero de 2026 están más arriba; confirmá el valor actual antes de ir." },
  { p: "¿Se puede ir con chicos?", r: "Sí. El laberinto tiene entrada para chicos de 3 a 10 años." },
  { p: "¿Cuándo abre la casa de té?", r: "De jueves a domingo, de 16 a 19." },
  { p: "¿Cuánto sale comer?", r: "La carta con precios no está publicada. Consultá por WhatsApp al 2664 304222." },
];
