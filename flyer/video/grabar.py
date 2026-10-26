"""Saca los cuadros de cada página en un celular, para el video de Facebook.
Una captura nítida por cuadro (390x844 a doble resolución) mientras la página se usa como con un dedo:
baja con la rueda (así también se abre la portada de AutoShine, que no se mueve con un scroll común),
se queda quieta para que se alcance a ver cada parte y toca botones.
(La grabación de video de Playwright dejaba la página en un cuarto del cuadro, con el resto gris.)
Salen a flyer/video/cuadros/<sitio>/0001.jpg, 0002.jpg... y cuadros/cuadros.js con cuántos tiene cada
toma, que es lo que usa video.html para saber cuánto dura cada una.

Uso:  ../Test1_Inmo/.venv/bin/python flyer/video/grabar.py [sitio...]   (sin sitios, graba todos)
"""
import json
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
CUADROS = AQUI / "cuadros"
FPS = 30
ALTO = 844
BAJA = 0.9  # segundos que tarda en bajar
PARA = 1.1  # segundos quieta después de bajar

# Cada toma es una lista de pasos:
#   ("quieto", s)            se queda quieta s segundos
#   ("baja", pantallas)      baja esa cantidad de pantallas y se queda quieta
#   ("hasta", selector)      baja hasta que ese elemento llega arriba y se queda quieta
#   ("toca", selector, s)    lo toca (tiene que estar a la vista) y mira s segundos
#   ("cambia", selector, s)  lo activa sin moverse, aunque haya quedado fuera de la pantalla, y mira s segundos
SITIOS = {
    "autoshine": ("https://autoshine.com.ar/", [
        ("quieto", 1.5),
        ("baja", 2.7),  # la portada se come unas 2,6 pantallas de rueda antes de dejar bajar
        ("hasta", "#servicios"),  # arranca mostrando Lavado
        # Se activan directo y no tocando en sus coordenadas: la fila de botones se corre al elegir uno
        # y el toque caía en otro servicio (salían Motos y Camionetas)
        ("cambia", "#servicios button:has-text('Pulido')", 1.6),
        ("cambia", "#servicios button:has-text('Cerámico')", 1.6),
        ("cambia", "#servicios button:has-text('Ópticas')", 1.6),
        ("baja", 0.8),
    ]),
    "cabanas": ("https://matitrova.github.io/paginas/cabanas/", [("quieto", 1.5)] + [("baja", 0.85)] * 4),
    "casa-tala": ("https://matitrova.github.io/paginas/casa-tala/", [
        ("quieto", 1.5),
        ("toca", "main .theme-switch", 2.2),  # café de día → bar de noche
        ("hasta", "#carta"),
        ("cambia", "main .theme-switch", 2.2),  # la carta de noche vuelve a ser la de día
        ("baja", 0.85),
    ]),
}


def grabar(pg, carpeta, pasos):
    n = 0

    def cuadro():
        nonlocal n
        n += 1
        pg.screenshot(path=str(carpeta / f"{n:04d}.jpg"), type="jpeg", quality=90)

    def filmar(segundos):
        for _ in range(int(segundos * FPS)):
            pg.wait_for_timeout(35)
            cuadro()

    def bajar(px):
        # Arranca y frena despacio
        pasos_rueda, hecho = int(BAJA * FPS), 0.0
        for k in range(1, pasos_rueda + 1):
            x = k / pasos_rueda
            meta = px * (2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2)
            pg.mouse.wheel(0, meta - hecho)
            hecho = meta
            pg.wait_for_timeout(35)
            cuadro()
        filmar(PARA)

    for paso in pasos:
        accion = paso[0]
        if accion == "quieto":
            filmar(paso[1])
        elif accion == "baja":
            bajar(ALTO * paso[1])
        elif accion == "hasta":
            bajar(pg.locator(paso[1]).first.evaluate("e => e.getBoundingClientRect().top"))
        elif accion == "toca":
            caja = pg.locator(paso[1]).first.bounding_box()
            if not caja or caja["y"] < 0 or caja["y"] + caja["height"] > ALTO:
                raise SystemExit(f"{paso[1]} no está a la vista para tocarlo: {caja}")
            pg.mouse.click(caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2)
            filmar(paso[2])
        elif accion == "cambia":
            pg.locator(paso[1]).first.evaluate("e => e.click()")
            filmar(paso[2])
    return n


with sync_playwright() as p:
    nav = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for nombre in sys.argv[1:] or SITIOS:
        url, pasos = SITIOS[nombre]
        carpeta = CUADROS / nombre
        shutil.rmtree(carpeta, ignore_errors=True)
        carpeta.mkdir(parents=True)
        ctx = nav.new_context(viewport={"width": 390, "height": ALTO}, device_scale_factor=2, locale="es-AR", timezone_id="America/Argentina/San_Luis")
        # Cada captura tarda mucho más que un cuadro del video, así que lo que avanza solo con un temporizador
        # (el carrusel de servicios de AutoShine cambia cada 6,5 s) en el video pasaba varias veces más rápido y
        # se mezclaba con los toques. Los temporizadores largos se estiran: solo cambia lo que se toca.
        ctx.add_init_script("""(() => { const original = window.setTimeout;
          window.setTimeout = (f, ms, ...r) => original(f, ms >= 3000 ? ms * 100 : ms, ...r); })()""")
        pg = ctx.new_page()
        pg.goto(url, wait_until="networkidle")
        pg.add_style_tag(content="html { scroll-behavior: auto !important }")
        if nombre == "casa-tala" and pg.evaluate("document.documentElement.dataset.modo") != "dia":
            pg.locator("main .theme-switch").click()
        pg.mouse.move(195, 500)
        pg.wait_for_timeout(1500)
        print(nombre, grabar(pg, carpeta, pasos), "cuadros")
        ctx.close()
    nav.close()

# Lo cuenta de las carpetas y no de esta corrida: si se regrabó un solo sitio, los otros siguen valiendo
cuenta = {s: len(list((CUADROS / s).glob("*.jpg"))) for s in SITIOS}
(CUADROS / "cuadros.js").write_text(f"window.CUADROS = {json.dumps(cuenta)};\n")
print(cuenta)
