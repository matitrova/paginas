"""Saca los cuadros del scroll de cada página en un celular, para el video de Facebook.
Una captura nítida por cuadro (390x844 a doble resolución) mientras la página baja con la rueda,
como un dedo: así también se abre la portada de AutoShine, que no se mueve con un scroll común.
(La grabación de video de Playwright dejaba la página en un cuarto del cuadro, con el resto gris.)
Salen a flyer/video/cuadros/<sitio>/0001.jpg, 0002.jpg...

Uso:  ../Test1_Inmo/.venv/bin/python flyer/video/grabar.py
"""
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
CUADROS = AQUI / "cuadros"
FPS = 30
QUIETO = 1.2  # segundos de portada quieta al empezar cada toma
BAJANDO = 5.4  # segundos de scroll
SITIOS = {
    "autoshine": ("https://autoshine.com.ar/", 3.0),
    "cabanas": ("https://matitrova.github.io/paginas/cabanas/", 3.4),
    "casa-tala": ("https://matitrova.github.io/paginas/casa-tala/", 3.4),
}

with sync_playwright() as p:
    nav = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for nombre, (url, pantallas) in SITIOS.items():
        carpeta = CUADROS / nombre
        shutil.rmtree(carpeta, ignore_errors=True)
        carpeta.mkdir(parents=True)
        ctx = nav.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="es-AR", timezone_id="America/Argentina/San_Luis")
        pg = ctx.new_page()
        pg.goto(url, wait_until="networkidle")
        pg.add_style_tag(content="html { scroll-behavior: auto !important }")
        if nombre == "casa-tala" and pg.evaluate("document.documentElement.dataset.modo") != "dia":
            pg.locator("main .theme-switch").click()
        pg.mouse.move(195, 500)
        pg.wait_for_timeout(1500)
        quieto = int(QUIETO * FPS)
        primera = carpeta / "0001.jpg"
        pg.screenshot(path=str(primera), type="jpeg", quality=90)
        for n in range(2, quieto + 1):
            shutil.copy(primera, carpeta / f"{n:04d}.jpg")
        # La rueda avanza con una curva suave: arranca y frena despacio
        pasos = int(BAJANDO * FPS)
        total = 844 * pantallas
        hecho = 0.0
        for k in range(1, pasos + 1):
            x = k / pasos
            meta = total * (2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2)
            pg.mouse.wheel(0, meta - hecho)
            hecho = meta
            pg.wait_for_timeout(35)
            pg.screenshot(path=str(carpeta / f"{quieto + k:04d}.jpg"), type="jpeg", quality=90)
        print(nombre, quieto + pasos, "cuadros")
        ctx.close()
    nav.close()
