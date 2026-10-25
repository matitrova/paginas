"""Arma el video de Facebook: pinta video.html cuadro por cuadro y lo junta con ffmpeg.
Antes: grabar.py (las tomas) y extraer los cuadros de cada toma:
  for s in autoshine cabanas casa-tala; do mkdir -p cuadros/$s; ffmpeg -i tomas/$s.webm -vf fps=30 -q:v 3 cuadros/$s/%04d.jpg; done

Uso:  ../Test1_Inmo/.venv/bin/python flyer/video/componer.py
Sale: flyer/salida/video-facebook.mp4 (1080x1920, 30 cuadros por segundo, sin sonido)
"""
import shutil
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
FOTOGRAMAS = AQUI / "fotogramas"
SALIDA = AQUI.parent / "salida" / "video-facebook.mp4"
FPS = 30

shutil.rmtree(FOTOGRAMAS, ignore_errors=True)
FOTOGRAMAS.mkdir()
with sync_playwright() as p:
    nav = p.chromium.launch()
    pg = nav.new_page(viewport={"width": 1080, "height": 1920})
    pg.goto((AQUI / "video.html").as_uri(), wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    total = round(pg.evaluate("window.DURACION") * FPS)
    for i in range(total):
        pg.evaluate(f"window.pintar({i / FPS})")
        pg.screenshot(path=str(FOTOGRAMAS / f"{i:04d}.jpg"), type="jpeg", quality=92)
    nav.close()
print(total, "cuadros")

SALIDA.parent.mkdir(exist_ok=True)
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(FOTOGRAMAS / "%04d.jpg"),
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", str(SALIDA)],
    check=True,
)
print("->", SALIDA)
