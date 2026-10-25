"""Saca los cuadros del scroll de cada página en un celular, para el video de Facebook.
Una captura nítida por cuadro (390x844 a doble resolución) mientras la página baja con la rueda,
como un dedo: así también se abre la portada de AutoShine, que no se mueve con un scroll común.
Baja de a tramos y se queda quieta entre uno y otro, para que se alcance a ver cada parte.
(La grabación de video de Playwright dejaba la página en un cuarto del cuadro, con el resto gris.)
Salen a flyer/video/cuadros/<sitio>/0001.jpg, 0002.jpg...

Uso:  ../Test1_Inmo/.venv/bin/python flyer/video/grabar.py [sitio...]   (sin sitios, graba todos)
"""
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
CUADROS = AQUI / "cuadros"
FPS = 30
QUIETO = 1.5  # segundos de portada quieta al empezar cada toma
BAJA = 0.9  # segundos que tarda cada tramo
PARA = 1.1  # segundos quieta después de cada tramo
# Cuántas pantallas baja cada tramo. Todos con 4 tramos: video.html cuenta con que las tomas duren lo mismo.
# La portada de AutoShine se come unas 2,6 pantallas de rueda antes de dejar bajar: el primer tramo la abre entera.
SITIOS = {
    "autoshine": ("https://autoshine.com.ar/", [2.7, 0.75, 0.75, 0.75]),
    "cabanas": ("https://matitrova.github.io/paginas/cabanas/", [0.85] * 4),
    "casa-tala": ("https://matitrova.github.io/paginas/casa-tala/", [0.85] * 4),
}

with sync_playwright() as p:
    nav = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for nombre in sys.argv[1:] or SITIOS:
        url, tramos = SITIOS[nombre]
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
        # Cada tramo arranca y frena despacio, y después se queda quieto
        n = quieto
        for pantallas in tramos:
            pasos, hecho = int(BAJA * FPS), 0.0
            for k in range(1, pasos + 1):
                x = k / pasos
                meta = 844 * pantallas * (2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2)
                pg.mouse.wheel(0, meta - hecho)
                hecho = meta
                pg.wait_for_timeout(35)
                n += 1
                pg.screenshot(path=str(carpeta / f"{n:04d}.jpg"), type="jpeg", quality=90)
            for _ in range(int(PARA * FPS)):
                pg.wait_for_timeout(35)
                n += 1
                pg.screenshot(path=str(carpeta / f"{n:04d}.jpg"), type="jpeg", quality=90)
        print(nombre, n, "cuadros")
        ctx.close()
    nav.close()
