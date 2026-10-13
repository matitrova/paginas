"""Baja la foto (o un cuadro del video, si es un reel) de publicaciones PÚBLICAS de Instagram (sin iniciar sesión) para armar
una propuesta con el contenido que el negocio ya publicó. Guarda en fotos-fuente/<carpeta>/ y deja
los textos de cada publicación en textos.txt.

Uso:  ../Test1_Inmo/.venv/bin/python scripts/fotos_instagram.py <carpeta> [--cuadros] <ruta1> <ruta2> ...
      (cada ruta como /p/XXXX/ o /reel/XXXX/)
      --cuadros: de cada reel saca cinco cuadros repartidos a lo largo del video, no uno solo.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

CUADROS = "--cuadros" in sys.argv
RUTAS = [a for a in sys.argv[2:] if a != "--cuadros"]
MOMENTOS = [0.12, 0.3, 0.5, 0.7, 0.88] if CUADROS else [0.25]
carpeta = Path(__file__).resolve().parent.parent / "fotos-fuente" / sys.argv[1]
carpeta.mkdir(parents=True, exist_ok=True)
textos = []
with sync_playwright() as p:
    nav = p.chromium.launch()
    # Ventana alta: Instagram elige la calidad del video según el tamaño del reproductor
    ctx = nav.new_context(viewport={"width": 1280, "height": 1400}, device_scale_factor=1.4, locale="es-AR",
                          user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
    pg = ctx.new_page()
    for n, ruta in enumerate(RUTAS):
        destino = carpeta / f"ig-{n:02d}.jpg"
        try:
            pg.goto("https://www.instagram.com" + ruta, wait_until="domcontentloaded", timeout=30000)
            pg.wait_for_timeout(5000)
            texto = pg.evaluate("(document.querySelector('meta[property=\"og:description\"]') || {}).content || ''")
            textos.append(f"## {n:02d} {ruta}\n{texto}\n")
            if pg.locator("video").count():
                # Reel: un cuadro del video (la portada que publica Instagram es de 361x640).
                # Se lo pone a pantalla completa y se saca un cuadro (o varios) lejos del arranque, que suele estar en negro.
                medida = pg.evaluate("""async () => {
                    const v = document.querySelector('video');
                    v.muted = true; v.controls = false;
                    try { await v.play() } catch (e) {}
                    await new Promise(r => setTimeout(r, 1500));
                    v.pause();
                    Object.assign(v.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: 2147483647, objectFit: 'contain', background: '#000' });
                    document.body.appendChild(v);
                    await new Promise(r => setTimeout(r, 600));
                    const k = Math.min(innerWidth / v.videoWidth, innerHeight / v.videoHeight);
                    return [v.videoWidth, v.videoHeight, (innerWidth - v.videoWidth * k) / 2, (innerHeight - v.videoHeight * k) / 2, v.videoWidth * k, v.videoHeight * k];
                }""")
                for k, momento in enumerate(MOMENTOS):
                    pg.evaluate("""(m) => new Promise(r => { const v = document.querySelector('video');
                        v.onseeked = () => setTimeout(r, 350); v.currentTime = (v.duration || 6) * m; setTimeout(r, 4000) })""", momento)
                    archivo = carpeta / (f"ig-{n:02d}-{k}.jpg" if CUADROS else f"ig-{n:02d}.jpg")
                    pg.screenshot(path=str(archivo), type="jpeg", quality=92,
                                  clip={"x": medida[2], "y": medida[3], "width": medida[4], "height": medida[5]})
                print(n, ruta, f"video {medida[0]}x{medida[1]}, {len(MOMENTOS)} cuadro(s)")
            else:
                src, w, h = pg.evaluate("""() => { const a = [...document.querySelectorAll('img')].filter(i => i.naturalWidth >= 480)
                    .sort((x, y) => y.naturalWidth * y.naturalHeight - x.naturalWidth * x.naturalHeight)[0];
                    return a ? [a.currentSrc || a.src, a.naturalWidth, a.naturalHeight] : ['', 0, 0] }""")
                if src:
                    destino.write_bytes(ctx.request.get(src).body())
                print(n, ruta, f"foto {w}x{h}" if src else "SIN IMAGEN")
        except Exception as e:
            print(n, ruta, "ERROR", str(e)[:120])
    nav.close()
(carpeta / "textos.txt").write_text("\n".join(textos))
