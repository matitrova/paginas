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

// Sus fotos salen de static.tokkobroker.com, que bloquea la descarga directa.
// Por eso esta propuesta no las usa: se muestra la estructura, no el contenido.
export const NOTA_FOTOS =
  "Esta propuesta no usa fotos de sus propiedades: el servidor donde están alojadas no permite bajarlas. Con las originales, cada publicación se ve como corresponde.";

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
