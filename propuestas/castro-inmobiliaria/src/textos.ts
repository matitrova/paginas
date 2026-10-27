// Propuesta para Castro Inmobiliaria (Villa de Merlo, San Luis), para mostrarle a Mauro Greco.
// Lo de la inmobiliaria sale de su propio sitio (datos/*.json, armados por scripts/castro_datos.py).
// La página se muestra como si fuera su sitio real: que su página está caída se lo cuenta Matías en el mensaje,
// no la página (lo pidió el 26/10/2026).
//
// Los textos de presentación son propios (26/10/2026): los de su sitio, tal cual, hacían que la propuesta se
// pareciera a su página. Solo reformulan hechos que ellos publican (desde 1985, el museo y lo que tiene, el
// equipo, la oficina, los pasos para vender, dónde difunden); ningún dato ni adjetivo inventado. Los números van
// aparte, calculados del índice. scripts/verificar.py falla si vuelve una oración de su sitio de 25 caracteres o más.

// Fecha de los datos: el 25/10/2026 se sacó todo de su sitio, leyéndolo por detrás del certificado vencido.
export const DATOS_AL = "25/10/2026";

export const NOTA_DATOS = `Propiedades, fotos y descripciones tomadas de su propio sitio el ${DATOS_AL}, tal cual las publican.`;

export const PORTADA = {
  lugar: "Villa de Merlo, San Luis · desde 1985",
  enVenta: "en venta en Merlo y la zona",
  conForma: "terrenos con su forma real",
  buscar: "Buscar",
  explorar: "Explorar el mapa",
  ultimasChico: "Recién publicadas",
  ultimas: "Las últimas que entraron",
  verUltimas: "Ver todas, de la más nueva",
  formaChico: "Del catastro de San Luis",
  forma: "Terrenos con su forma real",
  formaTexto: "Cada lote dibujado sobre la foto satelital, con la medida de sus lados.",
  mapaChico: "El mapa",
  mapa: "Todas sobre la foto satelital",
  mapaTexto: "Acercate para ver el precio de cada una y los terrenos con su forma. Tocá una para ver su ficha.",
  mapaBoton: "Abrir el mapa con filtros",
  zonasChico: "Por zona",
  zonas: "¿Dónde buscás?",
  venderChico: "Vender o tasar",
  vender: "¿Cuánto vale tu propiedad?",
  venderTexto: "Te damos una tasación profesional y, si la vendés con nosotros, sale en portales y en Instagram, Facebook, TikTok y Mercado Libre.",
  venderBoton: "Pedir una tasación",
  anios: "Más de 40 años trabajando en Merlo y la zona.",
  museo: "La oficina es también un museo: miles de autógrafos que juntó Guillermo Castro, de Maradona y Messi a Freddie Mercury.",
  verMuseo: "Conocer el museo",
  equipo: "El equipo",
  verEquipo: "Conocer al equipo",
};

export const NOSOTROS = {
  chico: "Nosotros",
  titulo: "Una inmobiliaria de Merlo desde 1985",
  texto: "Más de 40 años vendiendo y tasando en Merlo y la zona.",
  oficina: "La oficina está en Pbro. Becerra 436 y es también el Museo de La Firma.",
  equipoChico: "El equipo",
  equipo: "Quién te atiende",
  museoChico: "Museo de La Firma",
  museo: "Una inmobiliaria que también es museo",
  museoTextos: [
    "Guillermo Castro colecciona autógrafos, y convirtió la oficina en un museo con miles de firmas de figuras argentinas y de todo el mundo. Fue la primera del país en hacerlo: una inmobiliaria temática.",
    "Hay objetos firmados por Freddie Mercury, Diego Maradona, Nicole Kidman, Lionel Messi, Ringo Starr, Elton John y Miley Cyrus; camisetas de equipos de fútbol, guantes de boxeo de campeones mundiales y sombreros de artistas. Además de la colección fija, organiza actividades y eventos.",
  ],
  museoVisita: "Se visita en la oficina: Pbro. Becerra 436, Villa de Merlo.",
};

export const VENDER = {
  chico: "Vender o tasar",
  titulo: "¿Cuánto vale tu propiedad?",
  bajada: "Te damos una tasación profesional. Si después la vendés con nosotros, nos ocupamos de publicarla y difundirla.",
  pasosTitulo: "Cómo sigue",
  pasos: ["Completás el formulario", "Hablás con uno de nosotros", "Mandás la documentación", "Vamos a ver la propiedad"],
  cierre: "Con la visita hecha, te damos la tasación.",
  formulario: "Contanos de tu propiedad",
  boton: "Pedir la tasación",
  porQueChico: "Por qué con Castro",
  porQue: "Lo que tenés de nuestro lado",
  // El segundo título va después del número de martilleros del equipo, que se calcula de los datos
  razones: [
    { titulo: "Más de 40 años en Merlo", texto: "Desde 1985 en el mercado de la villa y de los alrededores, y parte de cómo fue creciendo." },
    { titulo: "martilleros y corredores públicos", texto: "Matriculados, y en el equipo también hay un contador público." },
    { titulo: "Trato de cerca", texto: "Te acompañamos durante todo el proceso, según lo que necesites." },
    { titulo: "Difusión", texto: "Diseñadores y gente de marketing arman la publicación. Sale en portales y en Instagram, Facebook, TikTok y Mercado Libre." },
  ],
};

export const URBANIZACIONES_TXT = {
  chico: "Urbanizaciones",
  conPropiedades: "con propiedades publicadas. Tocá una para ver qué hay.",
};

export const CONTACTO = {
  chico: "Contacto",
  titulo: "Vení a vernos o escribinos",
  oficina: "Oficina y Museo de La Firma",
  formulario: "Dejanos tu consulta",
};

export const PIE = {
  desde: "Inmobiliaria de la Villa de Merlo desde 1985.",
};
