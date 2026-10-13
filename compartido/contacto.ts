// El WhatsApp de Matías, en formato internacional sin "+" (ej. "5492664123456").
// Vacío = el botón "Quiero una página así" no se muestra en ninguna página de muestra.
export const WHATSAPP_MATIAS = "";

export const quieroUnaAsi = (pagina: string) =>
  WHATSAPP_MATIAS
    ? `https://wa.me/${WHATSAPP_MATIAS}?text=${encodeURIComponent(`Hola Matías! Vi la página de ejemplo de ${pagina} y quiero una así para mi negocio.`)}`
    : null;
