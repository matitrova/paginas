import { useEffect, useState } from "react";
import { ir, linkPropiedad, MapaUrbanizaciones, Tarjeta, Titulo, useConsulta, useGuardadas } from "./componentes";
import { porId, precio, SITIO, TELEFONO, URBANIZACIONES } from "./datos";
import { Descripcion, nombreLindo } from "./Ficha";

const disponibles = (ids: string[]) => ids.map((id) => porId.get(id)).filter((p) => p !== undefined);

export function Urbanizaciones() {
  useEffect(() => {
    document.title = "Urbanizaciones · Castro Inmobiliaria";
  }, []);
  const lista = [...URBANIZACIONES].sort((a, b) => disponibles(b.propiedades).length - disponibles(a.propiedades).length);
  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
      <Titulo chico={`${URBANIZACIONES.length} urbanizaciones`}>{SITIO.inicio.urbanizaciones_titulo}</Titulo>
      <div className="mt-7">
        <MapaUrbanizaciones />
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((u) => {
          const n = disponibles(u.propiedades).length;
          return (
            <a key={u.id} href={ir({ u: u.id })} data-urbanizacion={u.id} className="group overflow-hidden rounded-2xl border border-linea bg-white hover:shadow-[0_18px_40px_-24px_rgb(33_28_24/0.45)]">
              <div className="aspect-[16/10] overflow-hidden bg-hondo">
                {/* La segunda foto suele ser el lugar; la primera, el logo del loteo */}
                {u.fotos.length > 0 && <img src={u.fotos[1] ?? u.fotos[0]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
              </div>
              <div className="p-4">
                <h2 className="font-display text-[1.35rem]">{nombreLindo(u.nombre)}</h2>
                <p className="mt-1 text-[13.5px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "")}</p>
                <p className="mt-3 text-[14px] font-semibold text-naranja-osc">{n ? `${n} ${n === 1 ? "propiedad" : "propiedades"}` : "Sin propiedades publicadas hoy"}</p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function Urbanizacion({ id }: { id: string }) {
  const u = URBANIZACIONES.find((x) => x.id === id);
  const consulta = useConsulta();
  useEffect(() => {
    if (u) document.title = `${nombreLindo(u.nombre)} · Urbanizaciones · Castro Inmobiliaria`;
  }, [u]);
  if (!u) return <p className="mx-auto max-w-2xl px-5 py-20 text-center text-suave">No encontramos esa urbanización. <a href={ir({ ver: "urbanizaciones" })} className="font-semibold text-naranja-osc">Ver todas</a></p>;
  const props = disponibles(u.propiedades);
  return (
    <article className="mx-auto max-w-6xl px-5 pt-6 sm:px-6">
      <a href={ir({ ver: "urbanizaciones" })} className="text-[13.5px] text-suave hover:text-tinta">← Urbanizaciones</a>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="content-start md:sticky md:top-28">
          {(u.fotos[1] ?? u.fotos[0]) && <img src={u.fotos[1] ?? u.fotos[0]} alt={nombreLindo(u.nombre)} className="w-full rounded-2xl object-cover" />}
        </div>
        <div>
          <div className="flex items-center gap-4">
            {u.fotos.length > 1 && <img src={u.fotos[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
            <h1 className="font-display text-[2.2rem] leading-tight">{nombreLindo(u.nombre)}</h1>
          </div>
          <p className="mt-2 text-[15px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "Acceso: ")}</p>
          {props.length > 0 && (
            <a href="#propiedades" className="mt-4 inline-block font-semibold text-naranja-osc">Ver las {props.length} propiedades ↓</a>
          )}
          <div className="mt-5">
            <Descripcion texto={u.descripcion} />
          </div>
          {u.servicios.length + u.adicionales.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" data-adicionales>
              {[...new Set([...u.servicios, ...u.adicionales])].map((s) => (
                <li key={s} className="rounded-full border border-linea bg-white px-3.5 py-1.5 text-[14px]">{s}</li>
              ))}
            </ul>
          )}
          <button onClick={() => consulta.abrir(`Hola, quiero información sobre la urbanización ${nombreLindo(u.nombre)}.`)} className="mt-7 rounded-full bg-naranja-osc px-6 py-3.5 font-semibold text-white hover:brightness-95">
            Consultar por {nombreLindo(u.nombre)}
          </button>
          {u.lat && (
            <>
              <h2 className="font-display mt-10 text-2xl">Ubicación</h2>
              <iframe
                title={`Ubicación de ${nombreLindo(u.nombre)}`}
                src={`https://maps.google.com/maps?q=${u.lat},${u.lng}&z=14&output=embed`}
                loading="lazy"
                className="mt-3 h-64 w-full rounded-2xl border border-linea"
                data-mapa-embebido
              />
            </>
          )}
        </div>
      </div>
      <section id="propiedades" className="mt-14 scroll-mt-28">
        <h2 className="font-display text-2xl sm:text-3xl">{props.length ? `Propiedades en ${nombreLindo(u.nombre)}` : "Hoy no tiene propiedades publicadas"}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
      </section>
      {consulta.vista}
    </article>
  );
}

export function Nosotros() {
  const { nosotros, equipo, museo } = SITIO;
  useEffect(() => {
    document.title = "Nosotros y el Museo de La Firma · Castro Inmobiliaria";
    if (location.hash === "#museo") document.getElementById("museo")?.scrollIntoView();
  }, []);
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
        <img src="./fotos/fondonos.webp" alt="El equipo de Castro Inmobiliaria" className="w-full rounded-3xl bg-[#ddd2cf] object-cover" />
        <div className="mx-auto mt-10 max-w-3xl">
          <Titulo chico="Desde 1985">Quiénes somos</Titulo>
          <p className="mt-5 text-[17px] leading-relaxed text-tinta/85">{nosotros.texto}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {nosotros.valores.map((v) => (
              <li key={v} className="rounded-full bg-hondo px-4 py-2 text-[14.5px] font-medium">{v}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6">
        <Titulo chico="El equipo">Las personas que te van a atender</Titulo>
        <ul className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-equipo>
          {equipo.map((e) => (
            <li key={e.nombre} className="flex gap-4 rounded-2xl border border-linea bg-white p-4">
              <img src={e.foto} alt={e.nombre} loading="lazy" className="h-24 w-24 shrink-0 rounded-xl object-cover object-top" />
              <div className="min-w-0">
                <p className="font-semibold">{e.nombre}</p>
                <p className="text-[13.5px] leading-snug text-suave">{e.cargo.replace(/\.$/, "")}</p>
                {/^\d+$/.test(e.matricula) && <p className="mt-1 text-[13.5px] text-suave">Matrícula {e.matricula} CMCPSL</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="museo" className="mt-20 scroll-mt-28 bg-tinta py-16 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="text-[12px] font-semibold tracking-[0.2em] text-naranja uppercase">Museo de La Firma</p>
          <h2 className="font-display mt-2 max-w-3xl text-[1.9rem] leading-tight text-balance sm:text-[2.6rem]">{museo.titulo}</h2>
          <div className="mt-6 grid gap-5 text-[16px] leading-relaxed text-white/80 md:grid-cols-2">
            {museo.textos.map((t) => (
              <p key={t.slice(0, 20)}>{t}</p>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" data-museo>
            {museo.fotos.slice(0, 8).map((f) => (
              <img key={f} src={f} alt="Museo de La Firma" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
            ))}
          </div>
          <p className="mt-6 text-[14px] text-white/60">Pbro. Becerra 436, Villa de Merlo. Se visita en la oficina.</p>
        </div>
      </section>
    </>
  );
}

const MOTIVOS = ["Quiero comprar", "Quiero alquilar", "Quiero vender o tasar", "Otra consulta"];

export function Contacto() {
  const c = SITIO.contacto;
  const consulta = useConsulta();
  const [form, setForm] = useState(() => ({
    nombre: "", telefono: "", email: "", mensaje: "",
    motivo: new URLSearchParams(location.search).get("motivo") === "vender" ? "Quiero vender o tasar" : MOTIVOS[0],
  }));
  useEffect(() => {
    document.title = "Contacto · Castro Inmobiliaria";
  }, []);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    consulta.abrir([`Hola, soy ${form.nombre}.`, `Motivo: ${form.motivo}`, form.mensaje, form.telefono && `Mi teléfono: ${form.telefono}`, form.email && `Mi mail: ${form.email}`].filter(Boolean).join("\n"));
  };
  const campo = "mt-1 h-12 w-full rounded-xl border border-linea bg-white px-3.5 text-[16px]";
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 sm:px-6 md:grid-cols-2">
      <div>
        <Titulo chico="Contacto">Vení a vernos o escribinos</Titulo>
        <dl className="mt-7 space-y-5 text-[16px]">
          <div>
            <dt className="text-[13px] text-suave">Oficina y Museo de La Firma</dt>
            <dd className="mt-0.5 font-medium">{c.direccion}</dd>
            <dd>
              <a href={`https://www.google.com/maps/search/?api=1&query=${c.oficina_lat},${c.oficina_lng}`} target="_blank" rel="noopener" className="text-[14.5px] font-semibold text-naranja-osc">Cómo llegar →</a>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-suave">Teléfono y WhatsApp</dt>
            <dd className="mt-0.5 font-medium"><a href={`tel:+54${TELEFONO.replace(/\D/g, "")}`}>{c.telefono}</a></dd>
          </div>
          <div>
            <dt className="text-[13px] text-suave">Mail</dt>
            <dd className="mt-0.5 font-medium"><a href={`mailto:${c.email}`}>{c.email}</a></dd>
          </div>
        </dl>
        <img src="./fotos/imagcontact.webp" alt="La oficina de Castro Inmobiliaria" loading="lazy" className="mt-8 w-full rounded-3xl object-cover" />
      </div>
      <form onSubmit={enviar} className="h-fit rounded-3xl border border-linea bg-white p-6" data-formulario>
        <h2 className="font-display text-2xl">Dejanos tu consulta</h2>
        <label className="mt-5 block text-[14px] font-medium">
          Nombre
          <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={campo} name="nombre" />
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Teléfono
          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={campo} inputMode="tel" name="telefono" />
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Mail <span className="font-normal text-suave">(si preferís que te respondan por mail)</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={campo} name="email" />
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Motivo
          <select value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={campo} name="motivo">
            {MOTIVOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Mensaje
          <textarea value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-linea bg-white p-3.5 text-[16px]" name="mensaje" />
        </label>
        <button type="submit" className="mt-5 w-full rounded-full bg-naranja-osc py-3.5 font-semibold text-white hover:brightness-95">Enviar por WhatsApp</button>
      </form>
      {consulta.vista}
    </section>
  );
}

/** Vender o tasar: los textos de su página de tasación y un formulario que arma el mensaje con lo que necesitan saber. */
export function Vender() {
  const { vender } = SITIO;
  const consulta = useConsulta();
  const [form, setForm] = useState({ nombre: "", telefono: "", tipo: vender.formulario_tipologias[0], direccion: "", metros: "", mensaje: "" });
  useEffect(() => {
    document.title = "Vender o tasar tu propiedad · Castro Inmobiliaria";
  }, []);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    consulta.abrir(
      [
        `Hola, soy ${form.nombre}. Quiero vender o tasar mi propiedad.`,
        `Tipo: ${form.tipo}`,
        form.direccion && `Dirección o zona: ${form.direccion}`,
        form.metros && `Superficie aproximada: ${form.metros} m²`,
        form.mensaje,
        form.telefono && `Mi teléfono: ${form.telefono}`,
      ].filter(Boolean).join("\n"),
    );
  };
  const campo = "mt-1 h-12 w-full rounded-xl border border-linea bg-white px-3.5 text-[16px]";
  const cambiar = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 sm:px-6 md:grid-cols-2">
        <div>
          <Titulo chico="Vender o tasar">{vender.titular}</Titulo>
          <h2 className="font-display mt-10 text-2xl">{vender.pasos_titulo}</h2>
          <p className="mt-1 text-suave">{vender.pasos_bajada}</p>
          <ol className="mt-5 space-y-3" data-pasos>
            {vender.pasos.map((paso, i) => (
              <li key={paso} className="flex items-center gap-4 text-[16px]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-naranja-osc font-semibold text-white">{i + 1}</span>
                {paso}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[16px] leading-relaxed text-tinta/80">{vender.cierre}.</p>
        </div>
        <form onSubmit={enviar} className="h-fit rounded-3xl border border-linea bg-white p-6" data-formulario-vender>
          <h2 className="font-display text-2xl">Contanos de tu propiedad</h2>
          <label className="mt-5 block text-[14px] font-medium">
            Nombre
            <input required value={form.nombre} onChange={cambiar("nombre")} className={campo} name="nombre" />
          </label>
          <label className="mt-4 block text-[14px] font-medium">
            Teléfono
            <input value={form.telefono} onChange={cambiar("telefono")} className={campo} inputMode="tel" name="telefono" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-[14px] font-medium">
              Tipo
              <select value={form.tipo} onChange={cambiar("tipo")} className={campo} name="tipo">
                {vender.formulario_tipologias.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block text-[14px] font-medium">
              m² aproximados
              <input value={form.metros} onChange={cambiar("metros")} className={campo} inputMode="numeric" name="metros" />
            </label>
          </div>
          <label className="mt-4 block text-[14px] font-medium">
            Dirección o zona
            <input value={form.direccion} onChange={cambiar("direccion")} className={campo} name="direccion" />
          </label>
          <label className="mt-4 block text-[14px] font-medium">
            Comentarios
            <textarea value={form.mensaje} onChange={cambiar("mensaje")} rows={3} className="mt-1 w-full rounded-xl border border-linea bg-white p-3.5 text-[16px]" name="mensaje" />
          </label>
          <button type="submit" className="mt-5 w-full rounded-full bg-naranja-osc py-3.5 font-semibold text-white hover:brightness-95">{vender.boton}</button>
        </form>
      </section>
      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6">
        <Titulo chico="Por qué con Castro">{vender.distingue_titulo}</Titulo>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {vender.distingue.map((d) => (
            <div key={d.titulo} className="rounded-2xl border border-linea bg-white p-5">
              <h3 className="font-semibold">{d.titulo.charAt(0) + d.titulo.slice(1).toLowerCase()}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-tinta/80">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>
      {consulta.vista}
    </>
  );
}

/** Las que el visitante marcó con el corazón. Se guardan en su teléfono; desde acá consulta por todas juntas. */
export function Guardadas() {
  const { ids, vaciar } = useGuardadas();
  const consulta = useConsulta();
  useEffect(() => {
    document.title = "Mis guardadas · Castro Inmobiliaria";
  }, []);
  const lista = ids.map((id) => porId.get(id)).filter((p) => p !== undefined);
  const mensaje = () =>
    [`Hola, me interesan estas propiedades:`, ...lista.map((p) => `• ${p.titulo} (cód. ${p.codigo}), ${precio(p)}\n${linkPropiedad(p.id)}`), "¿Siguen disponibles?"].join("\n");
  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
      <Titulo chico="Guardadas">{lista.length ? `Tus ${lista.length === 1 ? "propiedad guardada" : `${lista.length} propiedades guardadas`}` : "Todavía no guardaste ninguna"}</Titulo>
      {lista.length > 0 ? (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => consulta.abrir(mensaje())} data-consultar-guardadas className="rounded-full bg-naranja-osc px-6 py-3 font-semibold text-white hover:brightness-95">
              Consultar por {lista.length === 1 ? "esta" : `estas ${lista.length}`}
            </button>
            <button onClick={vaciar} className="rounded-full border border-linea px-5 py-3 font-semibold hover:bg-hondo">Vaciar</button>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-guardadas>
            {lista.map((p) => (
              <Tarjeta key={p.id} p={p} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 max-w-xl text-[16px] text-suave">
          Tocá el corazón de una propiedad para guardarla acá. Queda en este teléfono, sin crear cuenta.{" "}
          <a href={ir({ ver: "propiedades" })} className="font-semibold text-naranja-osc">Ver propiedades →</a>
        </p>
      )}
      {consulta.vista}
    </section>
  );
}
