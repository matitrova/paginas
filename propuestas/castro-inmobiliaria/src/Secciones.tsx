// Urbanizaciones, Quiénes somos, Contacto y Vender, con sus textos (sitio.json, erratas corregidas) y su recorrido.
// Los formularios no tienen botón de enviar a un servidor: arman el mensaje y abren el WhatsApp de la inmobiliaria
// (lo eligió Matías el 30/10). El botón es un link que se va armando con lo que se completa.
import { useEffect, useState } from "react";
import { IconoWhatsApp, ir, linkWhatsApp, LLAMAR, MapaUrbanizaciones, Tarjeta, Titulo } from "./componentes";
import MapaGeneral from "./MapaGeneral";
import { porId, SITIO, URBANIZACIONES } from "./datos";
import { Descripcion, nombreLindo } from "./Ficha";

const disponibles = (ids: string[]) => ids.map((id) => porId.get(id)).filter((p) => p !== undefined);

const BOTON = "font-display inline-flex items-center justify-center gap-2 rounded-full bg-terracota px-7 py-3 text-[14px] font-bold tracking-wide text-white uppercase hover:brightness-110";
const CAMPO = "mt-1 h-12 w-full rounded-xl border border-linea bg-white px-3.5 text-[16px]";

export function Urbanizaciones() {
  useEffect(() => {
    document.title = "Urbanizaciones · Castro Inmobiliaria";
  }, []);
  const lista = [...URBANIZACIONES].sort((a, b) => disponibles(b.propiedades).length - disponibles(a.propiedades).length);
  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
      <Titulo h1>{SITIO.inicio.urbanizaciones_titulo}</Titulo>
      <div className="mt-7">
        <MapaUrbanizaciones />
      </div>
      <div className="mt-12 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((u) => {
          const n = disponibles(u.propiedades).length;
          return (
            <a key={u.id} href={ir({ u: u.id })} data-urbanizacion={u.id} className="group">
              <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-piedra">
                {/* La segunda foto suele ser el lugar; la primera, el logo del loteo */}
                {u.fotos.length > 0 && <img src={u.fotos[1] ?? u.fotos[0]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
              </div>
              <div className="pt-3">
                <h2 className="font-display text-[1.15rem] leading-tight font-bold">{nombreLindo(u.nombre)}</h2>
                <p className="mt-1 text-[13.5px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "")}</p>
                <p className="mt-2 text-[14px] font-semibold text-terracota">{n ? `${n} ${n === 1 ? "propiedad" : "propiedades"}` : "Sin propiedades publicadas"}</p>
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
  useEffect(() => {
    if (u) document.title = `${nombreLindo(u.nombre)} · Urbanizaciones · Castro Inmobiliaria`;
  }, [u]);
  if (!u) return <p className="mx-auto max-w-2xl px-5 py-20 text-center text-suave">No encontramos esa urbanización. <a href={ir({ ver: "urbanizaciones" })} className="font-semibold text-terracota underline underline-offset-4">Ver todas</a></p>;
  const props = disponibles(u.propiedades);
  return (
    <article className="mx-auto max-w-6xl px-5 pt-6 sm:px-6">
      <a href={ir({ ver: "urbanizaciones" })} className="text-[13.5px] text-suave hover:text-tinta">← Urbanizaciones</a>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          {(u.fotos[1] ?? u.fotos[0]) && <img src={u.fotos[1] ?? u.fotos[0]} alt={nombreLindo(u.nombre)} className="w-full rounded-2xl object-cover" />}
          {u.lat && (
            <div>
              <h2 className="font-display text-[15px] font-bold tracking-wide text-terracota uppercase">Ubicación</h2>
              <MapaGeneral props={props} lugarVacio={{ lat: Number(u.lat), lng: Number(u.lng), texto: "Ubicación de la urbanización" }} className="mt-3 h-80" />
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-4">
            {u.fotos.length > 1 && <img src={u.fotos[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
            <h1 className="font-display text-[1.8rem] leading-tight font-bold">{nombreLindo(u.nombre)}</h1>
          </div>
          <p className="mt-2 text-[15px] text-suave">{u.acceso.replace(/^Acceso:\s*/, "Acceso: ")}</p>
          <div className="mt-5">
            <Descripcion texto={u.descripcion} />
          </div>
          {u.servicios.length + u.adicionales.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" data-adicionales>
              {[...new Set([...u.servicios, ...u.adicionales])].map((s) => (
                <li key={s} className="rounded-full bg-naranja/15 px-3.5 py-1.5 text-[14px] font-medium">{s}</li>
              ))}
            </ul>
          )}
          <a href={linkWhatsApp(`Hola, quiero información sobre la urbanización ${nombreLindo(u.nombre)}.`)} target="_blank" rel="noopener" data-consultar-urbanizacion className={`${BOTON} mt-7`}>
            <IconoWhatsApp className="h-5 w-5" /> Consultar
          </a>
        </div>
      </div>
      <section id="propiedades" className="mt-14 scroll-mt-28">
        <Titulo>{props.length ? `Propiedades en ${nombreLindo(u.nombre)}` : "Hoy no tiene propiedades publicadas"}</Titulo>
        <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
      </section>
    </article>
  );
}

export function Nosotros() {
  const { nosotros, equipo, museo } = SITIO;
  useEffect(() => {
    document.title = "Quiénes somos y el Museo de La Firma · Castro Inmobiliaria";
    if (location.hash === "#museo") document.getElementById("museo")?.scrollIntoView();
  }, []);
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
        <img src="./fotos/fondonos.webp" alt="El equipo de Castro Inmobiliaria" className="w-full rounded-2xl object-cover" />
        <div className="mx-auto mt-10 max-w-3xl text-center">
          {/* En su sitio dice "QUIENES SOMOS": va con la tilde */}
          <Titulo h1 centrado>Quiénes somos</Titulo>
          <p className="mt-5 text-[17px] leading-relaxed text-suave">{nosotros.texto}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {nosotros.valores.map((v) => (
              <li key={v} className="font-display rounded-full bg-piedra px-4 py-2 text-[13px] font-semibold tracking-wide uppercase">{v}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-6">
        <Titulo centrado>{nosotros.equipo_titulo}</Titulo>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-equipo>
          {equipo.map((e) => (
            <li key={e.nombre} className="flex gap-4 rounded-2xl border border-linea bg-white p-4">
              <img src={e.foto} alt={e.nombre} loading="lazy" className="h-24 w-24 shrink-0 rounded-xl object-cover object-top" />
              <div className="min-w-0">
                <p className="font-display font-bold">{e.nombre}</p>
                <p className="text-[13.5px] leading-snug text-suave">{e.cargo.replace(/\.$/, "")}</p>
                {/* Como la publican, sin agregarle el colegio */}
                {/^\d+$/.test(e.matricula) && <p className="mt-1 text-[13.5px] text-suave">Matrícula {e.matricula}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="museo" className="mt-20 scroll-mt-28 bg-piedra py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Titulo chico={SITIO.inicio.museo_titulo}>{museo.titulo}</Titulo>
          <div className="mt-6 grid gap-5 text-[16px] leading-relaxed text-suave md:grid-cols-2">
            {museo.textos.map((t) => (
              <p key={t.slice(0, 20)}>{t}</p>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" data-museo>
            {museo.fotos.slice(0, 8).map((f) => (
              <img key={f} src={f} alt="Museo de La Firma" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
            ))}
          </div>
          <p className="mt-6 text-[14px] text-suave">{SITIO.contacto.direccion}.</p>
        </div>
      </section>
    </>
  );
}

const MOTIVOS = ["Quiero comprar", "Quiero alquilar", "Quiero vender o tasar", "Otra consulta"];

export function Contacto() {
  const c = SITIO.contacto;
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", motivo: MOTIVOS[0], mensaje: "" });
  useEffect(() => {
    document.title = "Contacto · Castro Inmobiliaria";
  }, []);
  const mensaje = [`Hola, soy ${form.nombre}.`, `Motivo: ${form.motivo}`, form.mensaje, form.telefono && `Mi teléfono: ${form.telefono}`, form.email && `Mi mail: ${form.email}`].filter(Boolean).join("\n");
  const cambiar = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 sm:px-6 md:grid-cols-2">
      <div>
        <Titulo h1>Contacto</Titulo>
        <dl className="mt-7 space-y-5 text-[16px]">
          <div>
            <dt className="text-[13px] text-suave">Oficina y Museo de La Firma</dt>
            <dd className="mt-0.5 font-medium">{c.direccion}</dd>
            <dd>
              <a href={`https://www.google.com/maps/search/?api=1&query=${c.oficina_lat},${c.oficina_lng}`} target="_blank" rel="noopener" className="text-[14.5px] font-semibold text-terracota underline underline-offset-4">Cómo llegar</a>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-suave">Teléfono y WhatsApp</dt>
            <dd className="mt-0.5 font-medium"><a href={LLAMAR}>{c.telefono}</a></dd>
          </div>
          <div>
            <dt className="text-[13px] text-suave">Mail</dt>
            <dd className="mt-0.5 font-medium"><a href={`mailto:${c.email}`}>{c.email}</a></dd>
          </div>
        </dl>
        <img src="./fotos/imagcontact.webp" alt="La oficina de Castro Inmobiliaria" loading="lazy" className="mt-8 w-full rounded-2xl object-cover" />
      </div>
      <Formulario titulo="Recibí más información" mensaje={mensaje} listo={!!form.nombre.trim()} dato="data-formulario">
        <label className="mt-5 block text-[14px] font-medium">
          Nombre
          <input required value={form.nombre} onChange={cambiar("nombre")} className={CAMPO} name="nombre" />
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Teléfono
          <input value={form.telefono} onChange={cambiar("telefono")} className={CAMPO} inputMode="tel" name="telefono" />
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Mail
          <input type="email" value={form.email} onChange={cambiar("email")} className={CAMPO} name="email" />
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Motivo
          <select value={form.motivo} onChange={cambiar("motivo")} className={CAMPO} name="motivo">
            {MOTIVOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-[14px] font-medium">
          Mensaje
          <textarea value={form.mensaje} onChange={cambiar("mensaje")} rows={4} className="mt-1 w-full rounded-xl border border-linea bg-white p-3.5 text-[16px]" name="mensaje" />
        </label>
      </Formulario>
    </section>
  );
}

/** El formulario: sin servidor, el botón abre el WhatsApp de la inmobiliaria con lo que se completó. Sin nombre, en
 *  vez de abrirlo marca el campo, como haría un formulario común. */
function Formulario({ titulo, mensaje, listo, dato, boton = "Enviar por WhatsApp", children }: { titulo: string; mensaje: string; listo: boolean; dato: string; boton?: string; children: React.ReactNode }) {
  return (
    <form onSubmit={(e) => e.preventDefault()} className="h-fit rounded-2xl border border-linea bg-white p-6" {...{ [dato]: "" }}>
      <h2 className="font-display text-[15px] font-bold tracking-wide text-terracota uppercase">{titulo}</h2>
      {children}
      <a
        href={linkWhatsApp(mensaje)}
        target="_blank"
        rel="noopener"
        onClick={(e) => {
          if (listo) return;
          e.preventDefault();
          e.currentTarget.closest("form")?.reportValidity();
        }}
        data-enviar
        className={`${BOTON} mt-5 w-full`}
      >
        <IconoWhatsApp className="h-5 w-5" /> {boton}
      </a>
    </form>
  );
}

export function Vender() {
  const { vender } = SITIO;
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", direccion: "", tipo: vender.formulario_tipologias[0], mensaje: "" });
  useEffect(() => {
    document.title = "Vender o tasar tu propiedad · Castro Inmobiliaria";
  }, []);
  const mensaje = [
    `Hola, soy ${form.nombre}. Quiero vender o tasar mi propiedad.`,
    `Tipo: ${form.tipo}`,
    form.direccion && `Dirección: ${form.direccion}`,
    form.mensaje,
    form.telefono && `Mi teléfono: ${form.telefono}`,
    form.email && `Mi mail: ${form.email}`,
  ].filter(Boolean).join("\n");
  const cambiar = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 sm:px-6 md:grid-cols-2">
        <div>
          <Titulo h1 chico="Vender o tasar">{vender.titular}</Titulo>
          <h2 className="font-display mt-10 text-[1.25rem] font-bold">{vender.pasos_titulo}</h2>
          <p className="mt-1 text-suave">{vender.pasos_bajada}</p>
          <ol className="mt-5 space-y-3" data-pasos>
            {vender.pasos.map((paso, i) => (
              <li key={paso} className="flex items-center gap-4 text-[16px]">
                <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-terracota font-bold text-white">{i + 1}</span>
                {paso}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[16px] leading-relaxed text-suave">{vender.cierre}.</p>
        </div>
        <Formulario titulo="Contanos de tu propiedad" mensaje={mensaje} listo={!!form.nombre.trim()} dato="data-formulario-vender" boton={vender.boton}>
          <label className="mt-5 block text-[14px] font-medium">
            Nombre
            <input required value={form.nombre} onChange={cambiar("nombre")} className={CAMPO} name="nombre" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-[14px] font-medium">
              Teléfono
              <input value={form.telefono} onChange={cambiar("telefono")} className={CAMPO} inputMode="tel" name="telefono" />
            </label>
            <label className="block text-[14px] font-medium">
              Mail
              <input type="email" value={form.email} onChange={cambiar("email")} className={CAMPO} name="email" />
            </label>
          </div>
          <label className="mt-4 block text-[14px] font-medium">
            Dirección
            <input value={form.direccion} onChange={cambiar("direccion")} className={CAMPO} name="direccion" />
          </label>
          <label className="mt-4 block text-[14px] font-medium">
            Tipología
            <select value={form.tipo} onChange={cambiar("tipo")} className={CAMPO} name="tipo">
              {vender.formulario_tipologias.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-[14px] font-medium">
            Comentarios
            <textarea value={form.mensaje} onChange={cambiar("mensaje")} rows={3} className="mt-1 w-full rounded-xl border border-linea bg-white p-3.5 text-[16px]" name="mensaje" />
          </label>
        </Formulario>
      </section>
      <section className="mt-16 bg-piedra py-14">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Titulo centrado>{vender.distingue_titulo}</Titulo>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {vender.distingue.map((d) => (
              <div key={d.titulo} className="rounded-2xl bg-white p-6">
                <h3 className="font-display text-[14px] font-bold tracking-wide text-terracota uppercase">{d.titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-suave">{d.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
