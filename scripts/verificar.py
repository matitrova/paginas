"""Recorre las páginas de muestra ya compiladas (dist/) en celular y compu, sin servidor:
Playwright sirve los archivos desde el disco. Saca capturas y termina con error si algo no anda.

Uso:  npm run build && ../Test1_Inmo/.venv/bin/python scripts/verificar.py [carpeta-de-capturas] [página]
      (la carpeta va primero; la página, por ejemplo "castro", es el segundo argumento)
"""
import mimetypes
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

DIST = Path(__file__).resolve().parent.parent / "dist"
# Sin carpeta, las capturas van a capturas/ (ignorada en git), nunca sueltas en la raíz del repo
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "capturas")
OUT.mkdir(parents=True, exist_ok=True)
SOLO = sys.argv[2] if len(sys.argv) > 2 else None
BASE = "http://muestras.test/"
problemas: list[str] = []


def servir(route):
    ruta = unquote(urlparse(route.request.url).path).lstrip("/")
    f = DIST / ruta
    if f.is_dir():
        f = f / "index.html"
    if f.is_file():
        route.fulfill(status=200, body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or "application/octet-stream")
    else:
        route.fulfill(status=404, body=b"no existe")


def comunes(pg, nombre):
    """Lo que tiene que cumplir cualquier página de muestra."""
    if "noindex" not in (pg.get_attribute("meta[name=robots]", "content") or ""):
        problemas.append(f"{nombre}: falta el noindex")
    if not pg.get_by_text("Sitio de ejemplo").first.is_visible():
        problemas.append(f"{nombre}: no se ve la cinta 'Sitio de ejemplo'")
    ancho = [pg.evaluate("document.documentElement.scrollWidth"), pg.viewport_size["width"]]
    if ancho[0] > ancho[1]:
        problemas.append(f"{nombre}: scroll horizontal ({ancho[0]} > {ancho[1]})")


def textos_afuera(pg, nombre, ignorar="[data-libre]"):
    # Una sección con overflow-hidden recorta un título que se sale y scrollWidth no lo ve:
    # por eso se mira la caja de cada texto.
    # El ancho es el del dispositivo y no innerWidth: emulando un celular, si algo se sale el navegador
    # agranda innerWidth hasta que entre, y comparar contra eso daba siempre bien.
    salidos = pg.evaluate(
        """([ignorar, ancho]) => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main label, footer *')]
        .filter(e => !e.closest(ignorar) && e.getClientRects().length && getComputedStyle(e).opacity !== '0')
        .filter(e => { const r = e.getBoundingClientRect(); return r.right > ancho + 1 || r.left < -1 })
        .map(e => e.tagName + ': ' + e.textContent.trim().slice(0, 40))""",
        [ignorar, pg.viewport_size["width"]],
    )
    problemas.extend(f"{nombre}: se sale de la pantalla -> {x}" for x in salidos)


def cabanas(pg, nombre, cap):
    pg.goto(BASE + "cabanas/", wait_until="networkidle")
    pg.wait_for_timeout(800)
    cap("1-portada")
    comunes(pg, nombre)

    for sel, n in [("#cabanas", "2-cabanas"), ("#servicios", "3-servicios")]:
        pg.evaluate(f"document.querySelector('{sel}').scrollIntoView()")
        pg.wait_for_timeout(700)
        cap(n)

    # La galería con zoom: al principio, a la mitad y al final (la foto central llena la pantalla)
    galeria = pg.evaluate("(() => { const e = document.querySelector('main .h-\\\\[300vh\\\\]'); return [e.offsetTop, e.offsetHeight - innerHeight] })()")
    for i, f in enumerate([0.0, 0.5, 1.0]):
        pg.evaluate(f"window.scrollTo(0, {galeria[0] + galeria[1] * f})")
        pg.wait_for_timeout(900)
        cap(f"4-galeria-{i}")
    central = pg.evaluate("(() => { const r = document.querySelector('main .h-\\\\[300vh\\\\] img').getBoundingClientRect(); return [r.width >= innerWidth - 2, r.height >= innerHeight - 2] })()")
    if central != [True, True]:
        problemas.append(f"{nombre}: al final del zoom la foto central no llena la pantalla {central}")

    # El botón de una cabaña la deja elegida en el formulario
    pg.get_by_role("link", name="Consultar El Molle").click()
    pg.wait_for_timeout(900)
    if pg.input_value("select[name=cabana]") != "El Molle":
        problemas.append(f"{nombre}: 'Consultar El Molle' no eligió la cabaña en el formulario")
    pg.fill("input[name=llegada]", "2026-11-14")
    pg.fill("input[name=salida]", "2026-11-16")
    pg.select_option("select[name=personas]", "4")
    pg.fill("input[name=nombre]", "Prueba")
    cap("5-fechas")
    pg.get_by_role("button", name="Consultar por WhatsApp").click()
    pg.wait_for_timeout(500)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text() if pg.locator("dialog[open]").count() else ""
    # 14/11 y 16/11: si la fecha se leyera en UTC, en Argentina saldría un día antes
    for esperado in ["Cabaña: El Molle", "14/11", "16/11", "(2 noches)", "Personas: 4", "Mi nombre: Prueba"]:
        if esperado not in mensaje:
            problemas.append(f"{nombre}: en el mensaje falta '{esperado}' -> {mensaje[:120]!r}")
    cap("6-mensaje")
    pg.get_by_role("button", name="Cerrar").click()
    pg.wait_for_timeout(300)
    if pg.locator("dialog[open]").count():
        problemas.append(f"{nombre}: la vista del mensaje no se cierra")

    pg.evaluate("document.getElementById('llegar').scrollIntoView()")
    pg.wait_for_timeout(700)
    cap("7-llegar")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(600)
    cap("8-pie")
    textos_afuera(pg, nombre, ignorar=".h-\\[300vh\\]")


def casa_tala(pg, nombre, cap):
    url = BASE + "casa-tala/"
    estado = lambda: pg.evaluate("[document.documentElement.dataset.modo, document.querySelector('[data-estado]').dataset.estado]")
    pestanas = lambda: pg.locator("#carta [role=tab]").all_inner_texts()

    # El reloj decide el modo y el cartel de abierto. Hora de San Luis (UTC-3).
    casos = [
        ("2026-11-11T10:00:00-03:00", ["dia", "abierto"], "miércoles 10 h"),
        ("2026-11-14T22:30:00-03:00", ["noche", "abierto"], "sábado 22:30"),
        ("2026-11-09T15:00:00-03:00", ["dia", "cerrado"], "lunes 15 h (cerrado todo el día)"),
        ("2026-11-15T01:00:00-03:00", ["noche", "abierto"], "domingo 1 h (sigue la noche del sábado)"),
        ("2026-11-09T01:00:00-03:00", ["noche", "cerrado"], "lunes 1 h (el domingo cierra a las 0)"),
    ]
    # El reloj simulado de Playwright también reemplaza los temporizadores de animación del
    # navegador (las transiciones se vuelven lentas a veces), así que va en una página aparte
    # y el recorrido de la interfaz se hace con el reloj real.
    ctx = pg.context.browser.new_context(locale="es-AR", timezone_id="America/Argentina/San_Luis")
    reloj = ctx.new_page()
    reloj.route(f"{BASE}**", servir)
    for cuando, esperado, que in casos:
        reloj.clock.set_fixed_time(cuando)
        reloj.goto(url, wait_until="domcontentloaded")
        reloj.wait_for_selector("[data-estado]")
        dio = reloj.evaluate("[document.documentElement.dataset.modo, document.querySelector('[data-estado]').dataset.estado]")
        if dio != esperado:
            problemas.append(f"{nombre}: {que}: esperaba {esperado} y dio {dio}")
    ctx.close()

    # De día: carta de café. Si la prueba corre de noche, primero se pasa a día con el interruptor.
    pg.goto(url, wait_until="networkidle")
    if estado()[0] == "noche":
        pg.locator("main .theme-switch").click()
    pg.wait_for_timeout(1200)
    cap("1-portada-dia")
    comunes(pg, nombre)
    if estado()[0] != "dia" or "Café" not in pestanas() or "Tragos" in pestanas():
        problemas.append(f"{nombre}: de día quedó en {estado()[0]} con la carta {pestanas()}")
    pg.evaluate("document.getElementById('carta').scrollIntoView()")
    pg.wait_for_timeout(800)
    cap("2-carta-dia")

    # El interruptor cambia el tema Y la carta
    pg.evaluate("window.scrollTo(0, 0)")
    pg.locator("main .theme-switch").click()
    pg.wait_for_timeout(1300)
    cap("3-portada-noche")
    if estado()[0] != "noche":
        problemas.append(f"{nombre}: el interruptor no pasó a noche")
    if "Tragos" not in pestanas() or "Café" in pestanas():
        problemas.append(f"{nombre}: de noche la carta muestra {pestanas()}")
    fondo = pg.evaluate("getComputedStyle(document.documentElement).backgroundColor")
    if fondo != "rgb(20, 16, 13)":
        problemas.append(f"{nombre}: de noche el fondo quedó {fondo}")
    pg.evaluate("document.getElementById('carta').scrollIntoView()")
    pg.get_by_role("tab", name="Cervezas").click()
    pg.wait_for_timeout(900)
    cap("4-carta-noche")
    if "IPA" not in pg.locator("#carta").inner_text():
        problemas.append(f"{nombre}: la pestaña Cervezas no muestra la IPA")

    pg.evaluate("document.getElementById('lugar').scrollIntoView()")
    pg.wait_for_timeout(900)
    cap("5-lugar")
    pg.evaluate("document.getElementById('horarios').scrollIntoView()")
    pg.wait_for_timeout(600)
    cap("6-horarios")

    pg.evaluate("document.getElementById('reserva').scrollIntoView()")
    pg.fill("input[name=dia]", "2026-11-14")
    pg.select_option("select[name=personas]", "4")
    pg.fill("input[name=nombre]", "Prueba")
    pg.wait_for_timeout(400)
    cap("7-reserva")
    pg.get_by_role("button", name="Reservar por WhatsApp").click()
    pg.wait_for_timeout(500)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text() if pg.locator("dialog[open]").count() else ""
    for esperado in ["Día: sáb 14/11", "Hora: 21:30", "Personas: 4", "A nombre de: Prueba"]:
        if esperado not in mensaje:
            problemas.append(f"{nombre}: en el mensaje falta '{esperado}' -> {mensaje[:120]!r}")
    cap("8-mensaje")
    pg.get_by_role("button", name="Cerrar").click()
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(500)
    cap("9-pie")
    textos_afuera(pg, nombre)


def inicio(pg, nombre, cap):
    """La página de inicio, tipo Linktree. Es la única que sí tiene que aparecer en Google."""
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_timeout(800)
    cap("1-arriba")
    if pg.locator("meta[name=robots]").count():
        problemas.append(f"{nombre}: la página de inicio no tiene que llevar noindex")
    ancho = [pg.evaluate("document.documentElement.scrollWidth"), pg.viewport_size["width"]]
    if ancho[0] > ancho[1]:
        problemas.append(f"{nombre}: scroll horizontal ({ancho[0]} > {ancho[1]})")

    # Cada tarjeta lleva a su página, dice qué es, y ninguna propuesta o ejemplo pasa por cliente
    tarjetas = pg.evaluate("""[...document.querySelectorAll('[data-trabajo]')].map(a => ({
        id: a.dataset.trabajo, tipo: a.dataset.tipo, href: a.href, texto: a.innerText,
        foto: a.querySelector('img') && a.querySelector('img').complete && a.querySelector('img').naturalWidth > 0 }))""")
    propuestas = ("mirador-de-los-condores", "cabeza-del-indio", "hosteria-vegetariana")
    esperado = {"autoshine": ("cliente", "https://autoshine.com.ar/"), "cabanas": ("ejemplo", BASE + "cabanas/"), "casa-tala": ("ejemplo", BASE + "casa-tala/"),
                **{p: ("propuesta", BASE + f"propuestas/{p}/") for p in propuestas}}
    vistos = {t["id"]: (t["tipo"], t["href"]) for t in tarjetas}
    if vistos != esperado:
        problemas.append(f"{nombre}: tarjetas {vistos}")
    for t in tarjetas:
        aviso = {"cliente": "Cliente", "ejemplo": "Fotos de internet", "propuesta": "No la encargaron"}[t["tipo"]]
        if aviso not in t["texto"]:
            problemas.append(f"{nombre}: la tarjeta {t['id']} no dice '{aviso}'")
        if t["tipo"] != "cliente" and "Cliente\n" in t["texto"]:
            problemas.append(f"{nombre}: la tarjeta {t['id']} parece de un cliente")
        if t["href"].startswith(BASE) and not (DIST / t["href"][len(BASE):] / "index.html").is_file():
            problemas.append(f"{nombre}: {t['id']} apunta a una página que no está en dist/")
    for seccion, frase in [("#propuestas", "No las encargaron"), ("#ejemplos", "no existen"), ("#incluye", "Consultas a tu WhatsApp"), ("#pasos", "Me contás")]:
        if frase not in pg.locator(seccion).inner_text():
            problemas.append(f"{nombre}: falta la aclaración de {seccion}")

    # El contacto: WhatsApp de Matías con el mensaje armado, y el mail
    botones = pg.evaluate("[...document.querySelectorAll('[data-contacto]')].map(a => [a.dataset.contacto, a.href])")
    wsp = [h for c, h in botones if c == "whatsapp"]
    if len(wsp) < 2 or not all(h.startswith("https://wa.me/5492656445537?text=") for h in wsp) or not any(c == "mail" and h.startswith("mailto:matitrova13@gmail.com") for c, h in botones):
        problemas.append(f"{nombre}: botones de contacto {botones}")

    for sel, n in [("#ejemplos", "2-ejemplos"), ("#propuestas", "3-propuestas"), ("#incluye", "4-incluye"), ("#pasos", "5-pasos")]:
        pg.evaluate(f"document.querySelector('{sel}').scrollIntoView()")
        pg.wait_for_timeout(700)
        cap(n)
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(700)
    cap("6-cierre")
    sin_foto = [t["id"] for t in pg.evaluate("""[...document.querySelectorAll('[data-trabajo]')].map(a => ({id: a.dataset.trabajo, ok: a.querySelector('img').naturalWidth > 0}))""") if not t["ok"]]
    if sin_foto:
        problemas.append(f"{nombre}: tarjetas sin captura {sin_foto}")
    textos_afuera(pg, nombre)
    print(f"  {nombre}: {len(tarjetas)} tarjetas, contacto por WhatsApp y mail")


def propuesta(slug, boton, rellenar, esperados, extra=None):
    """Arma el recorrido de una propuesta para un comercio real (propuestas/<slug>/)."""
    def recorrer(pg, nombre, cap):
        pg.goto(f"{BASE}propuestas/{slug}/", wait_until="networkidle")
        pg.wait_for_timeout(900)
        cap("00-portada")
        # Lo que no puede faltar: que no se indexe y que diga, siempre a la vista, que no es la oficial
        if "noindex" not in (pg.get_attribute("meta[name=robots]", "content") or ""):
            problemas.append(f"{nombre}: falta el noindex")
        cartel = pg.locator("aside[aria-label^='Aviso: propuesta']")
        if not cartel.is_visible() or "No es la página oficial" not in cartel.inner_text():
            problemas.append(f"{nombre}: no se ve el cartel de propuesta")
        # El cartel va en un renglón: si no entra, se corta "No es la página oficial" o el botón
        entra = pg.evaluate("(() => { const a = document.querySelector('aside[aria-label^=\"Aviso: propuesta\"]'); return [...a.children].every(c => c.getBoundingClientRect().right <= innerWidth && c.getBoundingClientRect().left >= 0) && a.scrollWidth <= a.clientWidth + 1 })()")
        if not entra:
            problemas.append(f"{nombre}: el cartel de propuesta no entra en la pantalla")
        if pg.locator("aside[aria-label^='Aviso: propuesta'] a[href='../../']").count() != 1:
            problemas.append(f"{nombre}: el cartel no tiene el link para volver a todas las páginas")
        if pg.locator("body").inner_text().count("tomadas de sus redes") < 2:
            problemas.append(f"{nombre}: falta aclarar, en la galería y en el pie, que las fotos son de sus redes")
        if extra:
            extra(pg, nombre, cap)

        alto = pg.evaluate("document.body.scrollHeight - innerHeight")
        for i in range(1, 12):
            pg.evaluate(f"window.scrollTo(0, {alto * i / 12})")
            pg.wait_for_timeout(750)
            cap(f"{i:02d}")
            if not cartel.is_visible():
                problemas.append(f"{nombre}: el cartel de propuesta se pierde al bajar")

        pg.locator("form").scroll_into_view_if_needed()
        rellenar(pg)
        pg.get_by_role("button", name=boton).click()
        pg.wait_for_timeout(500)
        mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text() if pg.locator("dialog[open]").count() else ""
        for e in esperados:
            if e not in mensaje:
                problemas.append(f"{nombre}: en el mensaje falta '{e}' -> {mensaje[:140]!r}")
        if "propuesta de diseño" not in pg.locator("dialog[open]").inner_text():
            problemas.append(f"{nombre}: la vista del mensaje no aclara que es una propuesta")
        cap("12-mensaje")
        pg.get_by_role("button", name="Cerrar").click()
        ancho = [pg.evaluate("document.documentElement.scrollWidth"), pg.viewport_size["width"]]
        if ancho[0] > ancho[1]:
            problemas.append(f"{nombre}: scroll horizontal ({ancho[0]} > {ancho[1]})")
        textos_afuera(pg, nombre, ignorar=".h-\\[300vh\\], [data-libre]")
    return recorrer


def altimetro(pg, nombre, cap):
    # La portada cuenta la altura mientras se baja: arriba de todo no llegó, al final marca 2100
    leer = lambda: pg.evaluate("Number(document.querySelector('main section span.tabular-nums').textContent)")
    antes = leer()
    pg.evaluate("window.scrollTo(0, innerHeight * 0.9)")
    pg.wait_for_timeout(900)
    despues = leer()
    cap("00b-altimetro")
    if not (antes < 2100 and despues == 2100):
        problemas.append(f"{nombre}: el altímetro pasó de {antes} a {despues} (esperaba menos de 2100 y después 2100)")


def circuito(pg, nombre, cap):
    altimetro(pg, nombre, cap)
    # El circuito se recorre de costado: al principio del tramo la pista está en 0 y al final corrió tres pantallas
    borde = lambda: pg.evaluate("document.querySelector('[data-pista]').getBoundingClientRect().left")
    tope = pg.evaluate("(() => { const t = document.querySelector('[data-pista]').closest('[data-libre]'); return [t.getBoundingClientRect().top + scrollY, t.offsetHeight] })()")
    pg.evaluate(f"window.scrollTo(0, {tope[0]})")
    pg.wait_for_timeout(700)
    antes = borde()
    cap("00c-circuito-1")
    for i, parte in enumerate((0.34, 0.67), 2):
        pg.evaluate(f"window.scrollTo(0, {tope[0]} + ({tope[1]} - innerHeight) * {parte})")
        pg.wait_for_timeout(700)
        cap(f"00c-circuito-{i}")
    pg.evaluate(f"window.scrollTo(0, {tope[0] + tope[1]} - innerHeight)")
    pg.wait_for_timeout(700)
    despues, ancho = borde(), pg.evaluate("innerWidth")
    cap("00c-circuito-4")
    if abs(antes) > 2 or abs(despues + 3 * ancho) > 4:
        problemas.append(f"{nombre}: el circuito no corre de costado (pista de {antes:.0f} a {despues:.0f}, esperaba 0 y {-3 * ancho})")
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(400)


def rellenar_condores(pg):
    pg.fill("input[name=dia]", "2026-11-14")
    pg.locator("label", has_text="13:00").click()
    for _ in range(2):
        pg.get_by_role("button", name="Sumar una persona").click()
    pg.fill("input[name=nombre]", "Prueba")


def rellenar_indio(pg):
    pg.locator("form label", has_text="Cena").click()
    pg.fill("input[name=dia]", "2026-11-14")
    pg.select_option("select[name=personas]", "4")
    pg.fill("input[name=nombre]", "Prueba")


def rellenar_hosteria(pg):
    pg.fill("input[name=llegada]", "2026-11-14")
    pg.fill("input[name=salida]", "2026-11-16")
    pg.select_option("select[name=personas]", "3")
    pg.fill("input[name=nombre]", "Prueba")
    pg.fill("input[name=alergias]", "Maní")


def palabras_hosteria(pg, nombre, cap):
    # La estadía en cuatro palabras: cada una tiene que traer su propio texto y su propia foto
    pg.locator("#estadia").scroll_into_view_if_needed()
    vistos = set()
    for palabra in ["Comer", "Practicar", "Caminar", "Dormir"]:
        pg.get_by_role("tab", name=palabra).click()
        pg.wait_for_timeout(300)
        vistos.add((pg.locator("[data-momento] h3").inner_text(), pg.get_attribute("#estadia img[data-activa=true]", "src")))
        if pg.get_by_role("tab", name=palabra).get_attribute("aria-selected") != "true":
            problemas.append(f"{nombre}: '{palabra}' no queda marcada al tocarla")
    pg.get_by_role("tab", name="Practicar").click()
    pg.wait_for_timeout(800)
    cap("00a-palabras")
    if len(vistos) != 4 or len({t for t, _ in vistos}) != 4 or len({f for _, f in vistos}) != 4:
        problemas.append(f"{nombre}: las cuatro palabras no cambian la foto y el texto -> {sorted(vistos)}")
    retiro_hosteria(pg, nombre, cap)


def retiro_hosteria(pg, nombre, cap):
    # "Consultar" en un retiro lo deja elegido en el formulario, sin fechas; después se vuelve a la estadía
    pg.locator("#retiros a", has_text="Consultar").nth(2).click()
    pg.wait_for_timeout(900)
    elegido = pg.input_value("select[name=motivo]")
    if elegido != "Música Medicina 3" or pg.locator("input[name=llegada]").count():
        problemas.append(f"{nombre}: al consultar un retiro quedó '{elegido}' o siguen las fechas")
    pg.get_by_role("button", name="Consultar por WhatsApp").click()
    pg.wait_for_timeout(500)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text() if pg.locator("dialog[open]").count() else ""
    if 'retiro "Música Medicina 3" (29 al 31 de enero de 2027)' not in mensaje:
        problemas.append(f"{nombre}: el mensaje del retiro salió mal -> {mensaje[:140]!r}")
    cap("00b-retiro")
    pg.get_by_role("button", name="Cerrar").click()
    pg.select_option("select[name=motivo]", "Una estadía")
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(500)


def rellenar_indio_anterior(pg):
    pg.select_option("select[name=que]", "Cena")
    pg.fill("input[name=dia]", "2026-11-14")
    pg.select_option("select[name=personas]", "4")
    pg.fill("input[name=nombre]", "Prueba")


def rellenar_indio_mejorada(pg):
    pg.locator("form label", has_text="Refugio de montaña").click()
    pg.fill("input[name=dia]", "2026-11-14")
    pg.select_option("select[name=noches]", "2")
    pg.select_option("select[name=personas]", "2")
    pg.fill("input[name=nombre]", "Prueba")


def extras_indio_mejorada(pg, nombre, cap):
    # El texto grande se enciende palabra por palabra al bajar
    tramo = pg.evaluate("(() => { const t = document.querySelector('[data-palabra]').closest('[data-libre]'); return [t.getBoundingClientRect().top + scrollY, t.offsetHeight] })()")
    leer = lambda: pg.evaluate("Number(getComputedStyle(document.querySelector('[data-palabra]')).opacity)")
    pg.evaluate(f"window.scrollTo({{top: {tramo[0]}, behavior: 'instant'}})")
    pg.wait_for_timeout(500)
    antes = leer()
    pg.evaluate(f"window.scrollTo({{top: {tramo[0] + tramo[1]} - innerHeight, behavior: 'instant'}})")
    pg.wait_for_timeout(500)
    despues = leer()
    cap("00a-frase")
    if not (antes < 0.5 and despues > 0.95):
        problemas.append(f"{nombre}: el texto no se revela al bajar ({antes:.2f} -> {despues:.2f})")
    # En celular, la barra de Reservar aparece después de la portada y se esconde en la reserva
    if pg.viewport_size["width"] < 768:
        barra = lambda: pg.locator("[data-barra]").count() and pg.locator("[data-barra]").is_visible()
        pg.evaluate("window.scrollTo({top: 0, behavior: 'instant'})"); pg.wait_for_timeout(500)
        arriba = barra()
        # sin desplazamiento suave: la página tiene scroll-behavior smooth y tarda en llegar
        pg.evaluate("document.getElementById('dia').scrollIntoView({behavior: 'instant'})"); pg.wait_for_timeout(900)
        en_el_dia = barra()
        cap("00b-barra")
        pg.evaluate("document.getElementById('reserva').scrollIntoView({behavior: 'instant'})"); pg.wait_for_timeout(900)
        en_reserva = barra()
        if arriba or not en_el_dia or en_reserva:
            problemas.append(f"{nombre}: la barra de abajo no aparece donde debe (portada {arriba}, día {en_el_dia}, reserva {en_reserva})")
    # "Consultar fechas" del refugio deja el refugio elegido en la comanda
    pg.locator("a", has_text="Consultar fechas").click()
    pg.wait_for_timeout(900)
    if not pg.locator("input[name=que][value='Refugio de montaña']").is_checked() or not pg.locator("select[name=noches]").count():
        problemas.append(f"{nombre}: 'Consultar fechas' no deja el refugio elegido")
    pg.locator("form label", has_text="Almuerzo").click()
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(400)


def castro(pg, nombre, cap):
    """Castro Inmobiliaria no entra en propuesta(): no tiene formulario —el contacto es un
    link directo— y sus fotos salen de su propio sitio, no de sus redes."""
    pg.goto(f"{BASE}propuestas/castro-inmobiliaria/", wait_until="networkidle")
    pg.wait_for_timeout(900)
    cap("00-portada")
    if "noindex" not in (pg.get_attribute("meta[name=robots]", "content") or ""):
        problemas.append(f"{nombre}: falta el noindex")
    cartel = pg.locator("aside[aria-label^='Aviso: propuesta']")
    if not cartel.is_visible() or "No es la página oficial" not in cartel.inner_text():
        problemas.append(f"{nombre}: no se ve el cartel de propuesta")
    # El gancho es el certificado vencido: sin la fecha, la propuesta no dice nada
    if "22 de octubre de 2026" not in pg.locator("body").inner_text():
        problemas.append(f"{nombre}: no aparece la fecha en que se les venció el certificado")

    alto = pg.evaluate("document.body.scrollHeight - innerHeight")
    for i in range(1, 12):
        pg.evaluate(f"window.scrollTo(0, {alto * i / 12})")
        pg.wait_for_timeout(750)
        cap(f"{i:02d}")
        if not cartel.is_visible():
            problemas.append(f"{nombre}: el cartel de propuesta se pierde al bajar")

    # Las ocho fotos tienen que haber pintado: un src roto deja la tarjeta en alto 0 y no se nota
    pg.wait_for_timeout(1200)
    fotos = pg.evaluate("[...document.querySelectorAll('figure img')].map(i => [i.getAttribute('src'), i.naturalWidth, Math.round(i.getBoundingClientRect().height)])")
    if len(fotos) != 8:
        problemas.append(f"{nombre}: esperaba las 8 fotos de sus propiedades y hay {len(fotos)}")
    for src, natural, dibujado in fotos:
        if not natural or dibujado < 60:
            problemas.append(f"{nombre}: la foto {src} no se dibujó (natural {natural}, alto {dibujado})")


PAGINAS = {
    "inicio": inicio,
    "cabanas": cabanas,
    "casa-tala": casa_tala,
    "condores": propuesta("mirador-de-los-condores", "Reservar por WhatsApp", rellenar_condores,
                          ["Circuito Aventura", "Día: sáb 14/11", "Turno: 13:00 h", "Personas: 4", "A nombre de: Prueba"], circuito),
    "indio": propuesta("cabeza-del-indio", "Reservar por WhatsApp", rellenar_indio,
                       ["Cabeza del Indio", "Reserva: Cena", "Día: sáb 14/11", "Personas: 4", "A nombre de: Prueba"]),
    "indio-anterior": propuesta("cabeza-del-indio-anterior", "Reservar por WhatsApp", rellenar_indio_anterior,
                                ["Cabeza del Indio", "Reserva: Cena", "Día: sáb 14/11", "Personas: 4", "A nombre de: Prueba"]),
    "indio-mejorada": propuesta("cabeza-del-indio-mejorada", "Reservar por WhatsApp", rellenar_indio_mejorada,
                                ["Cabeza del Indio", "Reserva: Refugio de montaña", "Llegada: sáb 14/11 · Noches: 2", "Personas: 2", "A nombre de: Prueba"], extras_indio_mejorada),
    "castro": castro,
    "hosteria": propuesta("hosteria-vegetariana", "Consultar por WhatsApp", rellenar_hosteria,
                          ["estadía en la Hostería Vegetariana", "Llegada: sáb 14/11", "Salida: lun 16/11", "Personas: 3", "A nombre de: Prueba", "Alergias: Maní"], palabras_hosteria),
}
DISPOSITIVOS = {
    "movil": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "pc": dict(viewport={"width": 1440, "height": 900}),
}

with sync_playwright() as p:
    for pagina, recorrer in PAGINAS.items():
        if SOLO and pagina != SOLO:
            continue
        for disp, opciones in DISPOSITIVOS.items():
            nombre = f"{pagina}-{disp}"
            nav = p.chromium.launch()
            pg = nav.new_context(**opciones, locale="es-AR", timezone_id="America/Argentina/San_Luis").new_page()
            pg.route(f"{BASE}**", servir)
            errores, caidos = [], []
            pg.on("console", lambda m, e=errores: m.type == "error" and e.append(m.text))
            pg.on("pageerror", lambda x, e=errores: e.append(str(x)))
            pg.on("response", lambda r, c=caidos: r.status >= 400 and c.append(f"{r.status} {r.url}"))
            recorrer(pg, nombre, lambda n, pg=pg, nombre=nombre: pg.screenshot(path=str(OUT / f"{nombre}-{n}.png")))
            problemas += [f"{nombre}: consola: {e[:200]}" for e in errores] + [f"{nombre}: {c}" for c in caidos]
            print(nombre, "recorrida")
            nav.close()

problemas += [f"foto pesada: {f.relative_to(DIST)} {f.stat().st_size // 1024} KB" for f in DIST.rglob("fotos/*") if f.stat().st_size > 400_000]
print("PROBLEMAS:" if problemas else "TODO OK", *problemas, sep="\n  ")
sys.exit(1 if problemas else 0)
