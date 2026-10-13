// Los datos de contacto de Matías. Se cambian acá y se actualizan en todas las páginas.

// WhatsApp en formato internacional sin "+" (ej. "5492664123456").
// Vacío = las páginas de muestra no muestran "Quiero una página así" y la página de venta
// ofrece el mail en su lugar.
export const WHATSAPP_MATIAS = "";
// Usuario de Instagram sin arroba. Vacío = no se muestra.
export const INSTAGRAM_MATIAS = "";
// El mismo mail que ya es público en el portfolio.
export const EMAIL_MATIAS = "matitrova13@gmail.com";

const wa = (texto: string) => `https://wa.me/${WHATSAPP_MATIAS}?text=${encodeURIComponent(texto)}`;

export const quieroUnaAsi = (pagina: string) =>
  WHATSAPP_MATIAS ? wa(`Hola Matías! Vi la página de ejemplo de ${pagina} y quiero una así para mi negocio.`) : null;

/** El botón principal de contacto: WhatsApp si está cargado; si no, mail. */
export function contacto(texto = "Hola Matías! Quiero una página web para mi negocio.") {
  return WHATSAPP_MATIAS
    ? { canal: "whatsapp" as const, href: wa(texto), etiqueta: "Escribime por WhatsApp" }
    : {
        canal: "mail" as const,
        href: `mailto:${EMAIL_MATIAS}?subject=${encodeURIComponent("Página web para mi negocio")}&body=${encodeURIComponent(texto)}`,
        etiqueta: "Escribime por mail",
      };
}
