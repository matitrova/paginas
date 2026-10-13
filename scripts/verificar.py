"""Recorre las páginas de muestra ya compiladas (dist/) en celular y compu, sin servidor:
Playwright sirve los archivos desde el disco. Saca capturas y termina con error si algo no anda.

Uso:  npm run build && ../Test1_Inmo/.venv/bin/python scripts/verificar.py /carpeta/capturas [página]
"""
import mimetypes
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

DIST = Path(__file__).resolve().parent.parent / "dist"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
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
    ancho = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    if ancho[0] > ancho[1]:
        problemas.append(f"{nombre}: scroll horizontal ({ancho[0]} > {ancho[1]})")


def textos_afuera(pg, nombre, ignorar="[data-libre]"):
    # Una sección con overflow-hidden recorta un título que se sale y scrollWidth no lo ve:
    # por eso se mira la caja de cada texto.
    salidos = pg.evaluate(
        """(ignorar) => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main label, footer *')]
        .filter(e => !e.closest(ignorar) && e.getClientRects().length && getComputedStyle(e).opacity !== '0')
        .filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1 })
        .map(e => e.tagName + ': ' + e.textContent.trim().slice(0, 40))""",
        ignorar,
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


PAGINAS = {"cabanas": cabanas, "casa-tala": casa_tala}
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
