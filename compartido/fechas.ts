// Fechas de los <input type="date"> ("2026-11-14"), siempre en hora local.

export const fecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d); // new Date("2026-11-14") es UTC y en Argentina cae el día anterior
};

// "sáb 14/11": el día de la semana lo da el navegador, la fecha se arma a mano (es-AR la escribe con guiones)
export const linda = (iso: string) => {
  const d = fecha(iso);
  return `${d.toLocaleDateString("es-AR", { weekday: "short" })} ${d.getDate()}/${d.getMonth() + 1}`;
};

export const diaSiguiente = (iso: string) => {
  const d = fecha(iso);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
