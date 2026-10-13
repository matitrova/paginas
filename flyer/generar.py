"""Convierte flyer.html en las dos imágenes para publicar.
Uso:  ~/Test1_Inmo/.venv/bin/python generar.py
Los datos (WhatsApp, Instagram, precios) se cambian arriba de todo en flyer.html."""
from pathlib import Path
from playwright.sync_api import sync_playwright

AQUI = Path(__file__).parent
FORMATOS = {"historia": (1080, 1920), "post": (1080, 1350)}

with sync_playwright() as p:
    nav = p.chromium.launch()
    for nombre, (ancho, alto) in FORMATOS.items():
        pg = nav.new_page(viewport={"width": ancho, "height": alto})
        pg.goto(f"{(AQUI / 'flyer.html').as_uri()}?formato={nombre}", wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        # Si algo se sale del lienzo, el flyer está mal aunque la imagen se genere
        salidos = pg.evaluate("""[...document.querySelectorAll('.lienzo *')].filter(e => !e.closest('.vitrina'))
            .filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth - 20 || r.bottom > innerHeight - 20 || r.left < 20) })
            .map(e => e.tagName + ' ' + e.textContent.trim().slice(0, 30))""")
        destino = AQUI / "salida" / f"flyer-{nombre}.png"
        pg.screenshot(path=str(destino))
        print(nombre, "->", destino.name, "| se sale:", salidos or "nada")
    nav.close()
