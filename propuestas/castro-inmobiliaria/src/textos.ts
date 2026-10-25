// Propuesta para Castro Inmobiliaria (Villa de Merlo, San Luis), escrita para Mauro.
// Cada dato lleva su fuente al lado. Lo que no publicaron, no se inventa.

export const NEGOCIO = "Castro Inmobiliaria";
export const CONTACTO = "Mauro";

// Ficha de Google Maps y encabezado de su propio sitio (25/10/2026).
export const TELEFONO = "266 502 4444";
export const DONDE = "Presbítero Becerra, Villa de Merlo";
export const DOMINIO = "castroinmobiliaria.com";

// EL DIAGNÓSTICO. Verificado el 25/10/2026 con curl y openssl contra sus dos dominios.
// No es una impresión: el certificado tiene fecha de vencimiento escrita adentro.
export const CAIDA = {
  vencio: "22 de octubre de 2026",
  dias: 3,
  // openssl s_client -connect www.castroinmobiliaria.com:443 | openssl x509 -dates
  emisor: "Let's Encrypt",
  // Las dos fallan igual, y el http:// redirige a la https:// que no abre:
  // no queda ninguna puerta que funcione.
  dominios: ["castroinmobiliaria.com", "www.castroinmobiliaria.com"],
  error: "certificate has expired",
};

// Lo que un visitante ve hoy. El texto es el de Chrome en español.
export const PANTALLA = {
  titulo: "La conexión no es privada",
  cuerpo:
    "Es posible que los atacantes estén intentando robar tu información de castroinmobiliaria.com (por ejemplo, contraseñas, mensajes o tarjetas de crédito).",
  codigo: "NET::ERR_CERT_DATE_INVALID",
};

// Su catálogo, contado sobre la portada del 25/10/2026 (24 publicaciones).
export const CARTERA = { total: 24, casas: 20, locales: 1, terrenos: 2 };

// Los dos terrenos que publican, con el nombre tal cual lo escriben ellos.
export const TERRENOS = ["Terreno 500 m² — Santa Rosa del Conlara", "Terreno en Punta Norte, Villa de Merlo"];

// Las fotos son las suyas, bajadas de su propio sitio el 25/10/2026 (están
// alojadas en static.tokkobroker.com). Se achicaron y se pasaron a WebP; no se
// retocó ninguna. Son las que ellos mismos eligieron para cada publicación.
export const NOTA_FOTOS =
  "Las fotos son las de sus propias publicaciones, tal como las muestra su sitio, con el precio y los metros que ellos mismos cargaron. Acá están achicadas para que la página abra rápido en el celular.";

export const foto = (n: number) => `./fotos/prop${n}.webp`;

/** Sus publicaciones, con el título tal cual lo escriben ellos. */
export const PUBLICACIONES = [
  { n: 1, titulo: "Casa en venta", donde: "Solares del Valle, Villa de Merlo" },
  { n: 2, titulo: "Casa en venta", donde: "Barranca Colorada, Villa de Merlo" },
  { n: 3, titulo: "Casa en venta", donde: "La Arbolada, Villa de Merlo" },
  { n: 4, titulo: "Casa PH en venta", donde: "Carpintería" },
  { n: 5, titulo: "Casa en venta", donde: "Rincón del Este, Villa de Merlo" },
  { n: 6, titulo: "Casa en venta", donde: "La Sebastiana, Merlo" },
  { n: 7, titulo: "Local en venta", donde: "Rotonda Chumamaya, Villa de Merlo" },
  { n: 8, titulo: "Terreno 500 m²", donde: "Santa Rosa del Conlara" },
];

export const INCLUYE = [
  {
    titulo: "La página, hecha de nuevo",
    texto:
      "Rápida en el celular, que es donde la va a abrir casi todo el mundo. Con sus propiedades, su teléfono a un toque y el mapa de la oficina.",
  },
  {
    titulo: "El certificado, siempre al día",
    texto:
      "Se renueva solo y yo lo miro. Lo que pasó esta semana no vuelve a pasar sin que alguien se entere el mismo día.",
  },
  {
    titulo: "Las consultas ordenadas",
    texto:
      "Quien pregunta por una propiedad deja nombre y teléfono, y eso llega a un solo lugar en vez de perderse entre los WhatsApp del día.",
  },
  {
    titulo: "Los terrenos, como nadie los muestra",
    texto:
      "El lote dibujado con su forma real del catastro sobre la foto satelital. No un punto en el mapa: el terreno, con sus medidas.",
  },
];
