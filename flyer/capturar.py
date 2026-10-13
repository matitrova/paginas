"""Saca del sitio en línea las capturas de celular que se muestran en el flyer.
Uso:  ~/Test1_Inmo/.venv/bin/python capturar.py"""
from pathlib import Path
from playwright.sync_api import sync_playwright

AQUI = Path(__file__).parent / "capturas"
with sync_playwright() as p:
    nav = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = nav.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page()
    pg.goto("https://autoshine.com.ar/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(AQUI / "portada.png"))
    pg.mouse.move(5, 400)
    pg.keyboard.press("End")  # expande la portada
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(AQUI / "auto.png"))
    pg.evaluate("document.getElementById('servicios').scrollIntoView()")
    pg.wait_for_timeout(3000)
    pg.screenshot(path=str(AQUI / "servicios.png"))
    t = pg.evaluate("(() => { const e = document.getElementById('trabajos'); return e.offsetTop + (e.offsetHeight - innerHeight) * 0.75 })()")
    pg.evaluate(f"window.scrollTo(0, {t})")
    pg.wait_for_timeout(1800)
    pg.screenshot(path=str(AQUI / "trabajos.png"))
    # Las dos páginas de muestra, para que el flyer muestre tres estilos distintos
    pg.goto("https://matitrova.github.io/paginas/cabanas/", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(AQUI / "cabanas.png"))
    pg.goto("https://matitrova.github.io/paginas/casa-tala/", wait_until="networkidle")
    if pg.evaluate("document.documentElement.dataset.modo") == "dia":
        pg.locator("main .theme-switch").click()  # en el flyer va de noche, que contrasta con las cabañas
    pg.wait_for_timeout(1800)
    pg.screenshot(path=str(AQUI / "casa-tala.png"))
    nav.close()
print("ok")
