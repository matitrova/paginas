// Propuesta para Hostería Vegetariana (Parque Los Nogales, Villa de Merlo, San Luis).
// Todos los datos salen de lo que el negocio publicó. Las fuentes están al lado de cada bloque.
// Lo que no publicaron (tarifas, estadía mínima, horarios) no se inventa: la página manda a consultarlo.
// No se usa lo que solo figuraba en su sitio de 2016 y puede haber cambiado (TV, horarios de entrada, desayuno).

export const NEGOCIO = "Hostería Vegetariana";
export const foto = (nombre: string) => `./fotos/${nombre}.webp`;

// Bio de @hosteriavegetariana (13/10/2026)
export const WHATSAPP_TEXTO = "11 6724-5129";
export const INSTAGRAM = "https://www.instagram.com/hosteriavegetariana/";
// Dirección de su Facebook y del listado municipal de alojamientos habilitados 2026
export const DIRECCION = "Cantata del Bosque Natal 2530, Parque Los Nogales";
export const MAPA = "https://www.google.com/maps/search/?api=1&query=Hoster%C3%ADa+Vegetariana%2C+Cantata+del+Bosque+Natal+2530%2C+Merlo%2C+San+Luis";

// 100% vegana: posteo "Nuestra Misión" (11/09/2026). 6 eco-aparts y 2013: nota de Revista Un Camino (05/09/2024).
// 3 km: su propia página de ubicación.
export const DATOS = ["Desde 2013", "6 eco-aparts", "100% vegana", "A 3 km de la plaza"];

// Posteo "Nuestra Misión" (11/09/2026) y posteo del 21/11/2025
export const MISION = "Somos veganos por decisión política, no por tendencia. Creemos que la empatía no debería tener fronteras de especie, y que cuidar a las personas, a los animales y a la tierra es una forma de habitar.";
export const UNICO = "El único alojamiento vegano de Argentina";

// La estadía en cuatro palabras: al tocar una cambian la foto y el texto
export interface Momento {
  palabra: string;
  foto: string;
  alt: string;
  titulo: string;
  texto: string;
}

export const MOMENTOS: Momento[] = [
  {
    // Nota de Revista Un Camino (05/09/2024) y su página de servicios
    foto: foto("galeria"),
    alt: "Una galería de piedra con piso de laja",
    palabra: "Dormir",
    titulo: "Eco-aparts de montaña",
    texto: "Seis eco-aparts de piedra, con balcón cubierto y vista al valle y a las sierras.",
  },
  {
    // Posteo "Nuestra Misión" (11/09/2026) y reel del 18/09/2026
    foto: foto("plato"),
    alt: "Un plato vegano con ensalada, cereales y verduras",
    palabra: "Comer",
    titulo: "Cocina casera y vegana",
    texto: "Con huerta propia, productores locales e ingredientes orgánicos de estación. Si tenés alguna alergia, adaptamos cada preparación.",
  },
  {
    // Reel del 16/07/2025 y agenda de retiros 2026/2027
    foto: foto("sala"),
    alt: "El techo de madera de la sala de práctica, con lámparas de papel",
    palabra: "Practicar",
    titulo: "Yoga, gong y cuencos",
    texto: "Una sala de madera equipada para clases de yoga, meditación y baños de gong.",
  },
  {
    // Reel del 16/07/2025 y posteo de la cosecha (29/11/2025)
    foto: foto("arroyo"),
    alt: "Un arroyo entre las piedras, en el monte",
    palabra: "Caminar",
    titulo: "Parque natural y frutales",
    texto: "Senderos para caminar entre las sierras, y frutales que en noviembre dan moras, higos, duraznos, manzanas, peras y damascos.",
  },
];

// Agenda publicada en su Instagram (septiembre y octubre de 2026)
export const RETIROS = [
  {
    dias: "5 – 8",
    mes: "Diciembre",
    cuando: "5 al 8 de diciembre",
    nombre: "Volver al Origen",
    texto: "Unos días para conectar con la naturaleza, reconocer lo que sentís y volver a lo esencial.",
  },
  {
    dias: "22 – 24",
    mes: "Enero 2027",
    cuando: "22 al 24 de enero de 2027",
    nombre: "Armá tu cocina vegana",
    texto: "Talleres de quesos vegetales, panes, untables y brotes. Con yoga, cuencos y gong, reconocimiento de aves nativas y senderismo.",
    con: "Con Gaby Mattei y Raquel Schrotlin",
  },
  {
    dias: "29 – 31",
    mes: "Enero 2027",
    cuando: "29 al 31 de enero de 2027",
    nombre: "Música Medicina 3",
    texto: "Yoga diario y yoga nidra, baños de gong y meditación con cuencos, automasaje, caminatas guiadas y ceremonia del cacao.",
    con: "Guiado por Gabriela Mattei y Patricia Manzione",
  },
  {
    dias: "19 – 21",
    mes: "Febrero 2027",
    cuando: "19 al 21 de febrero de 2027",
    nombre: "Convivencia de medicina del estilo de vida",
    texto: "Tres días de convivencia, con pensión completa.",
    con: "Con el Dr. Toto Viviani Rossi",
  },
];

// Su página "La hostería" (leída en Wayback Machine) y la bio de Instagram: energías renovables
export const MATERIALES = [
  { titulo: "Piedra", texto: "Muros exteriores de 40 centímetros." },
  { titulo: "Adobe", texto: "En las paredes interiores." },
  { titulo: "Laja y troncos", texto: "En los pisos y en los muebles." },
  { titulo: "Sol y viento", texto: "Paneles solares, molino eólico y termotanques solares para el agua caliente." },
];

// Las fotos van en tres columnas que suben a distinta velocidad, cada una con su leyenda
export const COLUMNAS = [
  [
    { src: foto("flores"), alt: "Un almendro en flor, con las sierras detrás", leyenda: "Almendros en flor" },
    { src: foto("mural"), alt: "Un muro de piedra con un mural de colores, bajo el cielo", leyenda: "El mural" },
  ],
  [
    { src: foto("terraza"), alt: "La terraza blanca frente a las sierras", leyenda: "La terraza" },
    { src: foto("frutas"), alt: "Un cuenco con frutas de la cosecha, entre las parras", leyenda: "La cosecha" },
  ],
  [
    { src: foto("ronda"), alt: "Un grupo sentado en ronda a la sombra de un árbol", leyenda: "A la sombra" },
    { src: foto("cuencos"), alt: "Una vela encendida sobre una mesa de madera", leyenda: "Una vela encendida" },
  ],
];

export const ESTADIA = "Una estadía";

export const PREGUNTAS = [
  { p: "¿Toda la comida es vegana?", r: "Sí, el menú es 100% vegano: no consumimos ni ofrecemos productos de origen animal." },
  { p: "¿Qué pasa si tengo una alergia alimentaria?", r: "Avisanos al reservar y adaptamos cada preparación." },
  { p: "¿Puedo ir con mi mascota?", r: "Sí, la hostería figura en el listado pet friendly 2026 de la Municipalidad de Villa de Merlo. Contanos al reservar." },
  { p: "¿Cuánto sale?", r: "Te pasamos las tarifas de alojamiento y de cada retiro por WhatsApp." },
  { p: "¿Puedo organizar mi propio retiro?", r: "Sí. Si sos profe de yoga o terapeuta, recibimos grupos: hay sala equipada, parque natural y cocina casera." },
  { p: "¿Cómo reservo?", r: "Por WhatsApp. Completá el formulario y te llega el mensaje armado." },
];
