// Contenido de la página de muestra "Cabañas Cielo de Piedra".
// El negocio es inventado: nombres, capacidades y condiciones son de ejemplo.

export const NEGOCIO = "Cielo de Piedra";
export const foto = (nombre: string) => `./fotos/${nombre}.webp`;

export const DATOS: [string, string][] = [
  ["3", "cabañas"],
  ["2 a 6", "personas"],
  ["5 min", "del centro de Merlo"],
];

export const CABANAS = [
  {
    nombre: "El Tala",
    capacidad: "Para 2",
    foto: "tala",
    texto: "Un solo ambiente amplio, con hogar a leña y ventanal al valle. La más pedida para una escapada de a dos.",
    tiene: ["Cama king", "Hogar a leña", "Galería con parrilla", "Cocina completa"],
  },
  {
    nombre: "El Molle",
    capacidad: "Hasta 4",
    foto: "molle",
    texto: "Dos dormitorios y un living de madera con salamandra. Pensada para una familia o para dos parejas.",
    tiene: ["2 dormitorios", "Salamandra", "Deck con vista", "Cocina completa"],
  },
  {
    nombre: "El Chañar",
    capacidad: "Hasta 6",
    foto: "chanar",
    texto: "La más grande: tres dormitorios, dos baños y una galería larga para comer todos juntos.",
    tiene: ["3 dormitorios", "2 baños", "Galería con parrilla", "Lavarropas"],
  },
];

// icono = clave de ICONOS en App.tsx
export const SERVICIOS: [icono: string, texto: string][] = [
  ["pileta", "Pileta con vista a la sierra"],
  ["fuego", "Parrilla en cada cabaña"],
  ["wifi", "Wifi en todo el predio"],
  ["taza", "Desayuno serrano"],
  ["auto", "Estacionamiento techado"],
  ["huella", "Mascotas bienvenidas"],
  ["cama", "Ropa blanca incluida"],
  ["lena", "Leña para el hogar"],
];

// La primera es la que termina ocupando toda la pantalla. Máximo 7.
export const GALERIA = [
  { src: foto("pileta"), alt: "La pileta, con la sierra de fondo" },
  { src: foto("desayuno"), alt: "Mesa de desayuno en el jardín" },
  { src: foto("hamaca"), alt: "Hamaca entre los árboles" },
  { src: foto("asado"), alt: "Asado a las brasas" },
  { src: foto("dormitorio"), alt: "Dormitorio de madera" },
  { src: foto("picada"), alt: "Picada al sol" },
  { src: foto("hogar"), alt: "Living con hogar de piedra" },
];

export const PREGUNTAS = [
  { p: "¿A qué hora se entra y se sale?", r: "El ingreso es desde las 14 y la salida hasta las 10. Si llegás antes, podés dejar el auto y usar la pileta." },
  { p: "¿Puedo ir con mi perro?", r: "Sí. Las tres cabañas tienen patio cerrado. Solo te pedimos que nos avises al reservar." },
  { p: "¿Cómo se reserva?", r: "Nos consultás las fechas por WhatsApp, te confirmamos el valor y la reserva queda tomada con una seña." },
  { p: "¿La pileta está abierta todo el año?", r: "De octubre a abril. El resto del año, las cabañas tienen hogar o salamandra, con leña incluida." },
];

// Las fotos de paisaje son de Wikimedia Commons y la licencia pide nombrar al autor.
export const CREDITOS = {
  texto: "Fotos de la sierra: daniel scaramella, CC BY-SA 4.0, vía Wikimedia Commons.",
  link: "https://commons.wikimedia.org/wiki/File:Las_Sierras_de_Comechingones.jpg",
};
