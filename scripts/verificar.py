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


PAGINAS = {"cabanas": cabanas}
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
