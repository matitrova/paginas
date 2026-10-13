// Horarios de Casa Tala y las dos preguntas que la página le hace al reloj.

// Por día de la semana (0 = domingo): [abre, cierra] en horas. Más de 24 = cierra de madrugada.
// null = cerrado.
export const HORARIO: ([number, number] | null)[] = [
  [8.5, 24], // domingo
  null, // lunes
  [8.5, 24], // martes
  [8.5, 24], // miércoles
  [8.5, 24], // jueves
  [8.5, 26], // viernes, hasta las 2
  [8.5, 26], // sábado, hasta las 2
];

export const HORARIO_TEXTO: [string, string][] = [
  ["Martes a jueves y domingos", "8:30 a 00:00"],
  ["Viernes y sábados", "8:30 a 02:00"],
  ["Lunes", "Cerrado"],
];

// A las 19 la casa cambia la carta: baja la luz y abre la barra.
export const esDeNoche = (d: Date) => d.getHours() >= 19 || d.getHours() < 6;

export function estaAbierto(d: Date) {
  const hora = d.getHours() + d.getMinutes() / 60;
  const hoy = HORARIO[d.getDay()];
  if (hoy && hora >= hoy[0] && hora < hoy[1]) return true;
  // La madrugada del sábado es la noche del viernes
  const ayer = HORARIO[(d.getDay() + 6) % 7];
  return !!ayer && hora + 24 < ayer[1];
}
