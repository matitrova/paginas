"""Recorre las páginas de muestra ya compiladas (dist/) en celular y compu, sin servidor:
Playwright sirve los archivos desde el disco. Saca capturas y termina con error si algo no anda.

Uso:  npm run build && ../Test1_Inmo/.venv/bin/python scripts/verificar.py [carpeta-de-capturas] [página]
      (la carpeta va primero; la página, por ejemplo "castro", es el segundo argumento)
"""
import ast
import mimetypes
import re
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


# Las erratas de su sitio que corrige scripts/castro_datos.py, leídas de su código sin ejecutarlo (importarlo corre todo
# el armado de datos): una sola lista. Si cambia de forma, esto rompe en vez de comparar sin corregir.
ERRATAS_CASTRO = ast.literal_eval(re.search(r"for mal, bien in (\{.*?\})\.items\(\)", (Path(__file__).resolve().parent / "castro_datos.py").read_text()).group(1))


def castro_whatsapp(pg, sel):
    """El link de WhatsApp de un botón tal como queda al tocarlo (algunos lo arman en ese momento), sin abrir nada:
    se cancela la navegación antes de que el navegador la haga. Devuelve (número, texto) o (None, "")."""
    from urllib.parse import parse_qs, urlparse as _url
    href = pg.evaluate("""(sel) => { const a = document.querySelector(sel); if (!a) return null;
        const parar = e => e.preventDefault(); document.addEventListener('click', parar, { capture: true, once: true });
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return a.getAttribute('href') }""", sel)
    if not href or not href.startswith("https://wa.me/"):
        return None, href or ""
    u = _url(href)
    return u.path.strip("/"), parse_qs(u.query).get("text", [""])[0]


def castro(pg, nombre, cap):
    """La propuesta de Castro Inmobiliaria en su versión básica (30/10: "como la de ellos pero mejor hecha"): su
    recorrido, sus textos sin erratas, su mapa dibujado de loteos y WhatsApp directo. Lo esperado sale del mismo índice
    que usa la página, así que si la página filtra o cuenta mal, esto falla. El lote y el pin de cada ficha los prueba
    castro_mapa."""
    import json
    import re

    raiz = f"{BASE}propuestas/castro-inmobiliaria/"
    indice = json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/indice.json").read_text())
    sitio = json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/sitio.json").read_text())
    pedidos = []
    pg.on("request", lambda r: pedidos.append(r.url))
    venta = [x for x in indice if "venta" in x["operacion"]]
    terrenos = sum(x["tipo"] == "Terreno" for x in venta)
    movil = pg.viewport_size["width"] < 768
    roto = re.compile(r"\b0 m²|\b\d+(\.\d+)? ?HA\b|NaN|undefined|null|Sin datos|\b0 (dorm|baño)")
    erratas = [*ERRATAS_CASTRO, "QUIENES SOMOS"]  # las que corrige castro_datos.py, y la tilde que les falta

    def ir(q, espera=700):
        pedidos.clear()
        pg.goto(raiz + q, wait_until="networkidle")
        pg.wait_for_timeout(espera)
        texto = pg.locator("body").inner_text()
        if (m := roto.search(texto)):
            problemas.append(f"{nombre}: dato roto a la vista en '{q or 'portada'}': «{m.group(0)}»")
        if (h1 := pg.locator("h1").count()) != 1:
            problemas.append(f"{nombre}: '{q or 'portada'}' tiene {h1} h1 y tiene que tener uno")
        if malas := [e for e in erratas if e in texto]:
            problemas.append(f"{nombre}: '{q or 'portada'}' muestra erratas de su sitio sin corregir: {malas}")
        # Lo que se sacó en la versión básica no vuelve
        if pg.locator("[data-guardar], [data-mensaje], [data-ver-3d], [data-cercano], [data-altura], [data-mapa-general]:not(article [data-mapa-general])").count() or any("maplibre" in u for u in pedidos):
            problemas.append(f"{nombre}: en '{q or 'portada'}' volvió algo de lo que se sacó (favoritas, vista del mensaje, 3D, a cuánto queda o el mapa de todas)")
        textos_afuera(pg, f"{nombre} {q or 'portada'}")
        return texto

    def resultados():
        return int(pg.locator("[data-resultados]").get_attribute("data-resultados"))

    def whatsapp(sel, donde, deben):
        numero, texto = castro_whatsapp(pg, sel)
        if numero != "5492665024444" or any(d not in texto for d in deben):
            problemas.append(f"{nombre}: el WhatsApp de {donde} no abre el chat de la inmobiliaria con {deben}: {numero} «{texto[:90]}»")

    # Portada, en su orden: su foto de Merlo con su frase y los tres botones, sus destacadas, los 40 años, el museo y su
    # mapa dibujado de loteos
    texto = ir("", 1000)
    cap("01-portada")
    if "noindex" not in (pg.get_attribute("meta[name=robots]", "content") or ""):
        problemas.append(f"{nombre}: falta el noindex")
    cartel = pg.locator("aside[aria-label^='Aviso: propuesta']")
    if not cartel.is_visible() or "No es la página oficial" not in cartel.inner_text():
        problemas.append(f"{nombre}: no se ve el cartel de propuesta")
    if re.search(r"no abre|certificado|22 de octubre", texto, re.I):
        problemas.append(f"{nombre}: volvió a aparecer el aviso de que su página no anda")
    if pg.locator("h1").inner_text().strip() != " ".join(sitio["inicio"]["titular"].split()):
        problemas.append(f"{nombre}: el titular de la portada no es su frase: «{pg.locator('h1').inner_text()}»")
    if not pg.evaluate("(() => { const i = document.querySelector('[data-portada] img'); return !!i && i.complete && i.naturalWidth > 0 && i.currentSrc.includes('portada-merlo') })()"):
        problemas.append(f"{nombre}: no se ve su foto de Merlo arriba de la portada")
    botones = pg.locator("[data-botones-portada] a").evaluate_all("es => es.map(e => [e.textContent.trim(), e.getAttribute('href')])")
    if botones != [["Comprar", "?ver=propiedades"], ["Vender", "?ver=vender"], ["Alquilar", "?ver=propiedades&op=alquiler"]]:
        problemas.append(f"{nombre}: los botones de la portada no son Comprar / Vender / Alquilar a su lugar: {botones}")
    destacadas = sorted((x for x in indice if x["destacada"]), key=lambda x: x["alta"], reverse=True)[:6]
    if pg.locator("[data-destacadas] [data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.tarjeta)") != [x["id"] for x in destacadas]:
        problemas.append(f"{nombre}: las destacadas de la portada no son sus 6 destacadas más nuevas")
    for clave in ("experiencia_titulo", "museo_titulo"):
        if sitio["inicio"][clave] not in texto:
            problemas.append(f"{nombre}: a la portada le falta «{sitio['inicio'][clave]}»")
    if any("leaflet" in u for u in pedidos):
        problemas.append(f"{nombre}: la portada baja Leaflet y no tiene ningún mapa que lo use")
    # Su mapa dibujado: 22 logos que llevan a cada urbanización, y las imágenes se dibujan
    pg.locator("[data-mapa-urbanizaciones]").scroll_into_view_if_needed()
    pg.wait_for_timeout(1200)
    pines = pg.locator("[data-mapa-urbanizaciones] [data-pin]").evaluate_all("es => es.map(e => e.getAttribute('href'))")
    if len(pines) != 22 or any(not h.startswith("?u=") for h in pines):
        problemas.append(f"{nombre}: su mapa de urbanizaciones tiene {len(pines)} logos o alguno no lleva a su página")
    if not pg.evaluate("[...document.querySelectorAll('[data-mapa-urbanizaciones] img')].every(i => i.naturalWidth > 0)"):
        problemas.append(f"{nombre}: alguna imagen de su mapa de urbanizaciones no se dibujó")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(400)
    if not cartel.is_visible():
        problemas.append(f"{nombre}: el cartel de propuesta se pierde al bajar")
    whatsapp("[data-whatsapp-flotante]", "la portada", ["Hola"])
    # En el celular, los tres botones de la portada no quedan debajo del WhatsApp flotante
    if movil:
        tapado = pg.evaluate("""() => { window.scrollTo(0, 0); const w = document.querySelector('[data-whatsapp-flotante]').getBoundingClientRect();
          return [...document.querySelectorAll('[data-botones-portada] a')].filter(e => { const r = e.getBoundingClientRect();
            return r.left < w.right && w.left < r.right && r.top < w.bottom && w.top < r.bottom }).map(e => e.textContent) }""")
        if tapado:
            problemas.append(f"{nombre}: el WhatsApp flotante tapa {tapado} en la portada")
    # La vista previa del link dice los números de los datos
    og = re.search(r'og:description" content="([^"]*)"', (DIST / "propuestas/castro-inmobiliaria/index.html").read_text()).group(1)
    if re.findall(r"(\d+) propiedades|(\d+) terrenos con su forma", og) != [(str(len(indice)), ""), ("", str(sum(bool(x.get("mini")) for x in indice)))]:
        problemas.append(f"{nombre}: la vista previa del link no dice las propiedades y los terrenos con forma de los datos: «{og}»")

    # Listado (su "Comprar"): sin mapa, con "Simplificá tu búsqueda". En el celular la primera propiedad se ve sin bajar
    ir("?ver=propiedades")
    cap("02-listado")
    if pg.title() != "Propiedades en Merlo y la zona · Castro Inmobiliaria":
        problemas.append(f"{nombre}: el título de la pestaña del listado es «{pg.title()}»")
    if resultados() != len(venta):
        problemas.append(f"{nombre}: el listado de venta muestra {resultados()} y son {len(venta)}")
    if pg.locator("[data-mapa-general], [data-abrir-mapa]").count() or any("leaflet" in u for u in pedidos):
        problemas.append(f"{nombre}: el listado volvió a tener mapa")
    if movil:
        tam = pg.viewport_size
        zona = max({x["zona"] for x in venta if x["tipo"] == "Casa" and x["zona"]}, key=lambda z: sum(x["zona"] == z and x["tipo"] == "Casa" for x in venta))
        for w, h in [(390, 844), (375, 667)]:
            pg.set_viewport_size({"width": w, "height": h})
            for q in ("?ver=propiedades", f"?ver=propiedades&tipo=Casa&zona={zona}"):
                ir(q)
                m = pg.evaluate("""() => { const r = s => document.querySelector(s).getBoundingClientRect();
                  return { foto: r('[data-tarjeta]').top, flotante: r('[data-whatsapp-flotante]').top } }""")
                if m["foto"] + 120 > m["flotante"]:
                    problemas.append(f"{nombre}: en {w}x{h} ('{q}') la primera tarjeta no se ve sin bajar: {m}")
        pg.set_viewport_size(tam)
        if pg.locator("select[name=zona]").is_visible() or pg.locator("[data-ver-filtros]").inner_text().strip() != "Filtros · 1":
            problemas.append(f"{nombre}: en el celular los desplegables tienen que ir cerrados, con «Filtros · 1» al haber una zona elegida")
        pg.locator("[data-ver-filtros]").click()
        if not pg.locator("select[name=zona]").is_visible() or pg.input_value("select[name=zona]") != zona:
            problemas.append(f"{nombre}: el botón 'Filtros' no muestra los desplegables con la zona elegida")
        ir("?ver=propiedades")
    elif pg.locator("[data-ver-filtros]").is_visible() or not pg.locator("select[name=precio]").is_visible():
        problemas.append(f"{nombre}: en la compu los desplegables van a la vista, sin el botón 'Filtros'")
    pg.locator("[data-filtro-tipo='Terreno']").click()
    pg.wait_for_timeout(300)
    if resultados() != terrenos or "tipo=Terreno" not in pg.url:
        problemas.append(f"{nombre}: filtrar terrenos da {resultados()} y son {terrenos} (url {pg.url})")
    whatsapp("[data-whatsapp-flotante]", "el listado", ["terrenos en venta", "tipo=Terreno"])
    mini = {x["id"] for x in indice if x.get("mini")}
    mal = [i for i, src in pg.locator("[data-tarjeta]").evaluate_all("es => es.map(e => [e.dataset.tarjeta, e.querySelector('img').getAttribute('src')])")
           if (f"lote-tarjeta-{i}." in src) != (i in mini)]
    if mal:
        problemas.append(f"{nombre}: tarjetas de terreno con la imagen equivocada (lote o foto): {mal[:5]}")
    if movil:
        pg.locator("[data-ver-filtros]").click()
    pg.select_option("select[name=precio]", "50000-100000")
    pg.wait_for_timeout(300)
    precios = [int(x) for x in pg.locator("[data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.precio)")]
    if not precios or any(not 50000 <= x < 100000 for x in precios):
        problemas.append(f"{nombre}: el filtro de precio deja pasar {precios[:5]}")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(500)
    if resultados() != len(precios):
        problemas.append(f"{nombre}: al recargar se pierden los filtros ({resultados()} != {len(precios)})")

    ir("?ver=propiedades&orden=menor")
    precios = [int(x) for x in pg.locator("[data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.precio)")[:20] if x]
    if precios != sorted(precios):
        problemas.append(f"{nombre}: 'menor precio' no ordena: {precios[:8]}")
    tarjetas = pg.locator("[data-tarjeta]").count()
    pg.locator("[data-ver-mas]").click()
    pg.wait_for_timeout(400)
    if pg.locator("[data-tarjeta]").count() <= tarjetas or "n=" not in pg.url:
        problemas.append(f"{nombre}: 'Ver más' no suma tarjetas o no queda en la dirección")
    pg.locator("[data-tarjeta]").nth(40).scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    abierta = pg.locator("[data-tarjeta]").nth(40).get_attribute("data-tarjeta")
    pg.locator("[data-tarjeta]").nth(40).click()
    pg.wait_for_load_state("networkidle")
    if f"p={abierta}" not in pg.url:
        problemas.append(f"{nombre}: la tarjeta no abre su ficha ({pg.url})")
    pg.go_back(wait_until="networkidle")
    pg.wait_for_timeout(800)
    caja = pg.locator(f"[data-tarjeta='{abierta}']").bounding_box()
    if "orden=menor" not in pg.url or pg.locator("[data-tarjeta]").count() <= tarjetas or not caja or not 0 <= caja["y"] < pg.viewport_size["height"] - 100:
        problemas.append(f"{nombre}: al volver de la ficha la tarjeta tocada no queda a la vista (url {pg.url}, tarjeta en {caja and round(caja['y'])})")

    # Lo que encontraron las revisiones: que no vuelva
    casa = next(x for x in indice if x["cubierta"] and x["construido"] and x["construido"] - x["cubierta"] > 20 and x["tipo"] == "Casa" and "venta" in x["operacion"])
    ir("?ver=propiedades&tipo=Casa&n=200")
    texto_casa = pg.locator(f"[data-tarjeta='{casa['id']}']").inner_text()
    if f"{round(casa['cubierta'])} m² cub." not in texto_casa.replace(".", "").replace(" m² cub", " m² cub."):
        problemas.append(f"{nombre}: la tarjeta {casa['id']} no muestra su superficie cubierta ({casa['cubierta']} m²)")
    texto = ir("?ver=propiedades&tipo=Campo")
    if "USD 0 el m²" in texto or "USD 1 el m²" in texto or "la ha" not in texto:
        problemas.append(f"{nombre}: los campos no muestran el precio por hectárea")
    ir("?ver=propiedades&op=alquiler&orden=menor")
    precios_alq = pg.locator("[data-tarjeta] [data-precio-texto]").all_inner_texts()
    if not precios_alq or any(a.startswith("USD") and b.startswith("$") for a, b in zip(precios_alq, precios_alq[1:])):
        problemas.append(f"{nombre}: en alquileres, el orden por precio mezcla dólares y pesos: {precios_alq[:6]}")
    for q, precio_esperado in [("?ver=propiedades&op=alquiler&tipo=Departamento", "$ 600.000"), ("?ver=propiedades&tipo=Departamento", "USD 78.000")]:
        ir(q)
        if precio_esperado not in pg.locator("[data-tarjeta='7665257']").inner_text():
            problemas.append(f"{nombre}: la 7665257 no muestra {precio_esperado} en {q}")
    solo_casas = next(z for z in {x["zona"] for x in venta} if z and all(x["tipo"] != "Terreno" for x in venta if x["zona"] == z))
    ir(f"?ver=propiedades&zona={solo_casas}")
    pg.locator("[data-filtro-tipo='Terreno']").click()
    pg.wait_for_timeout(300)
    if resultados() != terrenos:
        problemas.append(f"{nombre}: elegir Terrenos con la zona {solo_casas} (sin terrenos) deja {resultados()} resultados")
    ir("?ver=propiedades")
    pg.fill("[data-buscar]", "CHO7876886")
    pg.wait_for_timeout(400)
    if resultados() != 1 or not pg.locator("[data-tarjeta='7876886']").count():
        problemas.append(f"{nombre}: buscar CHO7876886 da {resultados()} resultados")
    ir("?ver=propiedades&op=alquiler&precio=300000-600000")
    alq = [x for x in indice if "alquiler" in x["operacion"] and x["precios"].get("alquiler", [None, ""])[1] == "ARS" and 300000 <= (x["precios"]["alquiler"][0] or -1) < 600000]
    if resultados() != len(alq) or not alq:
        problemas.append(f"{nombre}: alquileres de $ 300.000 a 600.000 da {resultados()} y en los datos hay {len(alq)}")

    # Fichas con casos difíciles de sus datos
    for ident, debe, no_debe in [("6601604", "47 ha", "470000"), ("12024296", None, None), ("7665257", "Venta USD 78.000", None)]:
        texto = ir(f"?p={ident}", 1200)
        if debe and debe not in texto:
            problemas.append(f"{nombre}: la ficha {ident} no muestra «{debe}»")
        if no_debe and no_debe in texto:
            problemas.append(f"{nombre}: la ficha {ident} muestra «{no_debe}»")

    # La ficha, en su orden: fotos, título y precio, información, superficies, descripción, adicionales, servicios,
    # ubicación (el lote o el pin) y búsquedas relacionadas; la consulta al costado en la compu y abajo en el celular
    texto = ir("?p=7876886", 1500)
    cap("03-ficha")
    ficha = json.loads((DIST / "propuestas/castro-inmobiliaria/fichas/7876886.json").read_text())
    titulo = next(x["titulo"] for x in indice if x["id"] == "7876886")
    if pg.locator("h1").inner_text().strip() != titulo:
        problemas.append(f"{nombre}: el título de la ficha no es el publicado")
    orden = [t for t in ["Información general", "Superficies y medidas", "Descripción", "Adicionales", "Servicios", "Ubicación"]
             if t.upper() in texto.upper()]
    posiciones = [texto.upper().find(t.upper()) for t in orden]
    if len(orden) < 6 or posiciones != sorted(posiciones):
        problemas.append(f"{nombre}: la ficha no sigue su orden (información, superficies, descripción, adicionales, servicios, ubicación): {orden}")
    contador = pg.locator("[data-contador]").inner_text()
    if contador.replace(" ", "") != f"1/{len(ficha['fotos'])}":
        problemas.append(f"{nombre}: la galería arranca en «{contador}» y tiene {len(ficha['fotos'])} fotos")
    pg.locator("[data-galeria]").evaluate("e => e.scrollTo({left: e.clientWidth, behavior: 'instant'})")
    pg.wait_for_timeout(400)
    if not pg.locator("[data-contador]").inner_text().replace(" ", "").startswith("2/"):
        problemas.append(f"{nombre}: al deslizar la galería el contador no pasa a 2")
    if pg.evaluate("[...document.querySelectorAll('[data-galeria] img')].slice(0, 2).every(i => i.complete && i.naturalWidth > 0)") is not True:
        problemas.append(f"{nombre}: las primeras fotos de la galería no se dibujaron")
    letra = pg.evaluate("getComputedStyle(document.querySelector('h1')).fontFamily")
    if "Montserrat" not in letra:
        problemas.append(f"{nombre}: el título de la ficha va en {letra} y tiene que ir en Montserrat, la letra de su sitio")
    whatsapp("[data-whatsapp-ficha]" if movil else "[data-consultar]", "la ficha", ["CHO7876886", titulo, "/p/7876886/"])
    if movil != pg.locator("[data-barra-contacto]").is_visible():
        problemas.append(f"{nombre}: la barra de Llamar y WhatsApp tiene que verse solo en el celular")
    if pg.locator("a[href^='tel:']").first.get_attribute("href") != "tel:+542665024444":
        problemas.append(f"{nombre}: el botón de llamar marca {pg.locator('a[href^=tel:]').first.get_attribute('href')}")
    parecidas = pg.locator("[data-parecidas] [data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.tarjeta)")
    if len(parecidas) != 3 or "7876886" in parecidas:
        problemas.append(f"{nombre}: las búsquedas relacionadas no son 3 distintas de la propia: {parecidas}")
    if pg.locator("[data-whatsapp-flotante]").count():
        problemas.append(f"{nombre}: en la ficha aparece el WhatsApp flotante encima de la barra de contacto")
    pg.locator("[data-ver-grande]").click()
    pg.wait_for_timeout(500)
    if not pg.locator("[data-galeria-grande][open]").count() or not pg.evaluate("[...document.querySelectorAll('[data-galeria-grande] img[src]')].some(i => i.naturalWidth > 0)"):
        problemas.append(f"{nombre}: la galería a pantalla completa no abre o no muestra la foto")
    cap("03c-galeria-grande")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    if pg.locator("[data-galeria-grande][open]").count():
        problemas.append(f"{nombre}: la galería a pantalla completa no se cierra con Escape")
    mapa = pg.locator("[data-mapa]").get_attribute("href") or ""
    if not pg.locator("[data-mapa-ficha]").count() or not re.search(r"destination=-3[23]\.\d+,-6[45]\.\d+", mapa):
        problemas.append(f"{nombre}: la ficha no trae el mapa y 'Cómo llegar' con su ubicación ({mapa[:80]})")
    if not movil and ("mailto:" not in (pg.locator("[data-mail]").get_attribute("href") or "") or "CHO7876886" not in (pg.locator("[data-mail]").get_attribute("href") or "")):
        problemas.append(f"{nombre}: falta 'Prefiero que me escriban por mail' con el código de la propiedad")

    # El link para compartir: trae su foto y su precio para la vista previa, y lleva a la ficha
    compartir = (DIST / "propuestas/castro-inmobiliaria/p/7876886/index.html").read_text()
    if 'og:image" content="https://static.tokkobroker.com' not in compartir or titulo not in compartir:
        problemas.append(f"{nombre}: el link para compartir la 7876886 no trae foto o título para la vista previa")
    pg.goto(raiz + "p/7876886/", wait_until="networkidle")
    if "p=7876886" not in pg.url:
        problemas.append(f"{nombre}: el link para compartir no lleva a la ficha ({pg.url})")

    # Si el servicio de fotos de ellos falla, la ficha queda con la portada propia y sin fotos rotas (página aparte, para
    # que sus errores de carga, esperados, no se cuenten como problemas)
    otra = pg.context.new_page()
    otra.route(f"{BASE}**", servir)
    otra.route("**/static.tokkobroker.com/**", lambda r: r.abort())
    otra.goto(raiz + "?p=7876886", wait_until="networkidle")
    otra.wait_for_timeout(1500)
    rotas = otra.evaluate("[...document.querySelectorAll('[data-galeria] img[src]')].filter(i => !i.naturalWidth).length")
    visibles = otra.evaluate("[...document.querySelectorAll('[data-galeria] img')].filter(i => i.naturalWidth).length")
    if rotas or not visibles:
        problemas.append(f"{nombre}: sin el servicio de fotos quedan {rotas} rotas y {visibles} a la vista")
    otra.close()

    texto = ir("?p=999")
    if "ya no está publicada" not in texto:
        problemas.append(f"{nombre}: una propiedad que no existe no avisa que ya no está publicada")

    # Urbanizaciones: su mapa dibujado y las 22; cada una con sus propiedades y la consulta por WhatsApp
    ir("?ver=urbanizaciones")
    cap("05-urbanizaciones")
    if pg.locator("[data-urbanizacion]").count() != 22 or pg.locator("[data-mapa-urbanizaciones] [data-pin]").count() != 22:
        problemas.append(f"{nombre}: en Urbanizaciones hay {pg.locator('[data-urbanizacion]').count()} tarjetas y {pg.locator('[data-mapa-urbanizaciones] [data-pin]').count()} logos, y son 22")
    ids = {x["id"] for x in indice}
    for u in [x for x in sitio["urbanizaciones"] if x["id"] in ("29734", "61954", "61818")]:
        ir(f"?u={u['id']}")
        esperadas = len([i for i in u["propiedades"] if i in ids])
        if pg.locator("[data-tarjeta]").count() != esperadas:
            problemas.append(f"{nombre}: la urbanización {u['nombre']} muestra {pg.locator('[data-tarjeta]').count()} y tiene {esperadas}")
        if u["id"] == "29734":
            whatsapp("[data-consultar-urbanizacion]", "la urbanización", ["urbanización"])

    # Quiénes somos: su texto, el equipo con la matrícula como la publican y el museo
    texto = ir("?ver=nosotros", 1000)
    cap("06-nosotros")
    if sitio["nosotros"]["texto"][:60] not in texto or pg.locator("[data-equipo] li").count() != 5 or "Matrícula -" in texto:
        problemas.append(f"{nombre}: Quiénes somos no trae su texto o el equipo no son las 5 personas")
    if "CMCPSL" in (equipo := pg.locator("[data-equipo]").inner_text()) or "Matrícula 881" not in equipo:
        problemas.append(f"{nombre}: las matrículas del equipo no van como las publican: {equipo[:120]!r}")
    if pg.locator("[data-museo] img").count() < 4:
        problemas.append(f"{nombre}: el museo de Quiénes somos no muestra sus fotos")

    # Contacto y Vender: el botón abre el WhatsApp de la inmobiliaria con lo que se completó
    ir("?ver=contacto")
    if not pg.locator("img[src*=imagcontact]").count():
        problemas.append(f"{nombre}: la foto de la fachada no está en Contacto")
    pg.fill("[data-formulario] [name=nombre]", "Prueba")
    pg.select_option("[data-formulario] [name=motivo]", "Quiero vender o tasar")
    whatsapp("[data-formulario] [data-enviar]", "el formulario de contacto", ["Prueba", "Motivo: Quiero vender o tasar"])
    cap("07-contacto")
    ir("?ver=vender")
    cap("09-vender")
    if sitio["vender"]["titular"] not in pg.locator("h1").inner_text():
        problemas.append(f"{nombre}: Vender no lleva su titular")
    pg.fill("[data-formulario-vender] [name=nombre]", "Prueba")
    pg.select_option("[data-formulario-vender] [name=tipo]", "Casa")
    pg.fill("[data-formulario-vender] [name=direccion]", "Barrio Rincón del Este")
    whatsapp("[data-formulario-vender] [data-enviar]", "el formulario de vender", ["Prueba", "Tipo: Casa", "Dirección: Barrio Rincón del Este"])

    # El menú entero desde 1024 px, sin pisarse
    if not movil:
        tam = pg.viewport_size
        pg.set_viewport_size({"width": 1024, "height": 768})
        pg.wait_for_timeout(200)
        r = pg.evaluate("""() => { const h = document.querySelector('header > div'), cajas = [...h.children].filter(e => e.offsetWidth).map(e => e.getBoundingClientRect());
          return { menu: !!document.querySelector('header nav').offsetWidth, pisan: cajas.some((a, i) => i && a.left < cajas[i - 1].right - 1), sale: h.scrollWidth > h.clientWidth } }""")
        if not r["menu"] or r["pisan"] or r["sale"]:
            problemas.append(f"{nombre}: en 1024 px el menú no entra en el encabezado: {r}")
        pg.set_viewport_size(tam)


def castro_mapa(pg, nombre, cap):
    """El mapa de cada ficha de Castro (Actualizaciones 10, 12 y 14). Se prueba con el 7973638 porque su foto SÍ se corre
    (calce 4 m al este y 2 al norte): con calce y sin calce, el lote tiene que quedar en el mismo lugar y la foto
    correrse justo los píxeles que dan esos metros en ese zoom. Lo esperado sale del JSON de la ficha."""
    import json
    import math

    raiz = f"{BASE}propuestas/castro-inmobiliaria/"
    fichas = DIST / "propuestas/castro-inmobiliaria/fichas"
    indice = {x["id"]: x for x in json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/indice.json").read_text())}
    # Las fichas sin lote se eligen por los datos (no fijas), así los chequeos siguen andando cuando entran lotes nuevos:
    # sin punto compartido, la de foto más corrida (la primera si empatan): con calce y sin calce el pin no se tiene que
    # mover, y con calce [0,0] eso no probaría nada. Después, la primera con punto compartido y, si hay, la primera casa
    # (o local, etc.) y el primer campo con lote
    mapas = {i: json.loads((fichas / f"{i}.json").read_text()).get("mapa") or {} for i in indice}
    sin_lote = [i for i, m in mapas.items() if not m.get("lote")]
    propios = [i for i in sin_lote if not (mapas[i].get("zona") or {}).get("compartido")]
    solo = max(propios, key=lambda i: math.hypot(*(mapas[i].get("calce") or [0, 0])), default=None)
    mismo = next((i for i in sin_lote if (mapas[i].get("zona") or {}).get("compartido")), None)
    casa_lote = next((i for i, m in mapas.items() if m.get("lote") and indice[i]["tipo"] not in ("Terreno", "Campo")), None)
    campo_lote = next((i for i, m in mapas.items() if m.get("lote") and indice[i]["tipo"] == "Campo"), None)
    if not solo or not mismo:
        problemas.append(f"{nombre}: no hay una ficha sin lote con punto propio ({solo}) y otra con punto compartido ({mismo}) para probar el pin")
        return
    pedidos, fotos = [], []
    pg.on("request", lambda r: pedidos.append(r.url))
    pg.on("response", lambda r: "World_Imagery" in r.url and r.status == 200 and fotos.append(r))

    def coma(x):
        return f"{x:g}".replace(".", ",")

    def superficie(m2):
        return f"{m2 / 10000:.1f}".rstrip("0").rstrip(".").replace(".", ",") + " ha" if m2 >= 10000 else f"{round(m2):,}".replace(",", ".") + " m²"

    def abrir(ident, extra=""):
        pedidos.clear()
        fotos.clear()
        pg.goto(f"{raiz}?p={ident}{extra}", wait_until="networkidle")
        pg.locator("[data-mapa-ficha]").scroll_into_view_if_needed()
        try:
            pg.wait_for_selector("[data-mapa-listo]", timeout=20000)
        except Exception:
            problemas.append(f"{nombre}: el mapa de la ficha {ident}{extra} no terminó de cargar")
            return False
        pg.wait_for_timeout(800)
        return True

    def medir():
        return pg.evaluate("""() => {
          // Todo relativo al mapa: si la página quedó scrolleada distinto entre una carga y otra, no cambia nada
          const m = document.querySelector('[data-mapa-ficha]').getBoundingClientRect();
          const caja = r => { const b = r.getBoundingClientRect(); return [b.left - m.left, b.top - m.top, b.width, b.height] };
          const pane = document.querySelector('.leaflet-foto-pane');
          return { lote: [...document.querySelectorAll('.lote')].map(caja), mapa: [0, 0, m.width, m.height],
                   calce: pane.dataset.calce, vista: pane.dataset.vista,
                   tiles: Object.fromEntries([...pane.querySelectorAll('img.leaflet-tile-loaded')].map(i => [i.src, caja(i)])),
                   lados: [...document.querySelectorAll('.lado span')].map(e => [e.textContent, ...caja(e)]) } }""")

    def pedidos_a_google():
        return [u for u in pedidos if "google.com/maps" in u or "maps.google" in u or "maps.googleapis" in u]

    # Terreno con forma: el lote, la trama, los lados y el calce
    t = "7973638"
    ficha = json.loads((fichas / f"{t}.json").read_text())
    m = ficha.get("mapa")
    if not m or not m.get("lote") or not m.get("calce"):
        problemas.append(f"{nombre}: la ficha {t} no trae el lote y el calce para el mapa")
        return
    if not abrir(t, "&calce=0"):
        return
    sin = medir()
    if not abrir(t):
        return
    con = medir()
    cap("mapa-terreno")
    zoom, lat = (float(x) for x in con["vista"].split(",")[:2])
    # El zoom y la latitud que dice el pane no se creen así nomás: el ancho del lote en pantalla tiene que dar ese zoom
    lngs, lats = [x for x, _ in m["lote"]], [y for _, y in m["lote"]]
    ancho = (max(lngs) - min(lngs)) / 360 * 256 * 2**zoom
    if len(con["lote"]) != 1 or abs(con["lote"][0][2] - ancho) > max(2, ancho * 0.03) or abs(lat - sum(lats) / len(lats)) > 0.005:
        problemas.append(f"{nombre}: el pane dice zoom {zoom} y latitud {lat}, pero el lote mide {con['lote'][:1]} px y en ese zoom serían {round(ancho)} de ancho")
    mpp = 156543.03392 * math.cos(math.radians(lat)) / 2**zoom
    esperado = [math.floor(m["calce"][0] / mpp + 0.5), math.floor(-m["calce"][1] / mpp + 0.5)]  # como Math.round
    if not any(esperado):
        problemas.append(f"{nombre}: el calce del {t} da 0 píxeles en el zoom {zoom}: el chequeo no probaría nada")
    if sin["calce"] != "0,0" or con["calce"] != f"{esperado[0]},{esperado[1]}":
        problemas.append(f"{nombre}: el pane de la foto dice {con['calce']} con calce y {sin['calce']} sin calce; se esperaba {esperado} y 0,0")
    # Lo que de verdad se movió: las mismas imágenes de la foto, medidas en pantalla con y sin calce
    comunes = [u for u in con["tiles"] if u in sin["tiles"]]
    corridas = {(round(con["tiles"][u][0] - sin["tiles"][u][0], 1), round(con["tiles"][u][1] - sin["tiles"][u][1], 1)) for u in comunes}
    if not comunes or any(abs(dx - esperado[0]) > 0.5 or abs(dy - esperado[1]) > 0.5 for dx, dy in corridas):
        problemas.append(f"{nombre}: la foto se corrió {sorted(corridas)[:3]} px y tenía que correrse {esperado} ({len(comunes)} imágenes comparadas)")
    if len(con["lote"]) != 1 or len(sin["lote"]) != 1 or any(abs(a - b) > 0.5 for a, b in zip(con["lote"][0], sin["lote"][0])):
        problemas.append(f"{nombre}: el lote se mueve con el calce: {sin['lote']} sin calce, {con['lote']} con calce")
    else:
        x, y, w, h = con["lote"][0]
        mx, my, mw, mh = con["mapa"]
        if max(w, h) <= 80 or x < mx or y < my or x + w > mx + mw or y + h > my + mh:
            problemas.append(f"{nombre}: el lote mide {round(w)}x{round(h)} px o se sale del mapa ({con['lote'][0]} en {con['mapa']})")
        afuera = [txt for txt, lx, ly, lw, lh in con["lados"] if lx < mx or ly < my or lx + lw > mx + mw or ly + lh > my + mh]
        if afuera:
            problemas.append(f"{nombre}: medidas de los lados que se salen del mapa: {afuera}")
    if m.get("alrededor") and not pg.locator(".vecina").count():
        problemas.append(f"{nombre}: no se ve la trama del catastro de alrededor")
    if sorted(x[0] for x in con["lados"]) != sorted(lado["texto"] for lado in m["lados"] or []):
        problemas.append(f"{nombre}: los rótulos de los lados son {[x[0] for x in con['lados']]} y en los datos {[lado['texto'] for lado in m['lados'] or []]}")
    publicada = superficie(indice[t]["terreno"])
    if publicada not in pg.locator("[data-superficie]").inner_text():
        problemas.append(f"{nombre}: no se ve la superficie publicada ({publicada}) junto al mapa")
    chicas = [(r.url.split("/tile/")[-1], len(r.body())) for r in fotos if len(r.body()) <= 2600]
    if not fotos or chicas:
        problemas.append(f"{nombre}: de {len(fotos)} imágenes de la foto satelital, estas son la gris de 'sin datos' de Esri: {chicas[:4]}")
    if pg.locator("iframe").count() or pedidos_a_google():
        problemas.append(f"{nombre}: la ficha pide a Google Maps: {pedidos_a_google()[:2]}")
    if pg.locator("h1").count() != 1 or pg.locator("[data-consultar]").count() != 1:
        problemas.append(f"{nombre}: la ficha tiene {pg.locator('h1').count()} h1 y {pg.locator('[data-consultar]').count()} [data-consultar]; va uno de cada uno")
    if pg.locator("[data-mapa-ficha][role=region][aria-label]").count() != 1:
        problemas.append(f"{nombre}: el mapa de la ficha no es una región con nombre para el lector de pantalla")

    # Rótulos de lados que se pisan: en estos lotes chicos pasaba; se esconde el del lado más corto (está escrito abajo)
    for ident in ["8482685", "4925850"]:
        if not (json.loads((fichas / f"{ident}.json").read_text()).get("mapa") or {}).get("lados"):
            problemas.append(f"{nombre}: la ficha {ident} no trae los lados para probar los rótulos que se pisan")
        elif abrir(ident):
            r = pg.evaluate("""() => { const bs = [...document.querySelectorAll('.lado span')].filter(e => getComputedStyle(e).visibility !== 'hidden')
                .map(e => [e.textContent, e.getBoundingClientRect()]); const pisan = [];
              for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const [a, b] = [bs[i][1], bs[j][1]];
                if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) pisan.push(bs[i][0] + ' / ' + bs[j][0]) }
              return { visibles: bs.length, pisan } }""")
            if r["pisan"] or r["visibles"] < 2:
                problemas.append(f"{nombre}: en el {ident} hay {r['visibles']} rótulos de lados a la vista y se pisan {r['pisan']}")
    abrir(t)

    # Satelital / calles
    pg.locator("[data-fondo='calles']").click()
    pg.wait_for_timeout(1200)
    if pg.locator("[data-fondo='calles']").get_attribute("aria-pressed") != "true" or not any("World_Street_Map" in u for u in pedidos):
        problemas.append(f"{nombre}: el botón 'Calles' no cambia al mapa de calles")
    pg.locator("[data-fondo='satelital']").click()
    pg.wait_for_timeout(500)

    # Pantalla completa: un panel fijo debajo de la cinta; en el celular, recién ahí el mapa se arrastra con un dedo
    tactil = pg.viewport_size["width"] < 768
    if tactil and "leaflet-grab" in (pg.locator(".leaflet-container").get_attribute("class") or ""):
        problemas.append(f"{nombre}: en el celular el mapa embebido se arrastra con un dedo (se roba el scroll)")
    pg.locator("[data-pantalla-completa]").click()
    pg.wait_for_timeout(700)
    caja = pg.locator("[data-mapa-ficha]").bounding_box()
    if abs(caja["y"] - 32) > 1 or abs(caja["height"] - (pg.viewport_size["height"] - 32)) > 1 or abs(caja["width"] - pg.viewport_size["width"]) > 1:
        problemas.append(f"{nombre}: la pantalla completa del mapa no ocupa la pantalla debajo de la cinta: {caja}")
    if "leaflet-grab" not in (pg.locator(".leaflet-container").get_attribute("class") or ""):
        problemas.append(f"{nombre}: en pantalla completa el mapa no se puede arrastrar")
    cap("mapa-pantalla-completa")
    # El foco queda en "Cerrar" y el Tab no se va a lo que quedó tapado atrás. La cinta de la propuesta sigue a la
    # vista arriba del mapa: esa sí tiene que seguir andando (no inerte)
    cinta = "aside[aria-label^='Aviso']"
    enfocado = "() => ['data-pantalla-completa'].find(n => document.activeElement?.hasAttribute(n)) || document.activeElement?.tagName"
    if pg.evaluate(enfocado) != "data-pantalla-completa":
        problemas.append(f"{nombre}: al abrir la pantalla completa el foco queda en {pg.evaluate(enfocado)} y no en 'Cerrar'")
    escapados = set()
    for _ in range(15):
        pg.keyboard.press("Tab")
        escapados |= set(pg.evaluate(f"() => {{ const a = document.activeElement; return a === document.body || a.closest(\"[data-mapa-ficha], {cinta}\") ? [] : [a.tagName + ' ' + a.textContent.trim().slice(0, 30)] }}"))
    if escapados:
        problemas.append(f"{nombre}: en pantalla completa el Tab se va a lo que quedó tapado: {sorted(escapados)[:3]}")
    links_cinta = pg.locator(f"{cinta} a")
    if not links_cinta.count() or pg.locator(f"{cinta}[inert], [inert] {cinta}, {cinta} [inert]").count() or not links_cinta.first.is_visible():
        problemas.append(f"{nombre}: en pantalla completa la cinta de la propuesta no se ve o quedó inerte ({links_cinta.count()} links)")
    pg.locator("[data-fondo='satelital']").focus()  # el foco en otro lado: al cerrar tiene que volver a "Cerrar"
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    if pg.locator("[data-mapa-ficha]").bounding_box()["height"] >= pg.viewport_size["height"] - 40:
        problemas.append(f"{nombre}: Escape no cierra la pantalla completa del mapa")
    if pg.evaluate(enfocado) != "data-pantalla-completa" or pg.locator("[inert]").count():
        problemas.append(f"{nombre}: al cerrar la pantalla completa el foco queda en {pg.evaluate(enfocado)} y quedan {pg.locator('[inert]').count()} partes inertes")

    def costuras(ident):
        """Una línea clara de 1 px entre una fila de tiles y la siguiente: en el celular (DPR 2) Chrome la dibuja si el
        pane del mapa no tiene capa propia (will-change en index.css). Devuelve cuántos bordes pudo mirar."""
        import io
        from PIL import Image, ImageStat
        m, dpr = pg.locator("[data-mapa-ficha]").bounding_box(), pg.evaluate("devicePixelRatio")
        # Solo las filas de tiles que caen en el medio del mapa: arriba van los botones y abajo la escala y los créditos
        def medio():
            return {b for b in pg.evaluate("[...document.querySelectorAll('.leaflet-foto-pane img.leaflet-tile')].map(i => i.getBoundingClientRect().top)")
                    if m["y"] + m["height"] * 0.2 < b < min(m["y"] + m["height"] * 0.75, pg.viewport_size["height"] - 120)}

        bordes = medio()
        if not bordes:
            # Ninguno cayó en el medio: se corre el mapa 80 px con la flecha (más que el hueco entre una franja y la siguiente)
            pg.locator("[data-mapa-ficha] .leaflet-container").focus()
            pg.keyboard.press("ArrowDown")
            pg.wait_for_timeout(1200)
            bordes = medio()
        im = Image.open(io.BytesIO(pg.screenshot())).convert("L")
        x0, x1 = int((m["x"] + 70) * dpr), int((m["x"] + m["width"] - 70) * dpr)

        def fila(y):
            return ImageStat.Stat(im.crop((x0, y, x1, y + 1))).mean[0]

        for b in bordes:
            y = round(b * dpr)
            salto = max(fila(y + d) - (fila(y + d - 2) + fila(y + d + 2)) / 2 for d in (-1, 0, 1))
            if salto > 12:
                problemas.append(f"{nombre}: el mapa del {ident} tiene una línea clara entre tiles en y={b} (salta {round(salto)} de brillo)")
        return len(bordes)

    # Sin lote: un pin con la punta en el punto que publica la inmobiliaria, sin círculo ni lote, la trama de alrededor
    # si la hay, y la nota de abajo. Lo esperado del pin se proyecta aparte (Web Mercator) desde el centro y el zoom
    # que dice el pane, no con Leaflet
    def pin():
        return pg.evaluate("""() => { const c = document.querySelector('[data-mapa-ficha] .leaflet-container').getBoundingClientRect();
          const pane = document.querySelector('.leaflet-foto-pane');
          // La cabeza del pin, a la izquierda del círculo blanco y lejos del borde blanco (en el viewBox de 30x40: x 8, y 14)
          const s = document.querySelector('.punto svg')?.getBoundingClientRect();
          return { ancho: c.width, alto: c.height, vista: pane.dataset.vista, calce: pane.dataset.calce,
                   cabeza: s && [s.left + s.width * 8 / 30, s.top + s.height * 14 / 40],
                   puntas: [...document.querySelectorAll('.punto path')].map(e => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2 - c.left, b.bottom - c.top] }) } }""")

    def color(x, y):
        """El color que de verdad se ve en (x, y) de la pantalla: getBoundingClientRect no se entera si el pin es
        invisible o quedó tapado."""
        import io
        from PIL import Image, ImageStat
        return [round(c) for c in ImageStat.Stat(Image.open(io.BytesIO(pg.screenshot(clip={"x": x - 1, "y": y - 1, "width": 2, "height": 2}))).convert("RGB")).mean]

    sin_calce = abrir(solo, "&calce=0") and pin()
    mirados = 0
    for ident in (solo, mismo):
        if not abrir(ident):
            continue
        cap("mapa-punto" if ident == solo else "mapa-punto-compartido")
        r = pin()
        # El pin va con los datos del catastro y no con la foto: con calce y sin calce, en el mismo lugar
        if ident == solo and sin_calce:
            if r["calce"] in (None, "0,0"):
                problemas.append(f"{nombre}: la foto del {solo} no se corre con calce {mapas[solo].get('calce')} (pane: {r['calce']}): el chequeo del pin con calce no probaría nada")
            if len(r["puntas"]) != 1 or len(sin_calce["puntas"]) != 1 or max(abs(a - b) for a, b in zip(r["puntas"][0], sin_calce["puntas"][0])) > 0.5:
                problemas.append(f"{nombre}: el pin del {solo} se mueve con el calce de la foto: {sin_calce['puntas']} sin calce, {r['puntas']} con calce")
        visto = color(*r["cabeza"]) if r["cabeza"] else None
        if not visto or max(abs(a - b) for a, b in zip(visto, (0xB8, 0x54, 0x00))) > 30:  # --color-terracota de index.css
            problemas.append(f"{nombre}: en el {ident} la cabeza del pin se ve de color {visto} y no terracota (184, 84, 0)")
        z, clat, clng = (float(v) for v in r["vista"].split(","))
        escala = 256 * 2**z

        def merc_y(la):
            return (1 - math.log(math.tan(math.radians(la)) + 1 / math.cos(math.radians(la))) / math.pi) / 2 * escala

        p = indice[ident]
        punto = (r["ancho"] / 2 + (p["lng"] - clng) / 360 * escala, r["alto"] / 2 + merc_y(p["lat"]) - merc_y(clat))
        if len(r["puntas"]) != 1 or max(abs(a - b) for a, b in zip(r["puntas"][0], punto)) > 3 or not (0 < punto[0] < r["ancho"] and 0 < punto[1] < r["alto"]):
            problemas.append(f"{nombre}: en el {ident} la punta del pin está en {r['puntas']} y el punto publicado cae en {[round(x, 1) for x in punto]} (mapa de {r['ancho']}x{r['alto']})")
        if pg.locator(".lote, .zona").count() or bool(pg.locator(".vecina").count()) != bool(mapas[ident].get("alrededor")):
            problemas.append(f"{nombre}: el {ident} (sin lote) muestra {pg.locator('.lote').count()} lotes, {pg.locator('.zona').count()} círculos y "
                             f"{pg.locator('.vecina').count()} tramas (en los datos, {len(mapas[ident].get('alrededor') or [])} parcelas de alrededor)")
        nota = pg.locator("[data-nota-mapa]").inner_text()
        n = (mapas[ident].get("zona") or {}).get("compartido", 0) + 1
        esperada = "Ubicación que publica la inmobiliaria." if ident == solo else f"La inmobiliaria publica este mismo punto para {n} propiedades: es aproximado."
        if nota.strip() != esperada:
            problemas.append(f"{nombre}: debajo del mapa del {ident} dice «{nota}» y tenía que decir «{esperada}»")
        # Sobre el mapa: "Punto aproximado" junto al pin solo cuando el punto es compartido
        aprox = pg.locator("[data-mapa-ficha] .punto-aprox").all_inner_texts()
        if (ident != solo) != (aprox == ["Punto aproximado"]):
            problemas.append(f"{nombre}: sobre el mapa del {ident} el aviso de punto aproximado es {aprox} (compartido: {ident != solo})")
        if pg.locator("iframe").count() or pedidos_a_google():
            problemas.append(f"{nombre}: la ficha {ident} pide a Google Maps: {pedidos_a_google()[:2]}")
        mirados += costuras(ident)  # al final: si ningún borde cae en el medio, corre el mapa
    if tactil and not mirados:
        problemas.append(f"{nombre}: ningún borde entre tiles quedó en el medio del mapa: el chequeo de costuras no probó nada")

    # Una casa (o local, etc.) con lote (Actualización 14): el mapa dibuja su lote, como el de un terreno
    if casa_lote and abrir(casa_lote):
        if pg.locator("[data-mapa-ficha] .lote").count() != 1 or "el lote" not in pg.locator("#mapa h2").inner_text().lower():
            problemas.append(f"{nombre}: la {indice[casa_lote]['tipo'].lower()} {casa_lote} tiene lote en los datos y su mapa no lo dibuja")
        cap("mapa-casa-con-lote")

    # Si Esri no responde, el terreno se queda con su imagen fija (no un mapa gris) y la casa no queda en "Cargando".
    # Esto también prueba la imagen fija, que con Esri andando desaparece antes de que se la pueda mirar.
    # Página aparte, para que los errores de carga (esperados) no se cuenten como problemas.
    otra = pg.context.new_page()
    otra.route(f"{BASE}**", servir)
    otra.route("**/server.arcgisonline.com/**", lambda r: r.abort())
    otra.goto(f"{raiz}?p={t}", wait_until="networkidle")
    otra.locator("[data-mapa-ficha]").scroll_into_view_if_needed()
    try:
        otra.wait_for_selector("[data-mapa-ficha] .leaflet-container .lote", timeout=20000)
        otra.wait_for_timeout(3000)
        if not otra.locator("[data-forma]").is_visible() or otra.locator("[data-mapa-listo]").count():
            problemas.append(f"{nombre}: sin Esri, el {t} cambia su imagen fija por un mapa gris")
        if otra.locator("[data-fondo]").count():
            problemas.append(f"{nombre}: sin Esri, el {t} se queda con su imagen fija pero sigue mostrando Satelital/Calles, que no andan")
        otra.screenshot(path=str(OUT / f"{nombre}-mapa-sin-esri.png"))
    except Exception:
        problemas.append(f"{nombre}: sin Esri, el mapa del {t} ni siquiera se arma")
    otra.goto(f"{raiz}?p={solo}", wait_until="networkidle")
    otra.locator("[data-mapa-ficha]").scroll_into_view_if_needed()
    try:
        otra.wait_for_selector("[data-mapa-listo]", timeout=20000)
    except Exception:
        problemas.append(f"{nombre}: sin Esri, el {solo} (sin lote) queda en «{otra.locator('[data-mapa-ficha]').inner_text()[:40]}»")
    otra.close()

    # Si Leaflet no baja: con forma, la imagen fija; sin forma, el aviso con "Recargar la página" (y recargando,
    # anda). Satelital/Calles no aparecen; Cómo llegar sigue.
    otra = pg.context.new_page()
    otra.route(f"{BASE}**", servir)
    otra.route("**/assets/leaflet-src-*.js", lambda r: r.abort())
    for ident in [t, solo]:
        otra.goto(f"{raiz}?p={ident}", wait_until="networkidle")
        otra.locator("[data-mapa-ficha]").scroll_into_view_if_needed()
        try:
            otra.wait_for_selector("[data-fondo]", state="detached", timeout=15000)
        except Exception:
            problemas.append(f"{nombre}: sin Leaflet, la ficha {ident} sigue mostrando Satelital/Calles")
        aviso = otra.locator("[data-mapa-error]")
        bien = otra.locator("[data-forma]").is_visible() if ident == t else aviso.is_visible() and "Recargar la página" in aviso.inner_text()
        if not bien or "Cargando" in otra.locator("[data-mapa-ficha]").inner_text() or not otra.locator("a[data-mapa]").count():
            problemas.append(f"{nombre}: sin Leaflet, la ficha {ident} muestra «{otra.locator('[data-mapa-ficha]').inner_text()[:60]}»")
    otra.screenshot(path=str(OUT / f"{nombre}-mapa-sin-leaflet.png"))
    otra.unroute("**/assets/leaflet-src-*.js")
    if otra.locator("[data-mapa-error] button").count():
        otra.locator("[data-mapa-error] button").click()
        otra.wait_for_load_state("networkidle")
        otra.locator("[data-mapa-ficha]").scroll_into_view_if_needed()
        try:
            otra.wait_for_selector("[data-mapa-listo]", timeout=20000)
        except Exception:
            problemas.append(f"{nombre}: 'Recargar la página' no trae el mapa de vuelta")
    otra.close()

    # La X de los popups (crearMapa, la usan todos los mapas) en castellano: se prueba en el mapa de una urbanización
    pg.goto(f"{raiz}?u=29734", wait_until="networkidle")
    try:
        pg.locator("[data-mapa-general]").scroll_into_view_if_needed()
        pg.wait_for_selector("[data-mapa-general][data-mapa-listo]", timeout=20000)
        for _ in range(5):
            if pg.locator("[data-mapa-general] .pildora").count():
                break
            pg.locator("[data-mapa-general] .burbuja").first.evaluate("e => e.click()")
            pg.wait_for_timeout(900)
        pg.locator("[data-mapa-general] .pildora").first.evaluate("e => e.click()")
        x = pg.wait_for_selector(".leaflet-popup-close-button", timeout=5000)
        if x.get_attribute("aria-label") != "Cerrar":
            problemas.append(f"{nombre}: la X del popup del mapa dice «{x.get_attribute('aria-label')}»")
    except Exception:
        problemas.append(f"{nombre}: no se pudo abrir un popup del mapa de la urbanización para mirar su X")

    # La consulta del costado de la ficha en la tablet y en 1024, con la ficha de dos precios (la más larga): entra, con
    # WhatsApp y Llamar, y la página no se corre de costado
    if not tactil:
        dos = next(x.stem for x in sorted(fichas.glob("*.json")) if len(json.loads(x.read_text()).get("operaciones") or []) > 1)
        for ancho in (768, 1024):
            pg.set_viewport_size({"width": ancho, "height": 900})
            pg.goto(f"{raiz}?p={dos}", wait_until="networkidle")
            r = pg.evaluate("""() => { const a = document.querySelector('article aside'), w = a?.querySelector('[data-consultar]'), tel = a?.querySelector('a[href^="tel:"]');
              return { pagina: document.documentElement.scrollWidth, costado: !!a && a.offsetWidth > 0,
                       sale: !!w && w.getBoundingClientRect().right > a.getBoundingClientRect().right, llamar: !!tel && tel.offsetWidth > 0 } }""")
            if r["pagina"] > ancho or not r["costado"] or r["sale"] or not r["llamar"]:
                problemas.append(f"{nombre}: a {ancho} px la consulta del costado de la ficha {dos} no entra: {r}")
            if ancho == 1024:
                cap("ficha-1024")
        pg.set_viewport_size({"width": 1440, "height": 900})
    castro_general(pg, nombre, cap)


# Las marcas de un mapa que quedan a medias en su borde (con el número que asoma de un logo): se ven rotas. Las que
# quedan afuera del todo están bien, se ven al arrastrar
MARCAS_CORTADAS = """(sel) => { const c = document.querySelector(sel), m = c.getBoundingClientRect();
    return [...c.querySelectorAll('.marca-mapa > *')].map(e => { const rs = [e, ...e.querySelectorAll('*')].map(x => x.getBoundingClientRect()).filter(r => r.width);
      const l = Math.min(...rs.map(r => r.left)), r = Math.max(...rs.map(r => r.right)), t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom));
      const seVe = l < m.right && r > m.left && t < m.bottom && b > m.top, entera = l >= m.left - 1 && r <= m.right + 1 && t >= m.top - 1 && b <= m.bottom + 1;
      return seVe && !entera ? (e.innerText.trim() || e.dataset.pin) : null }).filter(Boolean) }"""


def castro_general(pg, nombre, cap):
    """El mapa de la página de cada urbanización (desde el 30/10, el único mapa general que queda: la portada y el
    listado no llevan). La suma de las marcas (una burbuja cuenta todas las que junta) tiene que dar las propiedades
    de la urbanización, nada se pisa ni queda cortado, el calce es el de la celda del centro y tocar un precio lleva a
    la ficha."""
    import json
    import math

    raiz = f"{BASE}propuestas/castro-inmobiliaria/"
    datos = json.loads((DIST / "propuestas/castro-inmobiliaria/mapa.json").read_text())
    sitio = json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/sitio.json").read_text())
    ids = {x["id"] for x in json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/indice.json").read_text())}
    cuantas = {u["id"]: len([i for i in u["propiedades"] if i in ids]) for u in sitio["urbanizaciones"]}

    def abrir(u):
        pg.goto(raiz + f"?u={u}", wait_until="networkidle")
        pg.locator("[data-mapa-general]").scroll_into_view_if_needed()
        try:
            pg.wait_for_selector("[data-mapa-general][data-mapa-listo]", timeout=20000)
            pg.wait_for_timeout(700)
            return True
        except Exception:
            problemas.append(f"{nombre}: el mapa de la urbanización {u} no terminó de cargar")
            return False

    def suma():
        return pg.evaluate("[...document.querySelectorAll('[data-mapa-general] [data-cantidad]')].reduce((s, e) => s + +e.dataset.cantidad, 0)")

    def pisadas(donde):
        """Marcas que se tapan más de 4 px entre sí (las que se ven dentro del mapa y de la pantalla)."""
        if x := pg.evaluate("""() => { const m0 = document.querySelector('[data-mapa-general]').getBoundingClientRect();
            const c = { l: Math.max(m0.left, 0), t: Math.max(m0.top, 0), r: Math.min(m0.right, innerWidth), b: Math.min(m0.bottom, innerHeight) };
            const ms = [...document.querySelectorAll('[data-mapa-general] .marca-mapa > *')].map(e => [e.innerText.trim(), e.getBoundingClientRect()])
              .filter(([, r]) => r.right > c.l && r.left < c.r && r.bottom > c.t && r.top < c.b);
            const out = [];
            ms.forEach(([ta, a], i) => ms.slice(i + 1).forEach(([tb, b]) => { const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (w > 4 && h > 4) out.push(`${ta} / ${tb}: ${Math.round(w)}x${Math.round(h)}`) }));
            return out }"""):
            problemas.append(f"{nombre}: en el mapa {donde} hay marcas que se pisan: {x}")

    def tocar(sel, cual="primera"):
        """Toca con el mouse (locator.click, como una persona) una marca que se ve dentro del mapa: la más grande o la
        primera. Si algo la tapa, Playwright no la puede tocar y queda anotado."""
        marcas = pg.locator(f"[data-mapa-general] {sel}")
        i = marcas.evaluate_all("""(es, cual) => { const m = es[0]?.closest('[data-mapa-general]').getBoundingClientRect();
            const ok = es.map((e, i) => [i, e.getBoundingClientRect(), +e.dataset.cantidad]).filter(([, r]) => r.left >= m.left && r.right <= m.right && r.top >= m.top && r.bottom <= m.bottom);
            if (!ok.length) return -1; return cual === 'grande' ? ok.sort((a, b) => b[2] - a[2])[0][0] : ok[0][0] }""", cual)
        if i < 0:
            return None
        try:
            marcas.nth(i).click(timeout=5000)
        except Exception:
            problemas.append(f"{nombre}: una marca del mapa ({sel}) no se puede tocar: algo la tapa")
            return None
        return marcas.nth(i)

    # Las urbanizaciones con más propiedades: todas las marcas suman las suyas, nada se pisa ni queda cortado, y las
    # burbujas no repiten el nombre (todas son de la misma zona)
    for u in ("29734", "4060"):
        if abrir(u):
            if suma() != cuantas[u]:
                problemas.append(f"{nombre}: el mapa de la urbanización {u} suma {suma()} marcas y tiene {cuantas[u]} propiedades")
            pisadas(f"de la urbanización {u}")
            if x := pg.evaluate(MARCAS_CORTADAS, "[data-mapa-general]"):
                problemas.append(f"{nombre}: en el mapa de la urbanización {u} hay marcas cortadas por el borde: {x}")
            if u == "29734" and any("Magdalenas" in t for t in pg.locator("[data-mapa-general] .marca-mapa").all_inner_texts()):
                problemas.append(f"{nombre}: en el mapa de Las Magdalenas las burbujas repiten el nombre de la urbanización")
            cap(f"14-mapa-urbanizacion-{u}")
    # Tocar una burbuja acerca; de cerca aparecen los lotes y los precios; tocar un precio abre su tarjeta y la tarjeta
    # lleva a la ficha. El calce, medido de cerca (zoom 17) en la celda del centro
    if abrir("29734"):
        for _ in range(6):
            if pg.locator("[data-mapa-general] .pildora").count() and float(pg.get_attribute("[data-mapa-general]", "data-zoom") or 0) >= 15:
                break
            if not tocar(".burbuja", "grande"):
                pg.locator("[data-mapa-general] .leaflet-control-zoom-in").evaluate("e => e.click()")
            pg.wait_for_timeout(900)
        if not pg.locator("[data-mapa-general] path.lote").count():
            problemas.append(f"{nombre}: acercando el mapa de Las Magdalenas no aparece ningún lote dibujado")
        pane = pg.locator("[data-mapa-general] [data-vista]").first
        for _ in range(4):
            if float(pane.get_attribute("data-vista").split(",")[0]) >= 17:
                break
            pg.locator("[data-mapa-general] .leaflet-control-zoom-in").evaluate("e => e.click()")
            pg.wait_for_timeout(700)
        zoom, lat, lng = (float(x) for x in pane.get_attribute("data-vista").split(","))
        este, norte = datos["calces"].get(f"c{math.floor(lat / 0.02)}_{math.floor(lng / 0.02)}", (0, 0))
        mpp = 156543.03392 * math.cos(math.radians(lat)) / 2 ** zoom
        esperado = f"{math.floor(este / mpp + 0.5)},{math.floor(-norte / mpp + 0.5)}"
        if esperado == "0,0":
            problemas.append(f"{nombre}: en el centro del mapa de Las Magdalenas (zoom {zoom:g}) el calce da 0 píxeles: el chequeo del calce no probaría nada")
        elif pane.get_attribute("data-calce") != esperado:
            problemas.append(f"{nombre}: la foto del mapa se corre {pane.get_attribute('data-calce')} y en esa celda y zoom tocaba {esperado}")
        pastilla = tocar(".pildora")
        if not pastilla:
            problemas.append(f"{nombre}: acercando el mapa de Las Magdalenas nunca aparecen los precios (o no se pueden tocar)")
        else:
            ident = pastilla.get_attribute("data-pin-prop")
            pg.wait_for_timeout(500)
            link = pg.locator(f"[data-tarjetas-mapa] [data-tarjeta-mapa='{ident}']")
            if not link.count():
                problemas.append(f"{nombre}: tocar la pastilla de {ident} no abre su tarjeta")
            else:
                cap("12-mapa-tarjeta")
                link.click()
                pg.wait_for_load_state("networkidle")
                if f"p={ident}" not in pg.url:
                    problemas.append(f"{nombre}: la tarjeta del mapa no lleva a la ficha {ident} ({pg.url})")
    # Una urbanización sin propiedades publicadas: el mapa marca dónde queda
    vacia = next((u for u, n in cuantas.items() if not n and next(x for x in sitio["urbanizaciones"] if x["id"] == u).get("lat")), None)
    if vacia and abrir(vacia) and not pg.locator("[data-mapa-general] .zona-tooltip").count():
        problemas.append(f"{nombre}: el mapa de la urbanización {vacia} (sin propiedades) no marca su ubicación")

    # Sin mapa.json el mapa se dibuja igual (sin calce ni lotes); sin Leaflet avisa y ofrece recargar, sin errores sueltos.
    # En otra pestaña: el pedido cortado deja en la consola su propio aviso, que no es un error de la página
    for corte in ("**/mapa.json", "**/assets/leaflet-src-*.js"):
        otra = pg.context.new_page()
        otra.route(f"{BASE}**", servir)
        otra.route(corte, lambda r: r.abort())
        errores = []
        otra.on("pageerror", lambda e, errores=errores: errores.append(str(e)))
        otra.on("console", lambda m, errores=errores: m.type == "error" and "Failed to load resource" not in m.text and errores.append(m.text))
        otra.goto(raiz + "?u=29734", wait_until="networkidle")
        otra.locator("[data-mapa-general]").scroll_into_view_if_needed()
        otra.wait_for_timeout(1500)
        if "mapa.json" in corte:
            dibujado = otra.locator("[data-mapa-general][data-mapa-listo]").count()
            marcas = otra.evaluate("[...document.querySelectorAll('[data-mapa-general] [data-cantidad]')].reduce((s, e) => s + +e.dataset.cantidad, 0)")
            if not dibujado or marcas != cuantas["29734"]:
                problemas.append(f"{nombre}: sin mapa.json el mapa de la urbanización no se dibuja ({marcas} marcas)")
        else:
            aviso = otra.locator("[data-sin-mapa]")
            if not aviso.count() or "No se pudo cargar el mapa" not in aviso.inner_text() or not aviso.get_by_role("button", name="Recargar").count():
                problemas.append(f"{nombre}: si Leaflet no baja, el mapa de la urbanización no avisa ni ofrece recargar")
            else:
                otra.screenshot(path=str(OUT / f"{nombre}-15-mapa-sin-leaflet.png"))
        if errores:
            problemas.append(f"{nombre}: con {corte} cortado quedan errores en la consola: {errores[:2]}")
        otra.close()


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
    "castro-mapa": castro_mapa,
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
