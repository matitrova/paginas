"""La forma real de cada terreno de Castro sobre la foto satelital, para su ficha.

Las parcelas vienen del catastro de San Luis (~/castro-datos/catastro/, ya cruzadas con cada ficha). La foto es
Esri World Imagery, pegando sus pedacitos (el servicio que arma una imagen entera devuelve error). En San Luis esa
foto está corrida hasta 25 m respecto del catastro, distinto en cada zona: se corrige moviendo LA FOTO, nunca el
lote (CALCES, en metros, por celda de 0,02° como en MojonApp). El catastro es el dato; la foto es el fondo.

Sale public/propuestas/castro-inmobiliaria/fotos/lote-<id>.webp (640x480) y ~/castro-datos/formas.json con el
dibujo encima en píxeles de esa imagen (lote, vecinos, rótulos de los lados), que castro_datos.py pasa a la ficha.

Uso:
  ../Test1_Inmo/.venv/bin/python scripts/castro_satelite.py                      todos los terrenos que entran
  ../Test1_Inmo/.venv/bin/python scripts/castro_satelite.py --celdas             cuántos terrenos hay en cada celda
  ../Test1_Inmo/.venv/bin/python scripts/castro_satelite.py --hoja CELDA [salida.jpg] [este,norte ...]
        hoja para calzar a ojo: un terreno de la celda con TODAS las parcelas de alrededor (también las calles)
        sobre la foto, una vez por cada corrimiento probado
"""
import io
import json
import math
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = Path.home() / "castro-datos"
TILES = FUENTE / "tiles"
SALIDA = RAIZ / "public/propuestas/castro-inmobiliaria/fotos"
ANCHO, ALTO = 640, 480
GRADOS_POR_CELDA = 0.02  # el mismo tamaño de celda que MojonApp (js/calce-imagen.js)
WFS = "http://visualcatsl.dyndns.info/geoserver/SanLuis/ows"

# Cuántos metros hay que correr la foto en cada celda para que calce con el catastro (este, norte).
# Se calzan a ojo con --hoja: las calles del catastro tienen que caer sobre las calles de la foto.
# Una celda que no está acá no se dibuja: sin calzar, el lote podría quedar sobre el terreno del vecino.
CALCES: dict[str, tuple[float, float]] = {
    # Calzadas el 25/10/2026 por zona, mirando calles, alambrados y casas, y revisadas una por una por otro par de
    # ojos que midió perfiles de brillo cruzando las calles. c-1620_-3251 queda afuera: sus referencias se
    # contradicen en unos 5 m y no se puede afirmar que calce.
    "c-1616_-3251": (2, -2), "c-1616_-3253": (1, 2), "c-1617_-3250": (0, 0), "c-1617_-3251": (0, -2),
    "c-1617_-3252": (2, 0), "c-1617_-3253": (1.5, 0.5), "c-1617_-3261": (-3, 5), "c-1618_-3249": (0, 0),
    "c-1618_-3250": (0, -2), "c-1618_-3251": (0, 0), "c-1618_-3252": (4, 2), "c-1618_-3254": (0, 0),
    "c-1619_-3250": (-3, -3), "c-1619_-3251": (0, 0), "c-1619_-3252": (2, 0), "c-1620_-3250": (0, 0),
    "c-1621_-3249": (0, -3), "c-1621_-3250": (0, -3), "c-1622_-3250": (2, -3), "c-1622_-3251": (3.5, 0),
    "c-1625_-3250": (0, 0), "c-1626_-3251": (2.5, 1),
}

# Los que no se dibujan aunque pasen la regla de abajo, después de mirarlos
EXCLUIR: set[str] = set()


def media_aceptable(t):
    """Confianza media = la superficie coincide pero el punto de la ficha no cae adentro del lote. En un loteo de lotes
    iguales, el más cercano con esa superficie puede ser el del vecino. Entra solo si:
      - el punto cae adentro y la superficie difiere 3% o menos, o
      - la superficie es un número poco común (no múltiplo de 50), coincide casi exacto y el lote está a menos de 15 m."""
    import re
    cat = float(re.sub(r"[^\d.]", "", t["superficie_catastro"].split()[0]) or 0)
    pub = float(re.match(r"[\d.]+", t["superficie_publicada"]).group(0)) if re.match(r"[\d.]+", t["superficie_publicada"]) else 0
    if not cat or not pub:
        return False
    diferencia = abs(cat - pub) / pub
    if t["distancia_m"] == 0:
        return diferencia <= 0.03
    return pub % 50 != 0 and diferencia <= 0.005 and t["distancia_m"] <= 15


def celda_de(lat, lng):
    return f"c{math.floor(lat / GRADOS_POR_CELDA)}_{math.floor(lng / GRADOS_POR_CELDA)}"


def mundo(lat, lng, z):
    """Lat/lng a píxeles del mundo en Web Mercator, en el zoom z (256 px por tile)."""
    n = 256 * 2**z
    s = math.sin(math.radians(lat))
    return (lng + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n


def metros_por_pixel(lat, z):
    return 156543.03392 * math.cos(math.radians(lat)) / 2**z


def tile(z, x, y):
    """Un pedacito de foto, guardado para no volver a pedirlo. None si Esri no tiene foto ahí (gris de 2.521 B)."""
    archivo = TILES / str(z) / str(x) / f"{y}.jpg"
    if not archivo.exists():
        archivo.parent.mkdir(parents=True, exist_ok=True)
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        pedido = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (propuesta Castro Inmobiliaria)"})
        archivo.write_bytes(urllib.request.urlopen(pedido, timeout=30).read())
        time.sleep(0.05)
    datos = archivo.read_bytes()
    return None if len(datos) < 3000 else Image.open(io.BytesIO(datos)).convert("RGB")


def foto(lat, lng, ancho_m, z, corrimiento=(0.0, 0.0)):
    """La foto centrada en (lat, lng), ancho_m metros de ancho, corrida corrimiento=(este, norte) metros.
    Devuelve la imagen y la función que lleva un punto lat/lng a píxeles de ESA imagen, sin corrimiento:
    el dibujo se ubica por el catastro, que no se mueve."""
    mpp = metros_por_pixel(lat, z)
    w_px, h_px = ancho_m / mpp, ancho_m * ALTO / ANCHO / mpp
    cx, cy = mundo(lat, lng, z)
    x0, y0 = cx - w_px / 2, cy - h_px / 2  # la ventana que manda el dibujo
    este, norte = corrimiento
    # Correr la foto al este es mover la ventana de recorte al oeste; al norte, moverla al sur (y crece hacia el sur)
    fx0, fy0 = x0 - este / mpp, y0 + norte / mpp
    lienzo = Image.new("RGB", (math.ceil(w_px) + 512, math.ceil(h_px) + 512), (60, 60, 60))
    tx0, ty0 = int(fx0 // 256), int(fy0 // 256)
    gris = 0
    for tx in range(tx0, int((fx0 + w_px) // 256) + 1):
        for ty in range(ty0, int((fy0 + h_px) // 256) + 1):
            t = tile(z, tx, ty)
            if t is None:
                gris += 1
                continue
            lienzo.paste(t, ((tx - tx0) * 256, (ty - ty0) * 256))
    if gris:
        return None, None
    ox, oy = fx0 - tx0 * 256, fy0 - ty0 * 256
    imagen = lienzo.crop((round(ox), round(oy), round(ox + w_px), round(oy + h_px))).resize((ANCHO, ALTO), Image.LANCZOS)
    escala = ANCHO / w_px

    def a_pixel(plat, plng):
        px, py = mundo(plat, plng, z)
        return (px - x0) * escala, (py - y0) * escala

    return imagen, a_pixel


def anillo(geometria):
    c = geometria["coordinates"]
    return c[0][0] if geometria["type"] == "MultiPolygon" else c[0]


def lados(puntos_ll, a_pixel):
    """Cada lado del lote en metros, juntando los tramos casi rectos (el catastro parte lados en dos).
    Devuelve los rótulos ya ubicados en la imagen: afuera del lado, girados para que se lean derechos."""
    pts = [tuple(p) for p in puntos_ll]
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    lat0 = sum(p[1] for p in pts) / len(pts)
    m = [((p[0] - pts[0][0]) * 111320 * math.cos(math.radians(lat0)), (p[1] - pts[0][1]) * 110540) for p in pts]
    n = len(m)
    # Vértices que de verdad quiebran la dirección (más de 5°)
    quiebres = []
    for i in range(n):
        a, b, c = m[i - 1], m[i], m[(i + 1) % n]
        d1, d2 = math.atan2(b[1] - a[1], b[0] - a[0]), math.atan2(c[1] - b[1], c[0] - b[0])
        giro = abs((d2 - d1 + math.pi) % (2 * math.pi) - math.pi)
        if giro > math.radians(5):
            quiebres.append(i)
    centro = a_pixel(sum(p[1] for p in pts) / n, sum(p[0] for p in pts) / n)
    rotulos = []
    for k, i in enumerate(quiebres):
        j = quiebres[(k + 1) % len(quiebres)]
        tramo = [m[(i + s) % n] for s in range(((j - i) % n) + 1)]
        largo = sum(math.dist(tramo[s], tramo[s + 1]) for s in range(len(tramo) - 1))
        if largo < 8:  # un lado cortito se dibuja igual, pero su rótulo se encima con los de al lado
            continue
        p1, p2 = a_pixel(pts[i][1], pts[i][0]), a_pixel(pts[j][1], pts[j][0])
        mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
        ang = math.degrees(math.atan2(p2[1] - p1[1], p2[0] - p1[0]))
        if ang > 90:
            ang -= 180
        elif ang < -90:
            ang += 180
        # Hacia afuera: del centro del lote hacia el medio del lado
        dx, dy = mx - centro[0], my - centro[1]
        d = math.hypot(dx, dy) or 1
        rotulos.append({"x": round(mx + dx / d * 13, 1), "y": round(my + dy / d * 13, 1), "ang": round(ang, 1),
                        "texto": f"{largo:.1f} m".replace(".", ",") if largo < 100 else f"{round(largo)} m"})
    return rotulos


assert len(lados([[0, 0], [0.0003, 0], [0.0006, 0], [0.0006, 0.0003], [0, 0.0003], [0, 0]], lambda la, ln: (ln * 1e5, -la * 1e5))) == 4, \
    "un rectángulo con un vértice de más en un lado tiene que dar 4 lados"


def terrenos():
    resumen = json.load(open(FUENTE / "catastro/resumen.json"))
    props = {p["id"]: p for p in json.load(open(FUENTE / "propiedades.json"))}
    for t in resumen:
        if not t["encontrado"] or t["id"] in EXCLUIR or t["confianza"] not in ("alta", "media"):
            continue
        if t["confianza"] == "media" and not media_aceptable(t):
            continue
        lote = json.load(open(FUENTE / f"catastro/{t['id']}.geojson"))["features"][0]
        vecinas = json.load(open(FUENTE / f"catastro/{t['id']}-vecinas.geojson")).get("features", [])
        pts = anillo(lote["geometry"])
        lat = sum(p[1] for p in pts) / len(pts)
        lng = sum(p[0] for p in pts) / len(pts)
        yield {"id": t["id"], "confianza": t["confianza"], "lat": lat, "lng": lng, "puntos": pts, "vecinas": [anillo(v["geometry"]) for v in vecinas],
               "celda": celda_de(lat, lng), "titulo": props[t["id"]]["titulo"]}


def encuadre(t):
    """Ancho de la foto en metros y zoom: el lote ocupa más o menos un tercio, y nunca menos de 160 m de contexto."""
    xs = [(p[0] - t["lng"]) * 111320 * math.cos(math.radians(t["lat"])) for p in t["puntos"]]
    ys = [(p[1] - t["lat"]) * 110540 for p in t["puntos"]]
    ancho_m = max(2.6 * max(max(xs) - min(xs), (max(ys) - min(ys)) * ANCHO / ALTO), 160)
    z = 18
    while ancho_m / metros_por_pixel(t["lat"], z) > 1400:
        z -= 1
    return ancho_m, z


def parcelas_alrededor(lat, lng, radio_m=160):
    """Todas las parcelas del catastro alrededor (también las calles), para calzar la foto."""
    dlat, dlng = radio_m / 110540, radio_m / (111320 * math.cos(math.radians(lat)))
    q = (f"{WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=SanLuis:GIS_PARCELAS_VV&outputFormat=application/json"
         f"&srsName=EPSG:4326&BBOX={lng - dlng},{lat - dlat},{lng + dlng},{lat + dlat},EPSG:4326")
    datos = json.loads(urllib.request.urlopen(q, timeout=60).read())
    return [(anillo(f["geometry"]), "CALLE" in str(f["properties"].get("NOMBRE", "")).upper()) for f in datos.get("features", [])]


def hoja(celda, salida, pruebas):
    candidatos = [t for t in terrenos() if t["celda"] == celda]
    if not candidatos:
        raise SystemExit(f"no hay terrenos en {celda}")
    t = candidatos[0]
    ancho_m, z = 260, 18
    parcelas = parcelas_alrededor(t["lat"], t["lng"])
    cuadros = []
    for este, norte in pruebas:
        img, a_pixel = foto(t["lat"], t["lng"], ancho_m, z, (este, norte))
        if img is None:
            raise SystemExit(f"Esri no tiene foto en z{z} para {celda}")
        d = ImageDraw.Draw(img)
        for anillo_ll, es_calle in parcelas:
            d.line([a_pixel(p[1], p[0]) for p in anillo_ll], fill=(255, 80, 80) if es_calle else (255, 255, 0), width=1)
        d.line([a_pixel(p[1], p[0]) for p in t["puntos"]], fill=(0, 255, 255), width=3)
        d.rectangle((0, 0, 210, 22), fill=(0, 0, 0))
        d.text((6, 5), f"{celda} este {este:+g} norte {norte:+g}", fill=(255, 255, 255))
        cuadros.append(img)
    columnas = min(3, len(cuadros))
    filas = math.ceil(len(cuadros) / columnas)
    junta = Image.new("RGB", (ANCHO * columnas, ALTO * filas), "white")
    for i, c in enumerate(cuadros):
        junta.paste(c, ((i % columnas) * ANCHO, (i // columnas) * ALTO))
    junta.save(salida, quality=82)
    print(f"{salida}: {len(candidatos)} terrenos en {celda}; muestra el {t['id']} ({t['titulo']})")


def todos():
    formas, sin_calce, sin_foto = {}, [], []
    for t in terrenos():
        if t["celda"] not in CALCES:
            sin_calce.append(t["id"])
            continue
        ancho_m, z = encuadre(t)
        img, a_pixel = foto(t["lat"], t["lng"], ancho_m, z, CALCES[t["celda"]])
        while img is None and z > 15:
            z -= 1
            img, a_pixel = foto(t["lat"], t["lng"], ancho_m, z, CALCES[t["celda"]])
        if img is None:
            sin_foto.append(t["id"])
            continue
        img.save(SALIDA / f"lote-{t['id']}.webp", "WEBP", quality=66, method=6)
        poly = [a_pixel(p[1], p[0]) for p in t["puntos"]]
        assert all(-5 <= x <= ANCHO + 5 and -5 <= y <= ALTO + 5 for x, y in poly), f"el lote {t['id']} no entra en su foto"
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        lado = max(max(xs) - min(xs), max(ys) - min(ys)) or 1
        formas[t["id"]] = {
            "img": f"fotos/lote-{t['id']}.webp",
            "lote": " ".join(f"{x:.1f},{y:.1f}" for x, y in poly),
            "vecinas": [" ".join(f"{a_pixel(p[1], p[0])[0]:.1f},{a_pixel(p[1], p[0])[1]:.1f}" for p in v) for v in t["vecinas"]],
            "lados": lados(t["puntos"], a_pixel),
            # La silueta sola, en una caja de 0 a 100, para la miniatura de la tarjeta
            "mini": " ".join(f"{(x - min(xs)) / lado * 100:.1f},{(y - min(ys)) / lado * 100:.1f}" for x, y in poly),
        }
    (FUENTE / "formas.json").write_text(json.dumps(formas, ensure_ascii=False))
    print(len(formas), "terrenos dibujados;", len(sin_calce), "sin calce todavía:", sin_calce[:12], ";", len(sin_foto), "sin foto:", sin_foto)


if __name__ == "__main__":
    if "--celdas" in sys.argv:
        from collections import Counter
        for celda, n in Counter(t["celda"] for t in terrenos()).most_common():
            print(celda, n, "calzada" if celda in CALCES else "")
    elif "--hoja" in sys.argv:
        i = sys.argv.index("--hoja")
        args = sys.argv[i + 1:]
        celda, salida = args[0], (args[1] if len(args) > 1 and not args[1][0].isdigit() and not args[1].startswith("-") else f"/tmp/calce-{args[0]}.jpg")
        resto = [a for a in args[1:] if a != salida]
        pruebas = [tuple(float(v) for v in a.split(",")) for a in resto] or [(0, 0)]
        hoja(celda, salida, pruebas)
    else:
        todos()
