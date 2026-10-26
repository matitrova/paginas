// Propuesta para Castro Inmobiliaria (Villa de Merlo, San Luis), para mostrarle a Mauro Greco.
// Lo de la inmobiliaria sale de su propio sitio (datos/*.json, armados por scripts/castro_datos.py);
// acá queda lo que es de la propuesta: el diagnóstico de la caída. Lo que no publicaron, no se inventa.

export const CONTACTO = "Mauro";
export const DOMINIO = "castroinmobiliaria.com";

// Fecha de los datos: el 25/10/2026 se sacó todo de su sitio, leyéndolo por detrás del certificado vencido.
export const DATOS_AL = "25/10/2026";

// EL DIAGNÓSTICO. Verificado el 25/10/2026 con curl y openssl contra sus dos dominios.
// No es una impresión: el certificado tiene fecha de vencimiento escrita adentro.
export const CAIDA = {
  vencio: "22 de octubre de 2026",
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

export const NOTA_DATOS = `Propiedades, fotos y textos tomados de su propio sitio el ${DATOS_AL}, tal cual los publican.`;
