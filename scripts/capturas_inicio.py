"""Capturas de celular de cada página en línea, para las tarjetas de la página de inicio.
Salen a public/inicio/<sitio>-movil.webp (600 px). Después arma og.jpg desde dist/.

Uso:  ../Test1_Inmo/.venv/bin/python scripts/capturas_inicio.py
"""
import io
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image
from playwright.sync_api import sync_playwright

DESTINO = Path(__file__).resolve().parent.parent / "public" / "inicio"
MUESTRAS = "https://matitrova.github.io/paginas/"


def autoshine(pg, movil):
    pg.goto("https://autoshine.com.ar/", wait_until="networkidle")
    pg.mouse.move(5, 400)
    pg.keyboard.press("End")  # abre la portada
    pg.wait_for_timeout(1200)
    if movil:  # en el celular luce más la sección de servicios
        pg.evaluate("document.getElementById('servicios').scrollIntoView()")
        pg.wait_for_timeout(3000)


def cabanas(pg, movil):
    pg.goto(MUESTRAS + "cabanas/", wait_until="networkidle")
    pg.wait_for_timeout(1500)


def casa_tala(pg, movil):
    pg.goto(MUESTRAS + "casa-tala/", wait_until="networkidle")
    # En compu de noche y en celular de día: se ven las dos caras
    quiero = "dia" if movil else "noche"
    if pg.evaluate("document.documentElement.dataset.modo") != quiero:
        pg.locator("main .theme-switch").click()
    pg.wait_for_timeout(1800)


def propuesta(slug):
    def ir(pg, movil):
        pg.goto(MUESTRAS + f"propuestas/{slug}/", wait_until="networkidle")
        pg.wait_for_timeout(1500)
    return ir


SITIOS = {
    "autoshine": autoshine,
    "cabanas": cabanas,
    "casa-tala": casa_tala,
    **{slug: propuesta(slug) for slug in ("mirador-de-los-condores", "cabeza-del-indio", "hosteria-vegetariana")},
}

with sync_playwright() as p:
    nav = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for movil in (True,):  # las tarjetas solo usan la captura de celular
        ctx = nav.new_context(
            viewport={"width": 390, "height": 844} if movil else {"width": 1440, "height": 900},
            device_scale_factor=2 if movil else 1, is_mobile=movil, has_touch=movil,
            locale="es-AR", timezone_id="America/Argentina/San_Luis",
        )
        pg = ctx.new_page()
        for nombre, ir in SITIOS.items():
            ir(pg, movil)
            # La cinta de "sitio de ejemplo" no hace falta en la captura: la tarjeta ya lo dice
            pg.add_style_tag(content="aside[aria-label^='Aviso'] { display: none !important }")
            im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
            im.thumbnail((600 if movil else 1200, 4000))
            im.save(DESTINO / f"{nombre}-{'movil' if movil else 'pc'}.webp", "WEBP", quality=80, method=6)
        ctx.close()
    # La imagen que aparece al compartir el link: la portada ya compilada (hace falta `npm run build`)
    dist = DESTINO.parent.parent / "dist"
    if (dist / "index.html").is_file():
        pg = nav.new_page(viewport={"width": 1200, "height": 630})

        def servir(route):
            f = dist / unquote(urlparse(route.request.url).path).lstrip("/")
            f = f / "index.html" if f.is_dir() else f
            route.fulfill(status=200, body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or "") if f.is_file() else route.fulfill(status=404, body=b"")

        pg.route("http://muestras.test/**", servir)
        pg.goto("http://muestras.test/", wait_until="networkidle")
        pg.wait_for_timeout(600)
        Image.open(io.BytesIO(pg.screenshot())).convert("RGB").save(DESTINO / "og.jpg", "JPEG", quality=85)
    nav.close()
print(sorted(f.name for f in DESTINO.glob("*.webp")))
