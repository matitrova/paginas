// Contenido de la página de muestra "Casa Tala".
// El negocio es inventado: la carta y los precios son de ejemplo.

export const NEGOCIO = "Casa Tala";
export const foto = (nombre: string) => `./fotos/${nombre}.webp`;

export type Modo = "dia" | "noche";

interface Plato {
  nombre: string;
  detalle: string;
  precio: number;
}

interface Seccion {
  titulo: string;
  foto: string;
  platos: Plato[];
}

export const CARTA: Record<Modo, Seccion[]> = {
  dia: [
    {
      titulo: "Café",
      foto: "cafe",
      platos: [
        { nombre: "Espresso", detalle: "Corto e intenso, de tueste medio", precio: 3200 },
        { nombre: "Cortado", detalle: "Con un toque de leche texturizada", precio: 3500 },
        { nombre: "Flat white", detalle: "Doble espresso y leche sedosa", precio: 4200 },
        { nombre: "Capuccino", detalle: "Con cacao amargo", precio: 4500 },
        { nombre: "Té en hebras", detalle: "Negro, verde o de hierbas serranas", precio: 3800 },
      ],
    },
    {
      titulo: "Desayunos y meriendas",
      foto: "desayuno",
      platos: [
        { nombre: "Medialunas de manteca", detalle: "Dos, recién horneadas", precio: 3600 },
        { nombre: "Tostado de campo", detalle: "Pan de masa madre, jamón cocido y queso", precio: 7800 },
        { nombre: "Tostadas con palta", detalle: "Con huevo poché y semillas", precio: 9800 },
        { nombre: "Torta del día", detalle: "Preguntá cuál salió hoy", precio: 6500 },
        { nombre: "Yogur con granola", detalle: "Con fruta de estación y miel", precio: 7200 },
      ],
    },
    {
      titulo: "Almuerzo",
      foto: "almuerzo",
      platos: [
        { nombre: "Ensalada tibia", detalle: "Calabaza asada, queso de cabra y nueces", precio: 11500 },
        { nombre: "Sándwich de bondiola", detalle: "Braseada, con cebolla caramelizada", precio: 13800 },
        { nombre: "Tarta y ensalada", detalle: "La tarta cambia todos los días", precio: 11000 },
        { nombre: "Pastas del día", detalle: "Caseras, con la salsa que elijas", precio: 14500 },
      ],
    },
  ],
  noche: [
    {
      titulo: "Tragos",
      foto: "tragos",
      platos: [
        { nombre: "Negroni", detalle: "Gin, vermut rosso y bitter", precio: 9500 },
        { nombre: "Aperol spritz", detalle: "Con espumante y naranja", precio: 8500 },
        { nombre: "Gin tonic de la casa", detalle: "Con hierbas del monte", precio: 9800 },
        { nombre: "Old fashioned", detalle: "Bourbon, azúcar y angostura", precio: 11000 },
        { nombre: "Fernet con cola", detalle: "Como se toma acá", precio: 7500 },
      ],
    },
    {
      titulo: "Cervezas",
      foto: "cervezas",
      platos: [
        { nombre: "Golden", detalle: "Rubia, liviana y fresca", precio: 6500 },
        { nombre: "IPA", detalle: "Lupulada y bien amarga", precio: 7500 },
        { nombre: "Scotch", detalle: "Roja, maltosa", precio: 7000 },
        { nombre: "Honey", detalle: "Con miel de la zona", precio: 7000 },
      ],
    },
    {
      titulo: "Para picar",
      foto: "picar",
      platos: [
        { nombre: "Picada para dos", detalle: "Fiambres, quesos, aceitunas y pan casero", precio: 26000 },
        { nombre: "Papas con cheddar", detalle: "Con panceta y verdeo", precio: 11500 },
        { nombre: "Empanadas de carne", detalle: "Tres, cortadas a cuchillo", precio: 9000 },
        { nombre: "Rabas", detalle: "Con alioli de limón", precio: 16500 },
      ],
    },
    {
      titulo: "Platos",
      foto: "platos",
      platos: [
        { nombre: "Hamburguesa Tala", detalle: "Doble carne, cheddar y cebolla crispy", precio: 15500 },
        { nombre: "Milanesa napolitana", detalle: "Con papas fritas", precio: 17500 },
        { nombre: "Sorrentinos de calabaza", detalle: "Con manteca de salvia", precio: 14000 },
        { nombre: "Bondiola a la cerveza negra", detalle: "Con puré rústico", precio: 19500 },
      ],
    },
  ],
};

export const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

export const LUGAR = [
  { foto: "lugar-1", pie: "El salón, a media mañana" },
  { foto: "lugar-2", pie: "Cada café, uno por uno" },
  { foto: "lugar-3", pie: "El patio, cuando se prenden las luces" },
  { foto: "lugar-4", pie: "La barra" },
  { foto: "lugar-5", pie: "Sale horneado todos los días" },
  { foto: "lugar-6", pie: "Cuatro canillas de cerveza tirada" },
];

export const HORAS_RESERVA = ["9:00", "10:30", "13:00", "14:00", "17:00", "20:30", "21:30", "22:30"];
