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


def normalizar(s):
    """Minúsculas, sin tildes ni puntuación y con las erratas corregidas: para comparar textos sin que un acento los salve."""
    import re
    import unicodedata
    for mal, bien in ERRATAS_CASTRO.items():
        s = s.replace(mal, bien)
    s = "".join(c for c in unicodedata.normalize("NFD", s.lower()) if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())


def oraciones(texto):
    import re
    return [normalizar(o) for o in re.split(r"[.!?;:\n“”\"]+", texto)]


def frases_de_castro(sitio, tramos=0):
    """Las oraciones de 25 caracteres o más de los textos de presentación de su sitio (sitio.json y, si está,
    ~/castro-datos/institucional.json, que trae también misión, visión y el formulario de contacto).
    Quedan afuera los datos y lo que se publica tal cual: su eslogan, los legales del pie, la matrícula del
    corredor, los cargos del equipo y los nombres de las urbanizaciones.
    Con tramos=N, en vez de oraciones, cada tramo de N palabras seguidas (un pedazo copiado dentro de una oración
    propia no lo agarra la comparación por oraciones enteras), salvo los que son solo nombres propios: la lista de
    firmantes del museo es un dato y se repite."""
    import json
    crudo = Path.home() / "castro-datos/institucional.json"
    textos = []

    def juntar(x):
        if isinstance(x, str):
            textos.append(x)
        elif isinstance(x, (list, tuple)):
            for y in x:
                juntar(y)
        elif isinstance(x, dict):
            juntar(list(x.values()))

    for f in [sitio] + ([json.loads(crudo.read_text())] if crudo.exists() else []):
        juntar([f["inicio"], {k: v for k, v in f["nosotros"].items() if k != "equipo"}, f["museo"]["titulo"], f["museo"]["textos"],
                f["vender"], f["pie"]["texto"], f["contacto"].get("titulo_formulario"), f["contacto"].get("oficina_titulo"), f.get("globo_whatsapp")])
    datos = [sitio["inicio"]["titular"], *sitio["pie"]["legales"], sitio["contacto"]["corredor_y_matricula"],
             *(e["cargo"] for e in sitio["equipo"]), *(u["nombre"] for u in sitio["urbanizaciones"])]
    if tramos:
        def de_a_n(t):
            for o in re.split(r"[.!?;:\n“”\"]+", t):
                p = re.findall(r"\w+", o)
                for i in range(len(p) - tramos + 1):
                    if not all(w[0].isupper() or w in ("y", "e", "de", "del", "la", "las", "los") for w in p[i:i + tramos]):
                        yield normalizar(" ".join(p[i:i + tramos]))
        return sorted({x for t in textos for x in de_a_n(t)} - {x for t in datos for x in de_a_n(t)})
    exentas = {o for t in datos for o in oraciones(t)}
    return sorted({o for t in textos for o in oraciones(t) if len(o) >= 25 and o not in exentas})


def castro_numeros(pg, nombre, donde, indice, sitio):
    """Todo número marcado con data-dato tiene que ser el que sale del índice. Devuelve las claves que vio."""
    from collections import Counter
    venta = [x for x in indice if "venta" in x["operacion"]]
    datos = {"venta": len(venta), "alquiler": sum("alquiler" in x["operacion"] for x in indice), "publicadas": len(indice),
             "terrenos": sum(x["tipo"] == "Terreno" for x in venta), "forma": sum(bool(x.get("mini")) for x in venta),
             "urbanizaciones": len(sitio["urbanizaciones"]), "equipo": len(sitio["equipo"]),
             "urbanizaciones_con": sum(any(i in {x["id"] for x in indice} for i in u["propiedades"]) for u in sitio["urbanizaciones"]),
             "martilleros": sum("Martillero" in e["cargo"] for e in sitio["equipo"]),
             **{f"zona:{z}": n for z, n in Counter(x["zona"] for x in venta).items() if z}}
    vistos = pg.locator("[data-dato]").evaluate_all("es => es.map(e => [e.dataset.dato, e.textContent.trim()])")
    for clave, visto in vistos:
        if visto != str(datos.get(clave)):
            problemas.append(f"{nombre}: {donde} dice «{visto}» en {clave} y en los datos hay {datos.get(clave)}")
    return {c for c, _ in vistos}


def castro_portada(pg, nombre, indice, sitio):
    """La portada nueva: números del índice, primera pantalla a mano en el celular, las últimas que entraron,
    los terrenos con su forma y la fachada fuera de la portada."""
    venta = [x for x in indice if "venta" in x["operacion"]]
    claves = castro_numeros(pg, nombre, "la portada", indice, sitio)
    if not {"venta", "forma", "terrenos", "equipo", "martilleros"} <= claves or sum(c.startswith("zona:") for c in claves) < 5:
        problemas.append(f"{nombre}: a la portada le faltan los números del titular o de las zonas: {sorted(claves)}")
    # La lista de zonas no corta un empate: ninguna zona que quedó afuera tiene tantas como la última que se muestra
    from collections import Counter
    cuantas = Counter(x["zona"] for x in venta if x["zona"])
    vistas = {c[5:] for c in claves if c.startswith("zona:")}
    if vistas and (afuera := [z for z, n in cuantas.items() if z not in vistas and n >= min(cuantas[z] for z in vistas)]):
        problemas.append(f"{nombre}: la lista de zonas de la portada deja afuera {afuera}, con tantas como alguna de las que muestra")
    # El celular primero: el buscador y "Explorar el mapa" se ven sin bajar y sin el WhatsApp encima, también con la
    # barra de Safari (390x664), en un iPhone SE (375x667) y en un Android angosto (360x740)
    tam = pg.viewport_size
    for w, h in [(tam["width"], tam["height"])] + ([(375, 667), (390, 664), (360, 740)] if tam["width"] < 768 else []):
        pg.set_viewport_size({"width": w, "height": h})
        pg.wait_for_timeout(200)
        *botones, wa = pg.evaluate("""['[data-buscador] button[type=submit]', '[data-explorar]', '[data-whatsapp-flotante]']
          .map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && [r.left, r.top, r.right, r.bottom].map(Math.round) })""")
        tapados = [b for b in botones if b and wa and b[0] < wa[2] and wa[0] < b[2] and b[1] < wa[3] and wa[1] < b[3]]
        if None in botones or max(b[3] for b in botones) > h or tapados:
            problemas.append(f"{nombre}: en {w}x{h} los botones de la primera pantalla terminan en {[b and b[3] for b in botones]} "
                             f"o el WhatsApp ({wa}) tapa {tapados}")
        # Su eslogan tampoco queda debajo del WhatsApp: se mide la caja y no las líneas, así no depende de qué letra cargó
        # (con la de reemplazo, más ancha, lo tapaba)
        e = pg.evaluate("(() => { const r = document.querySelector('[data-eslogan]').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] })()")
        if wa and e[0] < wa[2] and wa[0] < e[2] and e[1] < wa[3] and wa[1] < e[3]:
            problemas.append(f"{nombre}: en {w}x{h} el WhatsApp flotante ({wa}) pisa la caja del eslogan ({[round(x) for x in e]})")
    # En la tablet y en 1024 el WhatsApp flotante no tapa ningún texto ni link de la primera pantalla (tapaba "Ver todas")
    for w, h in ([] if tam["width"] < 768 else [(768, 1024), (1024, 768)]):
        pg.set_viewport_size({"width": w, "height": h})
        pg.wait_for_timeout(200)
        tapa = pg.evaluate("""() => { const w = document.querySelector('[data-whatsapp-flotante]').getBoundingClientRect();
          return [...document.querySelectorAll('main a, main p, main h1, main h2, main button, main select')].filter(e => {
            const r = e.getBoundingClientRect(); return r.width && r.left < w.right && w.left < r.right && r.top < w.bottom && w.top < r.bottom })
          .map(e => e.textContent.trim().slice(0, 40)) }""")
        if tapa:
            problemas.append(f"{nombre}: en {w}x{h} el WhatsApp flotante tapa {tapa}")
    pg.set_viewport_size(tam)
    if pg.locator("img[src*=imagcontact]").count():
        problemas.append(f"{nombre}: la fachada volvió a la portada (va solo en Contacto)")
    # Las últimas que entraron son las de alta más reciente, y cada una dice su fecha
    altas = {x["id"]: x["alta"] for x in indice}
    ultimas = pg.locator("[data-ultimas] [data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.tarjeta)")
    if len(ultimas) < 3 or [altas[i] for i in ultimas] != sorted((x["alta"] for x in venta), reverse=True)[:len(ultimas)]:
        problemas.append(f"{nombre}: 'Las últimas que entraron' no son las más nuevas: {[altas.get(i) for i in ultimas]}")
    if pg.locator("[data-ultimas] [data-alta]").count() != len(ultimas):
        problemas.append(f"{nombre}: no todas las últimas que entraron dicen su fecha")
    # Terrenos con su forma: solo los que la tienen, con la imagen del lote sobre la foto satelital
    con_forma = pg.locator("[data-con-forma] [data-tarjeta]").evaluate_all("es => es.map(e => [e.dataset.tarjeta, e.querySelector('img').getAttribute('src')])")
    mini = {x["id"] for x in indice if x.get("mini")}
    if len(con_forma) < 3 or any(i not in mini or f"lote-tarjeta-{i}." not in src for i, src in con_forma):
        problemas.append(f"{nombre}: 'Terrenos con su forma real' trae {con_forma[:3]}")


def castro(pg, nombre, cap):
    """El sitio nuevo de Castro Inmobiliaria: 272 propiedades sacadas de su propio sitio. Lo esperado se calcula
    del mismo índice que usa la página, así que si la página filtra o cuenta mal, esto falla."""
    import json
    import re
    from urllib.parse import parse_qs

    raiz = f"{BASE}propuestas/castro-inmobiliaria/"
    indice = json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/indice.json").read_text())
    pedidos_castro = []
    pg.on("request", lambda r: pedidos_castro.append(r.url))
    venta = [x for x in indice if "venta" in x["operacion"]]
    roto = re.compile(r"\b0 m²|\b\d+(\.\d+)? ?HA\b|NaN|undefined|null|Sin datos|\b0 (dorm|baño)")

    def ir(q, espera=700):
        pg.goto(raiz + q, wait_until="networkidle")
        pg.wait_for_timeout(espera)
        texto = pg.locator("body").inner_text()
        if (m := roto.search(texto)):
            problemas.append(f"{nombre}: dato roto a la vista en '{q or 'portada'}': «{m.group(0)}»")
        if (h1 := pg.locator("h1").count()) != 1:
            problemas.append(f"{nombre}: '{q or 'portada'}' tiene {h1} h1 y tiene que tener uno")
        textos_afuera(pg, f"{nombre} {q or 'portada'}")
        return texto

    def resultados():
        return int(pg.locator("[data-resultados]").get_attribute("data-resultados"))

    # Las imágenes que trae la rama de datos (castro_satelite.py): si se publica sin ellas, la portada y las tarjetas
    # de los terrenos con forma quedan rotas, y casi todas cargan recién al bajar, así que no se notaría
    fotos = DIST / "propuestas/castro-inmobiliaria/fotos"
    if faltan := [f for f in ["portada-mapa-800.webp", "portada-mapa-1600.webp", *(f"lote-tarjeta-{x['id']}.webp" for x in indice if x.get("mini"))]
                  if not (fotos / f).is_file()]:
        problemas.append(f"{nombre}: faltan {len(faltan)} imágenes de la rama de datos en dist/, por ejemplo {faltan[:3]}")

    # Portada: cartel, aviso de la caída y los números, que tienen que ser los del índice
    sitio = json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/sitio.json").read_text())
    texto = ir("", 1000)
    cap("01-portada")
    if "noindex" not in (pg.get_attribute("meta[name=robots]", "content") or ""):
        problemas.append(f"{nombre}: falta el noindex")
    cartel = pg.locator("aside[aria-label^='Aviso: propuesta']")
    if not cartel.is_visible() or "No es la página oficial" not in cartel.inner_text():
        problemas.append(f"{nombre}: no se ve el cartel de propuesta")
    # Lo de la caída se lo cuenta Matías en el mensaje: la página se muestra como su sitio real
    if re.search(r"no abre|certificado|22 de octubre", texto, re.I) or pg.locator("[data-aviso-caida]").count():
        problemas.append(f"{nombre}: volvió a aparecer el aviso de que su página no anda")
    esperado = {"Terrenos": sum(x["tipo"] == "Terreno" for x in venta)}
    # La vista previa del link (lo primero que se lee en WhatsApp) dice los números de los datos, no "cada terreno"
    og = re.search(r'og:description" content="([^"]*)"', (DIST / "propuestas/castro-inmobiliaria/index.html").read_text()).group(1)
    if re.findall(r"(\d+) propiedades|(\d+) terrenos con su forma", og) != [(str(len(indice)), ""), ("", str(sum(bool(x.get("mini")) for x in indice)))]:
        problemas.append(f"{nombre}: la vista previa del link no dice las propiedades y los terrenos con forma de los datos: «{og}»")
    castro_portada(pg, nombre, indice, sitio)
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(500)
    if not cartel.is_visible():
        problemas.append(f"{nombre}: el cartel de propuesta se pierde al bajar")
    # El buscador corto: tipo (y zona) y lleva al listado con eso elegido
    def buscar():
        # Navega por JS: sin esperar la navegación, networkidle daba bien en la portada todavía abierta. La pausa deja
        # terminar la transición entre pantallas antes del próximo goto: con la máquina cargada salió a veces
        # "Transition was skipped" en la consola (no se pudo confirmar que venga de acá)
        with pg.expect_navigation(wait_until="networkidle"):
            pg.locator("[data-buscador] button[type=submit]").click()
        pg.wait_for_timeout(400)

    pg.select_option("[data-buscador] select[name=tipo]", "Terreno")
    buscar()
    if resultados() != esperado["Terrenos"] or "tipo=Terreno" not in pg.url:
        problemas.append(f"{nombre}: buscar Terrenos desde la portada da {resultados()} y son {esperado['Terrenos']} ({pg.url})")
    zona = max({x["zona"] for x in venta if x["tipo"] == "Casa" and x["zona"]}, key=lambda z: sum(x["zona"] == z and x["tipo"] == "Casa" for x in venta))
    ir("")
    pg.select_option("[data-buscador] select[name=tipo]", "Casa")
    pg.select_option("[data-buscador] select[name=zona]", zona)
    buscar()
    casas_zona = sum(x["zona"] == zona and x["tipo"] == "Casa" for x in venta)
    if resultados() != casas_zona or "zona=" not in pg.url:
        problemas.append(f"{nombre}: buscar casas en {zona} desde la portada da {resultados()} y son {casas_zona}")

    # Los textos: ni una oración de su sitio tal cual (salvo su eslogan, los legales y los datos)
    frases = frases_de_castro(sitio)
    if len(frases) < 20:
        problemas.append(f"{nombre}: solo {len(frases)} frases de su sitio para comparar: el chequeo de textos no probaría nada")
    # Y ningún pedazo de 6 palabras seguidas de sus textos (en Nosotros había quedado uno del pie de su sitio)
    tramos = frases_de_castro(sitio, tramos=6)
    if len(tramos) < 200:
        problemas.append(f"{nombre}: solo {len(tramos)} tramos de su sitio para comparar")
    # Y los números de cada pantalla, que tienen que estar (el pie, en todas, dice publicadas y urbanizaciones)
    numeros = {"": {"venta", "forma"}, "?ver=nosotros": {"publicadas", "urbanizaciones"}, "?ver=vender": {"martilleros"},
               "?ver=urbanizaciones": {"urbanizaciones", "urbanizaciones_con"}, "?ver=contacto": set()}
    for q, deben in numeros.items():
        pagina = normalizar(ir(q))
        if faltan := (deben | {"publicadas", "urbanizaciones"}) - castro_numeros(pg, nombre, f"'{q or 'portada'}'", indice, sitio):
            problemas.append(f"{nombre}: a '{q or 'portada'}' le faltan los números marcados {sorted(faltan)}")
        if copiadas := [f for f in frases if f in pagina]:
            problemas.append(f"{nombre}: '{q or 'portada'}' repite {len(copiadas)} frases de su sitio, por ejemplo «{copiadas[0][:90]}»")
        if copiados := [t for t in tramos if f" {t} " in f" {pagina} "]:
            problemas.append(f"{nombre}: '{q or 'portada'}' repite pedazos de sus textos: {copiados[:3]}")
        # Los números son una foto del 25/10: "hoy" deja de ser cierto en cuanto vendan algo (los mapas tienen sus textos aparte)
        fuera_del_mapa = pg.evaluate("[...document.querySelectorAll('main p, main h1, main h2, footer p')].filter(e => !e.closest('.leaflet-container')).map(e => e.textContent).join(' ')")
        if re.search(r"\bhoy\b", fuera_del_mapa, re.I):
            problemas.append(f"{nombre}: '{q or 'portada'}' dice «hoy» sobre los datos del 25/10")

    # Listado en el celular: la primera pantalla muestra una propiedad (los desplegables van detrás de "Filtros"). En 390x844
    # se ve hasta el precio de la primera; en un iPhone SE (375x667), por lo menos 120 px de su foto. También llegando con un
    # filtro desde la portada, que suma "Limpiar filtros" y "Avisame por WhatsApp"
    movil = pg.viewport_size["width"] < 768
    con_zona = f"?ver=propiedades&tipo=Casa&zona={zona}"
    if movil:
        tam = pg.viewport_size
        for w, h in [(390, 844), (375, 667)]:
            pg.set_viewport_size({"width": w, "height": h})
            for q in ("?ver=propiedades", con_zona):
                ir(q)
                m = pg.evaluate("""() => { const r = s => document.querySelector(s).getBoundingClientRect();
                  return { foto: r('[data-tarjeta]').top, precio: r('[data-tarjeta] [data-precio-texto]').bottom,
                           flotantes: Math.min(r('[data-whatsapp-flotante]').top, r('[data-abrir-mapa]').top) } }""")
                if m["foto"] + 120 > m["flotantes"] or (h > 800 and m["precio"] > m["flotantes"]):
                    problemas.append(f"{nombre}: en {w}x{h} ('{q}') la primera tarjeta no se ve sin bajar: {m}")
        pg.set_viewport_size(tam)
        ir(con_zona)
        if pg.locator("select[name=zona]").is_visible() or pg.locator("[data-ver-filtros]").inner_text().strip() != "Filtros · 1":
            problemas.append(f"{nombre}: en el celular los desplegables tienen que ir cerrados, con «Filtros · 1» al haber una zona elegida "
                             f"(dice «{pg.locator('[data-ver-filtros]').inner_text()}»)")
        pg.locator("[data-ver-filtros]").click()
        if not pg.locator("select[name=zona]").is_visible() or pg.input_value("select[name=zona]") != zona:
            problemas.append(f"{nombre}: el botón 'Filtros' no muestra los desplegables con la zona elegida")
    else:
        ir("?ver=propiedades")
        if pg.locator("[data-ver-filtros]").is_visible() or not pg.locator("select[name=precio]").is_visible():
            problemas.append(f"{nombre}: en la compu los desplegables van a la vista, sin el botón 'Filtros'")

    # Listado: cantidades, filtros en la dirección y "atrás" desde una ficha
    ir("?ver=propiedades")
    cap("02-listado")
    if pg.title() != "Propiedades en Merlo y la zona · Castro Inmobiliaria":
        problemas.append(f"{nombre}: el título de la pestaña del listado es «{pg.title()}»")
    if resultados() != len(venta):
        problemas.append(f"{nombre}: el listado de venta muestra {resultados()} y son {len(venta)}")
    pg.locator("[data-filtro-tipo='Terreno']").click()
    pg.wait_for_timeout(300)
    if resultados() != esperado["Terrenos"] or "tipo=Terreno" not in pg.url:
        problemas.append(f"{nombre}: filtrar terrenos da {resultados()} (url {pg.url})")
    # La tarjeta de un terreno con forma muestra el lote sobre la foto satelital; las demás, su foto
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

    # El mapa del celular es una ventana del navegador (<dialog> modal): el foco entra, con Tab no se va a lo que quedó
    # tapado, Escape la cierra y el foco vuelve al botón "Mapa". Llegando con mapa=1 también abre así
    if movil:
        ir("?ver=propiedades")
        pg.locator("[data-abrir-mapa]").focus()
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(500)
        adentro = "() => document.activeElement === document.body || !!document.activeElement.closest('[data-panel-mapa]')"
        foco = [pg.evaluate(adentro)]
        for _ in range(25):
            pg.keyboard.press("Tab")
            foco.append(pg.evaluate(adentro))
        modal = pg.evaluate("!!document.querySelector('[data-panel-mapa]')?.matches(':modal')")
        en_la_direccion = "mapa=1" in pg.url
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        cerrado = not pg.locator("[data-panel-mapa]").count() and "mapa=1" not in pg.url
        vuelve = pg.evaluate("document.activeElement.matches('[data-abrir-mapa]')")
        if not (modal and all(foco) and en_la_direccion and cerrado and vuelve):
            problemas.append(f"{nombre}: el mapa del celular no se porta como ventana: modal {modal}, foco adentro {foco.count(True)} de {len(foco)} Tabs, "
                             f"mapa=1 {en_la_direccion}, Escape lo cierra {cerrado}, el foco vuelve a 'Mapa' {vuelve}")
        ir("?ver=propiedades&mapa=1")
        # Sin ventana, 'Ver la lista' puede no estar a la vista: el click esperaba 30 s y cortaba la corrida entera
        if not pg.evaluate("!!document.querySelector('[data-panel-mapa]')?.matches(':modal')"):
            problemas.append(f"{nombre}: llegando con mapa=1 el mapa no se abre como ventana")
        else:
            pg.locator("[data-cerrar-mapa]").click(timeout=5000)
            pg.wait_for_timeout(300)
            if pg.locator("[data-panel-mapa]").count() or "mapa=1" in pg.url:
                problemas.append(f"{nombre}: 'Ver la lista' no cierra el mapa o deja mapa=1 en la dirección")

    # Lo que encontró la revisión del 26/10: que no vuelva
    casa = next(x for x in indice if x["cubierta"] and x["construido"] and x["construido"] - x["cubierta"] > 20 and x["tipo"] == "Casa" and "venta" in x["operacion"])
    ir(f"?ver=propiedades&tipo=Casa&n=200")
    texto_casa = pg.locator(f"[data-tarjeta='{casa['id']}']").inner_text()
    if f"{round(casa['cubierta'])} m² cub." not in texto_casa.replace(".", "").replace(" m² cub", " m² cub."):
        problemas.append(f"{nombre}: la tarjeta {casa['id']} no muestra su superficie cubierta ({casa['cubierta']} m²): {texto_casa[-60:]!r}")
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
    if resultados() != esperado["Terrenos"]:
        problemas.append(f"{nombre}: elegir Terrenos con la zona {solo_casas} (sin terrenos) deja {resultados()} resultados")

    # Lo que suma la comparación con su sitio: buscar por código, precios de alquiler en pesos, etiquetas
    # y el WhatsApp de todas las pantallas, que dice qué se estaba mirando
    ir("?ver=propiedades")
    pg.fill("[data-buscar]", "CHO7876886")
    pg.wait_for_timeout(400)
    if resultados() != 1 or not pg.locator("[data-tarjeta='7876886']").count():
        problemas.append(f"{nombre}: buscar CHO7876886 da {resultados()} resultados")
    ir("?ver=propiedades&op=alquiler&precio=300000-600000")
    alq = [x for x in indice if "alquiler" in x["operacion"] and x["precios"].get("alquiler", [None, ""])[1] == "ARS" and 300000 <= (x["precios"]["alquiler"][0] or -1) < 600000]
    if resultados() != len(alq) or not alq:
        problemas.append(f"{nombre}: alquileres de $ 300.000 a 600.000 da {resultados()} y en los datos hay {len(alq)}")
    ir("?ver=propiedades&n=200")
    con_etiqueta = sum(1 for x in venta if x.get("etiquetas"))
    if not con_etiqueta or not pg.locator("[data-tarjeta] [data-etiquetas]").count():
        problemas.append(f"{nombre}: las tarjetas no muestran las etiquetas ({con_etiqueta} en los datos)")
    ir("?ver=propiedades&tipo=Terreno")
    pg.locator("[data-whatsapp-flotante]").click()
    pg.wait_for_timeout(400)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text()
    if "terrenos en venta" not in mensaje or "tipo=Terreno" not in mensaje:
        problemas.append(f"{nombre}: el WhatsApp flotante del listado no dice qué se buscaba: {mensaje[:90]!r}")
    pg.keyboard.press("Escape")

    # Fichas con casos difíciles de sus datos
    for ident, debe, no_debe in [("6601604", "47 ha", "470000"), ("12024296", None, None), ("7665257", "Venta USD 78.000", None)]:
        texto = ir(f"?p={ident}", 1200)
        if debe and debe not in texto:
            problemas.append(f"{nombre}: la ficha {ident} no muestra «{debe}»")
        if no_debe and no_debe in texto:
            problemas.append(f"{nombre}: la ficha {ident} muestra «{no_debe}»")
    # La 7665257 es la única en venta y alquiler: los dos precios no entran en un renglón y la consulta quedaba sola abajo
    if pg.viewport_size["width"] >= 768:
        r = pg.evaluate("[...['[data-precio-ficha]', '[data-consultar-arriba]']].map(s => document.querySelector(s).getBoundingClientRect().top)")
        alto = pg.locator("[data-precio-ficha]").bounding_box()["height"]
        if r[1] > r[0] + alto:
            problemas.append(f"{nombre}: en la ficha 7665257 'Consultar por WhatsApp' baja a un renglón propio, debajo del precio")
    texto = ir("?p=7876886", 1500)
    cap("03-ficha")
    ficha = json.loads((DIST / "propuestas/castro-inmobiliaria/fichas/7876886.json").read_text())
    titulo = next(x["titulo"] for x in indice if x["id"] == "7876886")
    if pg.locator("h1").inner_text().strip() != titulo:
        problemas.append(f"{nombre}: el título de la ficha no es el publicado")
    contador = pg.locator("[data-contador]").inner_text()
    if contador.replace(" ", "") != f"1/{len(ficha['fotos'])}":
        problemas.append(f"{nombre}: la galería arranca en «{contador}» y tiene {len(ficha['fotos'])} fotos")
    pg.locator("[data-galeria]").evaluate("e => e.scrollTo({left: e.clientWidth, behavior: 'instant'})")
    pg.wait_for_timeout(400)
    if not pg.locator("[data-contador]").inner_text().replace(" ", "").startswith("2/"):
        problemas.append(f"{nombre}: al deslizar la galería el contador no pasa a 2")
    if pg.evaluate("[...document.querySelectorAll('[data-galeria] img')].slice(0, 2).every(i => i.complete && i.naturalWidth > 0)") is not True:
        problemas.append(f"{nombre}: las primeras fotos de la galería no se dibujaron")
    # El título, en la letra de los títulos y sin negrita, como en la tarjeta
    letra = pg.evaluate("(() => { const s = getComputedStyle(document.querySelector('h1')); return [s.fontFamily, s.fontWeight] })()")
    if "Newsreader" not in letra[0] or letra[1] != "400":
        problemas.append(f"{nombre}: el título de la ficha va en {letra} y tiene que ir en Newsreader, peso 400")
    # Guardar y Compartir, el mismo botón secundario; el mail en su línea, debajo
    estilos = pg.evaluate("""() => { const g = document.querySelector('[data-guardar="7876886"]'), c = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Compartir');
      const st = e => { const s = getComputedStyle(e); return [s.borderTopWidth, s.borderRadius, s.paddingLeft, s.backgroundColor, s.fontSize, s.fontWeight, Math.round(e.offsetHeight)].join(' ') };
      return [st(g), c ? st(c) : 'sin Compartir', document.querySelector('[data-mail]').getBoundingClientRect().top > Math.max(g.getBoundingClientRect().bottom, c ? c.getBoundingClientRect().bottom : 0)] }""")
    if estilos[0] != estilos[1] or not estilos[2]:
        problemas.append(f"{nombre}: Guardar ({estilos[0]}) y Compartir ({estilos[1]}) no tienen el mismo estilo, o el mail no va en su línea ({estilos[2]})")
    if pg.viewport_size["width"] < 768:
        boton = "[data-barra-contacto] button"
    else:
        # En la compu, la barra fija aparece recién cuando el precio grande sale de la pantalla (si no, el precio se veía dos
        # veces al abrir); mientras tanto, la consulta va al lado del precio
        barra = pg.locator("[data-barra-ficha]")
        if barra.is_visible() or not pg.locator("[data-precio-ficha]").is_visible() or not pg.locator("[data-consultar-arriba]").is_visible():
            problemas.append(f"{nombre}: al abrir la ficha la barra fija se ve ({barra.is_visible()}) o no está la consulta al lado del precio")
        pg.evaluate("scrollTo(0, document.querySelector('[data-precio-ficha]').getBoundingClientRect().bottom + scrollY)")
        pg.wait_for_timeout(500)
        if not barra.is_visible():
            problemas.append(f"{nombre}: el precio grande salió de la pantalla y la barra fija no apareció")
        boton = "[data-consultar]"
    pg.locator(boton).click()
    pg.wait_for_timeout(400)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text()
    if "CHO7876886" not in mensaje or titulo not in mensaje:
        problemas.append(f"{nombre}: el mensaje de WhatsApp no nombra la propiedad: {mensaje[:80]}")
    # "Mostrar y poder mandar": el botón abre el WhatsApp real de la inmobiliaria con ESE mensaje, y solo si se toca
    from urllib.parse import parse_qs, urlparse as _url
    enviar = pg.locator("dialog[open] [data-enviar-whatsapp]")
    href = enviar.get_attribute("href") if enviar.count() else ""
    if not href.startswith("https://wa.me/5492665024444?") or parse_qs(_url(href).query).get("text", [""])[0] != pg.evaluate("document.querySelector('dialog[open] [data-mensaje]').firstChild.textContent"):
        problemas.append(f"{nombre}: el botón para mandar la consulta no abre el WhatsApp de la inmobiliaria con el mismo mensaje: {href[:90]}")
    pg.keyboard.press("Escape")
    llamar = pg.locator("a[href^='tel:']").first.get_attribute("href")
    if llamar != "tel:+542665024444":
        problemas.append(f"{nombre}: el botón de llamar marca {llamar}")
    parecidas = pg.locator("[data-parecidas] [data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.tarjeta)")
    if len(parecidas) != 3 or "7876886" in parecidas:
        problemas.append(f"{nombre}: las parecidas no son 3 distintas de la propia: {parecidas}")

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
    if "mailto:" not in (pg.locator("[data-mail]").get_attribute("href") or "") or "CHO7876886" not in (pg.locator("[data-mail]").get_attribute("href") or ""):
        problemas.append(f"{nombre}: falta 'Prefiero que me escriban por mail' con el código de la propiedad")
    pg.locator("[data-guardar='7876886']").first.click()
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(500)
    if pg.locator("[data-guardar='7876886']").first.get_attribute("aria-pressed") != "true":
        problemas.append(f"{nombre}: guardar una propiedad no queda al recargar")
    ir("?ver=guardadas")
    cap("08-guardadas")
    # Donde el link de guardadas muestra solo el corazón y el número, el lector de pantalla igual dice "Guardadas"
    for w in sorted({pg.viewport_size["width"], 1024}):
        tam = pg.viewport_size
        pg.set_viewport_size({"width": w, "height": tam["height"]})
        if not pg.get_by_role("link", name=re.compile(r"^Guardadas")).count():
            problemas.append(f"{nombre}: en {w} px el link de guardadas no tiene nombre para el lector de pantalla")
        pg.set_viewport_size(tam)
    # El menú entero desde 1024 px (antes recién desde 1280), también con el link de guardadas: sin pisarse ni partir el logo
    if pg.viewport_size["width"] >= 1024:
        tam = pg.viewport_size
        pg.set_viewport_size({"width": 1024, "height": 768})
        pg.wait_for_timeout(200)
        r = pg.evaluate("""() => { const h = document.querySelector('header > div'), cajas = [...h.children].filter(e => e.offsetWidth).map(e => e.getBoundingClientRect());
          return { menu: !!document.querySelector('header nav').offsetWidth, pisan: cajas.some((a, i) => i && a.left < cajas[i - 1].right),
                   sale: h.scrollWidth > h.clientWidth, logo: Math.round(h.querySelector('a span').getBoundingClientRect().height) } }""")
        if not r["menu"] or r["pisan"] or r["sale"] or r["logo"] > 30:
            problemas.append(f"{nombre}: en 1024 px el menú no entra en el encabezado: {r}")
        pg.set_viewport_size(tam)
    if pg.locator("[data-guardadas] [data-tarjeta]").evaluate_all("es => es.map(e => e.dataset.tarjeta)") != ["7876886"]:
        problemas.append(f"{nombre}: la página de guardadas no muestra la que se guardó")
    pg.locator("[data-consultar-guardadas]").click()
    pg.wait_for_timeout(400)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text()
    if "CHO7876886" not in mensaje or "/p/7876886/" not in mensaje:
        problemas.append(f"{nombre}: consultar por las guardadas no nombra la propiedad con su link: {mensaje[:90]!r}")
    pg.keyboard.press("Escape")
    pg.evaluate("localStorage.clear()")
    # Guardadas vacía es más corta que la pantalla: el pie igual llega hasta abajo (quedaba una franja arena debajo)
    ir("?ver=guardadas")
    abajo = pg.evaluate("document.querySelector('footer').getBoundingClientRect().bottom + scrollY - innerHeight")
    if abajo < -1:
        problemas.append(f"{nombre}: en Guardadas vacía el pie termina {-round(abajo)} px antes del final de la pantalla")

    # El link para compartir: trae su foto y su precio para la vista previa, y lleva a la ficha
    compartir = (DIST / "propuestas/castro-inmobiliaria/p/7876886/index.html").read_text()
    if 'og:image" content="https://static.tokkobroker.com' not in compartir or titulo not in compartir:
        problemas.append(f"{nombre}: el link para compartir la 7876886 no trae foto o título para la vista previa")
    pg.goto(raiz + "p/7876886/", wait_until="networkidle")
    if "p=7876886" not in pg.url:
        problemas.append(f"{nombre}: el link para compartir no lleva a la ficha ({pg.url})")

    # Si el servicio de fotos de ellos falla, la ficha queda con la portada propia y sin fotos rotas.
    # Página aparte, para que sus errores de carga (esperados) no se cuenten como problemas.
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

    # Terrenos con su forma real: el dibujo, una medida por lado y nada en los que no tienen forma confirmada
    con_forma = [x for x in indice if x.get("mini")]
    if not con_forma:
        problemas.append(f"{nombre}: ningún terreno tiene la forma dibujada")
    else:
        # El lote va dibujado en el mapa de la ficha (castro_mapa lo prueba a fondo con el 7973638): acá, que el primer
        # terreno con el lote en sus datos lo muestre con una medida por lado, y que uno sin forma no muestre ninguno
        def mapa_de(ident):
            return json.loads((DIST / f"propuestas/castro-inmobiliaria/fichas/{ident}.json").read_text()).get("mapa") or {}

        def esperar_mapa():
            pg.locator("[data-mapa-ficha]").scroll_into_view_if_needed()
            pg.wait_for_selector("[data-mapa-listo]", timeout=20000)

        con_lote = [x["id"] for x in con_forma if mapa_de(x["id"]).get("lote")]
        if not con_lote:
            problemas.append(f"{nombre}: ningún terreno con forma trae el lote para el mapa")
        else:
            t = con_lote[0]
            texto = ir(f"?p={t}", 1500)
            esperar_mapa()
            cap("03b-terreno")
            lados = mapa_de(t)["lados"] or []
            if pg.locator(".lote").count() != 1 or pg.locator(".lado").count() != len(lados):
                problemas.append(f"{nombre}: el terreno {t} no muestra su lote con {len(lados)} medidas")
            afuera = pg.evaluate("""() => { const f = document.querySelector('[data-mapa-ficha]').getBoundingClientRect();
              return [...document.querySelectorAll('.lado span')].filter(e => { const r = e.getBoundingClientRect();
                return r.left < f.left - 1 || r.right > f.right + 1 || r.top < f.top - 1 || r.bottom > f.bottom + 1 }).map(e => e.textContent) }""")
            if afuera:
                problemas.append(f"{nombre}: medidas del terreno {t} que se salen del mapa: {afuera}")
            if "catastro" not in texto or "mensura" not in texto:
                problemas.append(f"{nombre}: el terreno {t} no aclara que la forma es del catastro y las medidas según mensura")
        ir("?p=12024296")
        esperar_mapa()
        if pg.locator("[data-forma], .lote").count():
            problemas.append(f"{nombre}: un terreno sin forma confirmada (12024296) muestra un dibujo")
        ir("?ver=propiedades&tipo=Terreno")
        for ident, tiene in pg.locator("[data-tarjeta]").evaluate_all("es => es.map(e => [e.dataset.tarjeta, !!e.querySelector('[data-mini]')])"):
            if tiene != bool(next(x for x in indice if x["id"] == ident).get("mini")):
                problemas.append(f"{nombre}: la tarjeta {ident} {'muestra' if tiene else 'no muestra'} la forma y en los datos {'no ' if tiene else ''}la tiene")

    texto = ir("?p=999")
    if "ya no está publicada" not in texto:
        problemas.append(f"{nombre}: una propiedad que no existe no avisa que ya no está publicada")

    # Certificado, urbanizaciones, nosotros y contacto
    ir("?ver=urbanizaciones")
    cap("05-urbanizaciones")
    if pg.locator("[data-urbanizacion]").count() != 22:
        problemas.append(f"{nombre}: hay {pg.locator('[data-urbanizacion]').count()} urbanizaciones y son 22")
    # El mapa satelital de las urbanizaciones (en lugar de su mapa dibujado) se baja al llegar a él
    pg.locator("[data-mapa-urbanizaciones]").scroll_into_view_if_needed()
    try:
        pg.wait_for_selector("[data-mapa-urbanizaciones][data-mapa-listo] [data-cantidad]", timeout=20000)
    except Exception:
        problemas.append(f"{nombre}: el mapa de urbanizaciones no terminó de cargar")
    pg.wait_for_timeout(1500)
    pines = pg.locator("[data-mapa-urbanizaciones] [data-pin]").evaluate_all("es => es.map(e => e.getAttribute('href'))")
    alcanzables = pg.evaluate("[...document.querySelectorAll('[data-mapa-urbanizaciones] [data-cantidad]')].reduce((s, e) => s + +e.dataset.cantidad, 0)")
    if alcanzables != 22 or not pines or any(not h.startswith("?u=") for h in pines):
        problemas.append(f"{nombre}: el mapa de urbanizaciones llega a {alcanzables} de 22 ({len(pines)} logos) o algún logo no lleva a su página")
    if not pg.evaluate("[...document.querySelectorAll('[data-mapa-urbanizaciones] [data-pin] img')].every(i => i.naturalWidth > 0)"):
        problemas.append(f"{nombre}: algún logo del mapa de urbanizaciones no se dibujó")
    if x := pg.evaluate(MARCAS_CORTADAS, "[data-mapa-urbanizaciones]"):
        problemas.append(f"{nombre}: en el mapa de urbanizaciones hay marcas cortadas por el borde: {x}")
    # Las dos que publican el mismo punto (61814 y 61958) se tienen que poder tocar las dos: en el centro de cada logo
    # tiene que estar ese logo y no el otro
    tapadas = pg.evaluate("""() => [...document.querySelectorAll('[data-mapa-urbanizaciones] [data-pin]')].filter(a => {
        const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return r.width && e && !a.contains(e) && e.closest('[data-pin]') && e.closest('[data-pin]') !== a }).map(a => a.dataset.pin)""")
    if tapadas:
        problemas.append(f"{nombre}: en el mapa de urbanizaciones hay logos tapados por otro: {tapadas}")
    # Polo Logístico (61814) y Sauzalito (61958) publican el mismo punto: acercando hasta el fondo, su burbuja las lista.
    # La burbuja se toca con el mouse (locator.click), no por JS: si algo la tapa, no se puede tocar y falla
    for _ in range(8):
        burbujas = pg.locator("[data-mapa-urbanizaciones] .burbuja")
        i = burbujas.evaluate_all("es => es.findIndex(e => /Polo|Sauzalito/i.test(e.closest('[title]')?.title || ''))")
        if i < 0:
            dos = "sin burbuja"
            break
        try:
            burbujas.nth(i).click(timeout=5000)
        except Exception:
            dos = "su burbuja no se puede tocar"
            break
        pg.wait_for_timeout(900)
        dos = ",".join(sorted(pg.locator("[data-tarjetas-mapa] [data-pin]").evaluate_all("es => es.map(a => a.dataset.pin)")))
        if "," in dos:
            break
    if dos != "61814,61958":
        problemas.append(f"{nombre}: las dos urbanizaciones del mismo punto no se pueden elegir desde el mapa ({dos})")
    if any("mapa-merlo" in u or "/pin-" in u for u in pedidos_castro):
        problemas.append(f"{nombre}: se sigue pidiendo la imagen de su mapa dibujado")
    ids = {x["id"] for x in indice}
    for u in [x for x in sitio["urbanizaciones"] if x["id"] in ("29734", "61954")]:
        ir(f"?u={u['id']}")
        esperadas = len([i for i in u["propiedades"] if i in ids])
        if pg.locator("[data-tarjeta]").count() != esperadas:
            problemas.append(f"{nombre}: la urbanización {u['nombre']} muestra {pg.locator('[data-tarjeta]').count()} y tiene {esperadas}")
        # En la compu la foto acompaña al bajar por la descripción y el mapa (quedaba un hueco vacío a la izquierda)
        if u["id"] == "29734" and pg.viewport_size["width"] >= 768:
            pg.evaluate("scrollTo(0, 500)")
            pg.wait_for_timeout(300)
            arriba = pg.evaluate("document.querySelector('[data-foto-urbanizacion]').getBoundingClientRect().top")
            if not 100 <= arriba <= 130:
                problemas.append(f"{nombre}: en ?u=29734 la foto no queda fija al bajar (arriba en {round(arriba)})")
    texto = ir("?ver=nosotros", 1000)
    cap("06-nosotros")
    if pg.locator("[data-equipo] li").count() != 5 or "Matrícula -" in texto:
        problemas.append(f"{nombre}: el equipo no son las 5 personas o aparece una matrícula vacía")
    # La matrícula de cada uno tal cual la publican ("MAT: 881"), sin sumarle un colegio que no dicen
    if "CMCPSL" in (equipo := pg.locator("[data-equipo]").inner_text()) or "Matrícula 881" not in equipo:
        problemas.append(f"{nombre}: las matrículas del equipo no van como las publican: {equipo[:120]!r}")
    ir("?ver=contacto")
    if not pg.locator("img[src*=imagcontact]").count():
        problemas.append(f"{nombre}: la foto de la fachada no está en Contacto")
    pg.fill("[data-formulario] [name=nombre]", "Prueba")
    pg.select_option("[data-formulario] [name=motivo]", "Quiero vender o tasar")
    pg.locator("[data-formulario] button[type=submit]").click()
    pg.wait_for_timeout(400)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text()
    if "Prueba" not in mensaje or "Motivo: Quiero vender o tasar" not in mensaje:
        problemas.append(f"{nombre}: el formulario de contacto arma mal el mensaje: {mensaje[:80]}")
    cap("07-contacto")
    ir("?ver=vender")
    cap("09-vender")
    pg.fill("[data-formulario-vender] [name=nombre]", "Prueba")
    pg.select_option("[data-formulario-vender] [name=tipo]", "Casa")
    pg.fill("[data-formulario-vender] [name=metros]", "850")
    pg.fill("[data-formulario-vender] [name=direccion]", "Barrio Rincón del Este")
    pg.locator("[data-formulario-vender] button[type=submit]").click()
    pg.wait_for_timeout(400)
    mensaje = pg.locator("dialog[open] [data-mensaje]").inner_text()
    if not all(x in mensaje for x in ["Prueba", "Tipo: Casa", "850 m²", "Rincón del Este"]):
        problemas.append(f"{nombre}: el formulario de vender arma mal el mensaje: {mensaje[:90]!r}")


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
    esperados = [f"{c['lugar']}: {coma(c['km'])} km · {c['min']} min en auto" if c.get("min") else f"A {coma(c['km'])} km de {c['lugar']}" for c in ficha.get("cercanos") or []]
    if not esperados or pg.locator("[data-cercano]").all_inner_texts() != esperados:
        problemas.append(f"{nombre}: 'a cuánto queda' dice {pg.locator('[data-cercano]').all_inner_texts()} y en los datos {esperados}")
    alt = ficha.get("altura")
    if alt:
        pendiente = "zona plana" if alt["pendiente"] == "plana" else f"zona de pendiente {alt['pendiente']}" + (f" hacia el {alt['hacia']}" if alt.get("hacia") else "")
        texto_alt = f"≈ {alt['m']:,} m sobre el nivel del mar · {pendiente}".replace(",", ".")
        if not 400 <= alt["m"] <= 2200 or pg.locator("[data-altura]").inner_text().strip() != texto_alt:
            problemas.append(f"{nombre}: la altura dice «{pg.locator('[data-altura]').inner_text()}» y en los datos es «{texto_alt}»")
    else:
        problemas.append(f"{nombre}: la ficha {t} no trae la altura")
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

    # El atajo "Mapa" (en la barra de arriba en la compu, en la de abajo en el celular) lleva al mapa sin que lo tapen. La
    # barra de la compu aparece recién cuando el precio grande sale de la pantalla: se arranca de ahí
    pg.evaluate("scrollTo(0, document.querySelector('[data-precio-ficha]').getBoundingClientRect().bottom + scrollY)")
    pg.wait_for_timeout(400)
    pg.locator("a[href='#mapa']:visible").click()
    pg.wait_for_timeout(600)
    tope = pg.evaluate("Math.max(...['header', '[data-barra-ficha]'].map(s => document.querySelector(s)).filter(e => e && e.offsetParent).map(e => e.getBoundingClientRect().bottom))")
    arriba = pg.locator("#mapa").bounding_box()["y"]
    if not tope - 1 <= arriba < pg.viewport_size["height"] / 2:
        problemas.append(f"{nombre}: el atajo 'Mapa' deja el mapa en y={round(arriba)} y las barras de arriba terminan en {round(tope)}")

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
    enfocado = "() => ['data-pantalla-completa', 'data-cerrar-3d', 'data-ver-3d'].find(n => document.activeElement?.hasAttribute(n)) || document.activeElement?.tagName"
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

    # Ver en 3D: nada de MapLibre antes de tocar el botón; después, el mapa o la salida a Google Earth
    if any("maplibre" in u for u in pedidos):
        problemas.append(f"{nombre}: se bajó MapLibre antes de tocar 'Ver en 3D'")
    pg.locator("[data-ver-3d]").click()
    try:
        pg.wait_for_selector("[data-mapa-3d] canvas, [data-google-earth]", timeout=30000)
        if pg.locator("[data-mapa-3d] canvas").count():
            pg.wait_for_function("!document.querySelector('[data-mapa-3d]')?.textContent.includes('Cargando')", timeout=45000)
        elif "earth.google.com/web/@-3" not in (pg.locator("[data-google-earth]").get_attribute("href") or ""):
            problemas.append(f"{nombre}: el aviso sin 3D no lleva a Google Earth con la ubicación")
        pg.wait_for_timeout(1500)
        cap("mapa-3d")
    except Exception:
        problemas.append(f"{nombre}: 'Ver en 3D' no muestra ni el mapa ni el aviso de Google Earth")
    if pg.locator("[data-mapa-3d] canvas").count() and "Este terreno" not in pg.locator("[data-mapa-3d]").inner_text():
        problemas.append(f"{nombre}: el 3D no marca 'Este terreno'")
    if pg.evaluate(enfocado) != "data-cerrar-3d":
        problemas.append(f"{nombre}: al abrir el 3D el foco queda en {pg.evaluate(enfocado)} y no en 'Volver al mapa'")
    # Con el 3D abierto, el Escape de otro diálogo (la galería) cierra ese diálogo y no el 3D
    pg.locator("[data-ver-grande]").click()
    try:
        pg.wait_for_selector("[data-galeria-grande][open]", timeout=5000)
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        abierta, con_3d = pg.locator("[data-galeria-grande][open]").count(), pg.locator("[data-mapa-3d]").count()
        if abierta or not con_3d:
            problemas.append(f"{nombre}: con el 3D abierto, Escape en la galería deja la galería {'abierta' if abierta else 'cerrada'} y el 3D {'abierto' if con_3d else 'cerrado'}")
    except Exception:
        problemas.append(f"{nombre}: con el 3D abierto, 'Ver las fotos en grande' no abre la galería")
    pg.evaluate("document.querySelector('[data-cerrar-3d]')?.focus()")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    if pg.locator("[data-mapa-3d]").count() or pg.evaluate(enfocado) != "data-ver-3d":
        problemas.append(f"{nombre}: Escape no cierra el 3D o el foco no vuelve a 'Ver en 3D' (queda en {pg.evaluate(enfocado)})")

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
        if not visto or max(abs(a - b) for a, b in zip(visto, (0x9A, 0x3E, 0x27))) > 30:
            problemas.append(f"{nombre}: en el {ident} la cabeza del pin se ve de color {visto} y no terracota (154, 62, 39)")
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

    def ver_3d():
        pg.locator("[data-ver-3d]").click()
        try:
            pg.wait_for_selector("[data-mapa-3d] canvas, [data-google-earth]", timeout=30000)
            return pg.locator("[data-mapa-3d] canvas").count() > 0
        except Exception:
            problemas.append(f"{nombre}: 'Ver en 3D' no muestra ni el mapa ni el aviso de Google Earth")

    def texto_3d():
        pg.wait_for_selector("[data-mapa-3d] .maplibregl-marker", timeout=20000)
        return pg.locator("[data-mapa-3d] .maplibregl-marker").inner_text().strip()

    # 3D sin lote (la ficha con punto compartido, la última abierta): el cartel con el palito marca el punto publicado
    if pg.locator("[data-mapa-ficha]").count() and ver_3d():
        texto = texto_3d()
        palitos = pg.locator("[data-mapa-3d] [data-palito]").count()
        if texto != "Ubicación publicada" or not palitos:
            problemas.append(f"{nombre}: el 3D del {mismo} (sin lote) tiene que marcar el punto con 'Ubicación publicada' y el palito que baja hasta él: dice «{texto[:80]}», con {palitos} palitos")
        pg.wait_for_function("!document.querySelector('[data-mapa-3d]')?.textContent.includes('Cargando')", timeout=45000)
        pg.wait_for_timeout(1500)
        cap("mapa-3d-punto")
    # El 3D en pantalla completa: Escape cierra primero el 3D (y el foco va a "Cerrar", el otro botón queda tapado)
    if pg.locator("[data-mapa-3d]").count():
        pg.locator("[data-pantalla-completa]").click()
        pg.wait_for_timeout(500)
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        grande = pg.locator("[data-mapa-ficha]").bounding_box()["height"] >= pg.viewport_size["height"] - 40
        if pg.locator("[data-mapa-3d]").count() or not grande or pg.evaluate(enfocado) != "data-pantalla-completa":
            problemas.append(f"{nombre}: con el 3D en pantalla completa, Escape tiene que cerrar el 3D y dejar la pantalla completa con el foco en 'Cerrar' (3D: {pg.locator('[data-mapa-3d]').count()}, grande: {grande}, foco: {pg.evaluate(enfocado)})")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        if pg.locator("[data-mapa-ficha]").bounding_box()["height"] >= pg.viewport_size["height"] - 40:
            problemas.append(f"{nombre}: el segundo Escape no cierra la pantalla completa")

    # Una casa (o local, etc.) con lote: el 3D dice "Esta propiedad" y no "Este terreno"; un campo con lote, "Este
    # terreno" (el terreno 7973638 se mira arriba). Hoy (27/10) ninguna casa ni campo tiene lote, así que no se chequean;
    # se chequean solo cuando entren las de la Actualización 14
    for ident, esperado, foto in ((casa_lote, "Esta propiedad", "mapa-3d-casa"), (campo_lote, "Este terreno", "mapa-3d-campo")):
        if ident and abrir(ident) and ver_3d():
            texto = texto_3d()
            if texto != esperado:
                problemas.append(f"{nombre}: el 3D del {ident} ({indice[ident]['tipo']} con lote) dice «{texto[:80]}» y no '{esperado}'")
            pg.wait_for_function("!document.querySelector('[data-mapa-3d]')?.textContent.includes('Cargando')", timeout=45000)
            pg.wait_for_timeout(1500)
            cap(foto)

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
    # anda). Satelital/Calles no aparecen; Ver en 3D y Cómo llegar siguen.
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
        if not bien or "Cargando" in otra.locator("[data-mapa-ficha]").inner_text() or otra.locator("[data-ver-3d]").is_disabled() or not otra.locator("a[data-mapa]").count():
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

    # La X de los popups (crearMapa, la usan todos los mapas) en castellano: se prueba en el mapa del listado
    pg.goto(f"{raiz}?ver=propiedades" + ("&mapa=1" if pg.viewport_size["width"] < 1024 else ""), wait_until="networkidle")
    try:
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
        problemas.append(f"{nombre}: no se pudo abrir un popup del mapa del listado para mirar su X")

    # Si MapLibre no consigue el WebGL aunque la prueba previa diga que hay: el aviso con Google Earth, sin errores
    # en la consola ni "Cargando el 3D" para siempre. Va al final: el script queda puesto en esta página.
    pg.add_init_script("""const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) {
      return this.classList.contains('maplibregl-canvas') && /webgl/.test(t) ? null : g.call(this, t, ...a) }""")
    if abrir(solo):
        pg.locator("[data-ver-3d]").click()
        try:
            pg.wait_for_selector("[data-mapa-3d] [data-google-earth]", timeout=30000)
        except Exception:
            problemas.append(f"{nombre}: si MapLibre no arranca, el 3D no ofrece Google Earth: «{pg.locator('[data-mapa-3d]').inner_text()[:80]}»")

    # La barra fija de la compu en la tablet, con la ficha de dos precios (la más larga): nada se sale y está "Llamar"
    if not tactil:
        dos = next(x.stem for x in sorted(fichas.glob("*.json")) if len(json.loads(x.read_text()).get("operaciones") or []) > 1)
        for ancho in (768, 1024):
            pg.set_viewport_size({"width": ancho, "height": 900})
            pg.goto(f"{raiz}?p={dos}", wait_until="networkidle")
            r = pg.evaluate("""() => { const b = document.querySelector('[data-barra-ficha] > div').getBoundingClientRect();
              const w = document.querySelector('[data-barra-ficha] [data-consultar]').getBoundingClientRect();
              const tel = document.querySelector('[data-barra-ficha] a[href^="tel:"]');
              return { pagina: document.documentElement.scrollWidth, sale: w.right > b.right - 23, llamar: !!tel && tel.getBoundingClientRect().width > 0 } }""")
            if r["pagina"] > ancho or r["sale"] or not r["llamar"]:
                problemas.append(f"{nombre}: a {ancho} px la barra de la ficha {dos} no entra: {r}")
            if ancho == 1024:
                cap("barra-1024")
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
    """El mapa de todas las propiedades (Actualización 11): en el listado, con los mismos filtros; en la portada, sin
    bajar Leaflet hasta llegar a él. La suma de las marcas (una burbuja cuenta todas las que junta) tiene que dar la
    cantidad de resultados, y el calce de la foto tiene que ser el de la celda del centro."""
    import json
    import math

    raiz = f"{BASE}propuestas/castro-inmobiliaria/"
    datos = json.loads((DIST / "propuestas/castro-inmobiliaria/mapa.json").read_text())
    movil = pg.viewport_size["width"] < 1024
    pedidos = []
    pg.on("request", lambda r: pedidos.append(r.url))

    def listo(donde):
        try:
            pg.wait_for_selector("[data-mapa-general][data-mapa-listo]", timeout=20000)
            pg.wait_for_timeout(700)
            return True
        except Exception:
            problemas.append(f"{nombre}: el mapa general no terminó de cargar en {donde}")
            return False

    def suma():
        return pg.evaluate("[...document.querySelectorAll('[data-mapa-general] [data-cantidad]')].reduce((s, e) => s + +e.dataset.cantidad, 0)")

    def resultados():
        return int(pg.locator("[data-resultados]").get_attribute("data-resultados"))

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

    def cortadas(donde):
        if x := pg.evaluate(MARCAS_CORTADAS, "[data-mapa-general]"):
            problemas.append(f"{nombre}: en el mapa {donde} hay marcas cortadas por el borde: {x}")

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
            problemas.append(f"{nombre}: una marca del mapa general ({sel}) no se puede tocar: algo la tapa")
            return None
        return marcas.nth(i)

    # Portada: no se baja Leaflet hasta llegar al mapa
    pedidos.clear()
    pg.goto(raiz, wait_until="networkidle")
    pg.wait_for_timeout(500)
    if any("leaflet" in u for u in pedidos):
        problemas.append(f"{nombre}: la portada baja Leaflet antes de llegar al mapa")
    pg.locator("[data-mapa-portada]").scroll_into_view_if_needed()
    if listo("la portada"):
        venta = sum(1 for x in json.loads((DIST.parent / "propuestas/castro-inmobiliaria/src/datos/indice.json").read_text()) if "venta" in x["operacion"])
        if suma() != venta:
            problemas.append(f"{nombre}: el mapa de la portada suma {suma()} marcas y hay {venta} en venta")
        pisadas("de la portada")
        cortadas("de la portada")
        cap("10-mapa-portada")
        # En la portada la rueda del mouse baja la página, no acerca el mapa
        if not movil:
            caja = pg.locator("[data-mapa-general]").bounding_box()
            antes = pg.get_attribute("[data-mapa-general]", "data-zoom")
            pg.mouse.move(caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2)
            pg.mouse.wheel(0, -400)
            pg.wait_for_timeout(700)
            if pg.get_attribute("[data-mapa-general]", "data-zoom") != antes:
                problemas.append(f"{nombre}: la rueda del mouse acerca el mapa de la portada (tiene que bajar la página)")

    def de_la_marca_a_la_ficha():
        """Tocar una burbuja acerca; de cerca aparecen los lotes y las pastillas; tocar una pastilla abre su tarjeta, y
        la tarjeta lleva a la ficha. En una función para que lo que no se pudo tocar no saltee los chequeos de abajo."""
        for _ in range(4):
            if pg.locator("[data-mapa-general] .pildora").count():
                break
            tocar(".burbuja", "grande")
            pg.wait_for_timeout(900)
        pastilla = tocar(".pildora")
        if not pastilla:
            problemas.append(f"{nombre}: acercando el mapa general nunca aparecen los precios (o no se pueden tocar)")
            return
        ident = pastilla.get_attribute("data-pin-prop")
        pg.wait_for_timeout(500)
        link = pg.locator(f"[data-tarjetas-mapa] [data-tarjeta-mapa='{ident}']")
        if not link.count():
            problemas.append(f"{nombre}: tocar la pastilla de {ident} no abre su tarjeta")
            return
        cap("12-mapa-tarjeta")
        link.click()
        pg.wait_for_load_state("networkidle")
        if f"p={ident}" not in pg.url:
            problemas.append(f"{nombre}: la tarjeta del mapa no lleva a la ficha {ident} ({pg.url})")

    # Listado: el mapa muestra lo mismo que la lista, y cambia con los filtros
    pg.goto(raiz + "?ver=propiedades", wait_until="networkidle")
    if movil:
        pg.locator("[data-abrir-mapa]").click()
        if "mapa=1" not in pg.url:
            problemas.append(f"{nombre}: abrir el mapa no queda en la dirección ({pg.url})")
    if listo("el listado"):
        total = resultados()
        if suma() != total:
            problemas.append(f"{nombre}: el mapa del listado suma {suma()} marcas y la lista tiene {total}")
        pisadas("del listado")
        cortadas("del listado")
        cap("11-mapa-listado")
        # Con un filtro, el mapa cambia (en la compu; en el celular el panel tapa los filtros)
        if not movil:
            pg.locator("[data-filtro-tipo='Terreno']").click()
            pg.wait_for_timeout(1200)
            if suma() != resultados() or resultados() == total:
                problemas.append(f"{nombre}: al filtrar terrenos el mapa suma {suma()} y la lista tiene {resultados()}")
            # Pasar el mouse por una tarjeta resalta su marca, y se tiene que ver aunque sea una burbuja (de lejos casi
            # todas lo son): la primera tarjeta que cae en una burbuja, con el color antes y durante
            ident = pg.evaluate("""() => { const en = new Set([...document.querySelectorAll('[data-mapa-general] .burbuja')].flatMap(b => b.dataset.pinProp.split(' ')));
                return [...document.querySelectorAll('[data-tarjeta]')].map(t => t.dataset.tarjeta).find(i => en.has(i)) }""")
            ident = ident or pg.locator("[data-tarjeta]").first.get_attribute("data-tarjeta")
            color = f"() => getComputedStyle(document.querySelector('[data-mapa-general] [data-pin-prop~=\"{ident}\"]')).backgroundColor"
            antes = pg.evaluate(color)
            pg.locator(f"[data-tarjeta='{ident}']").first.hover()
            pg.wait_for_timeout(400)
            activa = pg.evaluate("() => [...document.querySelectorAll('[data-mapa-general] .activa')].map(e => e.dataset.pinProp)")
            if not any(ident in (a or "").split() for a in activa):
                problemas.append(f"{nombre}: pasar el mouse por la tarjeta {ident} no resalta su marca en el mapa ({activa})")
            elif pg.evaluate(color) == antes:
                problemas.append(f"{nombre}: pasar el mouse por la tarjeta {ident} prende su marca pero no cambia nada que se vea ({antes})")
            pg.mouse.move(5, 5)
        de_la_marca_a_la_ficha()

    # De cerca, los lotes dibujados son los de mapa.json
    pg.goto(raiz + "?ver=propiedades&tipo=Terreno" + ("&mapa=1" if movil else ""), wait_until="networkidle")
    if listo("los terrenos"):
        # Se toca la burbuja más grande hasta llegar al zoom en que se dibujan los lotes (15)
        for _ in range(6):
            if float(pg.get_attribute("[data-mapa-general]", "data-zoom") or 0) >= 15:
                break
            tocar(".burbuja", "grande")
            pg.wait_for_timeout(1000)
        if pg.locator("[data-mapa-general] path.lote").count() == 0:
            problemas.append(f"{nombre}: acercando el mapa de terrenos no aparece ningún lote dibujado")
        cap("13-mapa-lotes")

    # El calce es el de la celda del centro del mapa, en el zoom actual (la foto se corre; las marcas no). Se mide de
    # cerca, acercando con el botón + (no mueve el centro) hasta el 17: más lejos el calce de cualquier celda es menos
    # de medio píxel, lo esperado da 0,0 y el chequeo no podría fallar. Redondeado como Math.round. En la portada: el
    # listado de la compu encuadra en la parte de arriba del mapa y su centro cae en una celda sin calce
    pg.goto(raiz, wait_until="networkidle")
    pg.locator("[data-mapa-portada]").scroll_into_view_if_needed()
    if listo("la portada, para el calce"):
        pane = pg.locator("[data-mapa-general] [data-vista]").first
        for _ in range(8):
            if float(pane.get_attribute("data-vista").split(",")[0]) >= 17:
                break
            pg.locator("[data-mapa-general] .leaflet-control-zoom-in").click()
            pg.wait_for_timeout(700)
        zoom, lat, lng = (float(x) for x in pane.get_attribute("data-vista").split(","))
        este, norte = datos["calces"].get(f"c{math.floor(lat / 0.02)}_{math.floor(lng / 0.02)}", (0, 0))
        mpp = 156543.03392 * math.cos(math.radians(lat)) / 2 ** zoom
        esperado = f"{math.floor(este / mpp + 0.5)},{math.floor(-norte / mpp + 0.5)}"
        if esperado == "0,0":
            problemas.append(f"{nombre}: en el centro del mapa general (zoom {zoom:g}) el calce da 0 píxeles: el chequeo del calce no probaría nada")
        elif pane.get_attribute("data-calce") != esperado:
            problemas.append(f"{nombre}: la foto del mapa general se corre {pane.get_attribute('data-calce')} y en esa celda y zoom tocaba {esperado}")

    # En la compu, el mapa del costado del listado sí acerca con la rueda (en la portada no: ver arriba)
    if not movil:
        pg.goto(raiz + "?ver=propiedades", wait_until="networkidle")
        if listo("el listado, para la rueda"):
            antes = float(pg.get_attribute("[data-mapa-general]", "data-zoom"))
            caja = pg.locator("[data-mapa-general]").bounding_box()
            pg.mouse.move(caja["x"] + caja["width"] / 2, caja["y"] + (min(caja["y"] + caja["height"], pg.viewport_size["height"]) - caja["y"]) / 2)
            pg.mouse.wheel(0, -400)
            pg.wait_for_timeout(900)
            if float(pg.get_attribute("[data-mapa-general]", "data-zoom")) <= antes:
                problemas.append(f"{nombre}: la rueda del mouse no acerca el mapa del listado")

    # En la página de una urbanización todas son de la misma zona: las burbujas no repiten el nombre y nada se pisa
    for u in ("29734", "4060"):
        pg.goto(raiz + f"?u={u}", wait_until="networkidle")
        pg.locator("[data-mapa-general]").scroll_into_view_if_needed()
        if listo(f"la urbanización {u}"):
            pisadas(f"de la urbanización {u}")
            cortadas(f"de la urbanización {u}")
            if u == "29734" and any("Magdalenas" in t for t in pg.locator("[data-mapa-general] .marca-mapa").all_inner_texts()):
                problemas.append(f"{nombre}: en el mapa de Las Magdalenas las burbujas repiten el nombre de la urbanización")
            cap(f"14-mapa-urbanizacion-{u}")

    # Sin mapa.json el mapa se dibuja igual (sin calce ni lotes); sin Leaflet avisa y ofrece recargar, sin errores sueltos.
    # En otra pestaña: el pedido cortado deja en la consola su propio aviso, que no es un error de la página
    for corte in ("**/mapa.json", "**/assets/leaflet-src-*.js"):
        otra = pg.context.new_page()
        otra.route(f"{BASE}**", servir)
        otra.route(corte, lambda r: r.abort())
        errores = []
        otra.on("pageerror", lambda e, errores=errores: errores.append(str(e)))
        otra.on("console", lambda m, errores=errores: m.type == "error" and "Failed to load resource" not in m.text and errores.append(m.text))
        otra.goto(raiz + "?ver=propiedades" + ("&mapa=1" if movil else ""), wait_until="networkidle")
        otra.wait_for_timeout(1500)
        if "mapa.json" in corte:
            dibujado = otra.locator("[data-mapa-general][data-mapa-listo]").count()
            marcas = otra.evaluate("[...document.querySelectorAll('[data-mapa-general] [data-cantidad]')].reduce((s, e) => s + +e.dataset.cantidad, 0)")
            if not dibujado or marcas != int(otra.locator("[data-resultados]").get_attribute("data-resultados")):
                problemas.append(f"{nombre}: sin mapa.json el mapa general no se dibuja ({marcas} marcas)")
        else:
            aviso = otra.locator("[data-sin-mapa]")
            if not aviso.count() or "No se pudo cargar el mapa" not in aviso.inner_text() or not aviso.get_by_role("button", name="Recargar").count():
                problemas.append(f"{nombre}: si Leaflet no baja, el mapa general no avisa ni ofrece recargar")
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
