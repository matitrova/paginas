"""La forma real de cada terreno de Castro sobre la foto satelital, para su ficha.

Las parcelas vienen del catastro de San Luis (~/castro-datos/catastro/, ya cruzadas con cada ficha). La foto es
Esri World Imagery, pegando sus pedacitos (el servicio que arma una imagen entera devuelve error). En San Luis esa
foto está corrida hasta 25 m respecto del catastro, distinto en cada zona: se corrige moviendo LA FOTO, nunca el
lote (CALCES, en metros, por celda de 0,02° como en MojonApp). El catastro es el dato; la foto es el fondo.

Sale:
  public/propuestas/castro-inmobiliaria/fotos/lote-<id>.webp (640x480) y ~/castro-datos/formas.json con el dibujo
    encima en píxeles de esa imagen (lote, vecinos, rótulos de los lados), que castro_datos.py pasa a la ficha;
  ~/castro-datos/mapas.json, para el mapa que se mueve de cada ficha (las 272): celda, calce, zoom máximo con foto,
    el lote y sus lados en lat/lng (los mismos terrenos de formas.json) y la trama del catastro de alrededor, sin
    calles ni datos de las parcelas (catastro/<id>-alrededor.geojson guarda lo que devolvió el catastro);
  ~/castro-datos/calces.json, los CALCES de abajo para el navegador;
  fotos/lote-tarjeta-<id>.webp (560x420), el lote pintado sobre la foto, para la tarjeta del listado;
  fotos/portada-mapa-800.webp y -1600.webp (16:10) y fotos/og.jpg (1200x630): el barrio con más terrenos con forma,
    con esos lotes pintados, para la portada y para la vista previa del link.

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
import re
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

# Los que no se dibujan aunque pasen la regla de abajo, después de mirarlos, con el motivo (castro_datos.py lo pasa a la
# lista de errores para Mauro). Sin forma, la ficha va con la zona aproximada.
EXCLUIR: dict[str, str] = {
    "6259603": "ofrece 5 lotes en dos loteos (Valle de Cortaderas: manzana 28 lote 21, manzana 68 lotes 10 y 11, manzana 83 "
               "lote 4; Altos del Valle: lote 7) con un solo precio y una sola superficie: no se puede saber cuál es la "
               "parcela del catastro que se dibujaría",
}


def media_aceptable(t):
    """Confianza media = la superficie coincide pero el punto de la ficha no cae adentro del lote. En un loteo de lotes
    iguales, el más cercano con esa superficie puede ser el del vecino. Entra solo si:
      - el punto cae adentro y la superficie difiere 3% o menos, o
      - la superficie es un número poco común (no múltiplo de 50), coincide casi exacto y el lote está a menos de 15 m."""
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


def bytes_de_tile(z, x, y):
    """Un pedacito de foto tal cual llega, guardado para no volver a pedirlo."""
    archivo = TILES / str(z) / str(x) / f"{y}.jpg"
    if not archivo.exists():
        archivo.parent.mkdir(parents=True, exist_ok=True)
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        pedido = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (propuesta Castro Inmobiliaria)"})
        archivo.write_bytes(urllib.request.urlopen(pedido, timeout=30).read())
        time.sleep(0.05)
    return archivo.read_bytes()


def tile(z, x, y):
    """Un pedacito de foto. None si Esri no tiene foto ahí (gris de 2.521 B)."""
    datos = bytes_de_tile(z, x, y)
    return None if len(datos) < 3000 else Image.open(io.BytesIO(datos)).convert("RGB")


def zoom_maximo(lat, lng):
    """18 si Esri tiene foto de verdad en z18 en ese punto; si no 17 (la gris de "Map data not yet available" pesa
    ~2.521 B y cualquier foto real, más de 2.600)."""
    x, y = mundo(lat, lng, 18)
    return 18 if len(bytes_de_tile(18, int(x // 256), int(y // 256))) > 2600 else 17


def foto(lat, lng, ancho_m, z, corrimiento=(0.0, 0.0), tam=(ANCHO, ALTO)):
    """La foto centrada en (lat, lng), ancho_m metros de ancho, corrida corrimiento=(este, norte) metros, de tam píxeles.
    Devuelve la imagen y la función que lleva un punto lat/lng a píxeles de ESA imagen, sin corrimiento:
    el dibujo se ubica por el catastro, que no se mueve."""
    mpp = metros_por_pixel(lat, z)
    w_px, h_px = ancho_m / mpp, ancho_m * tam[1] / tam[0] / mpp
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
    imagen = lienzo.crop((round(ox), round(oy), round(ox + w_px), round(oy + h_px))).resize(tam, Image.LANCZOS)
    escala = tam[0] / w_px

    def a_pixel(plat, plng):
        px, py = mundo(plat, plng, z)
        return (px - x0) * escala, (py - y0) * escala

    return imagen, a_pixel


def anillo(geometria):
    c = geometria["coordinates"]
    return c[0][0] if geometria["type"] == "MultiPolygon" else c[0]


def lados(puntos_ll):
    """Cada lado del lote en metros, juntando los tramos casi rectos (el catastro parte lados en dos). Un rótulo por
    lado de 8 m o más: el punto medio en lat/lng, el ángulo para que el texto se lea derecho en pantalla (Web Mercator,
    y hacia abajo, entre -90 y 90; no cambia con el zoom) y hacia dónde queda afuera (unitario, del centro del lote
    hacia el lado, en pantalla)."""
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
    pantalla = [mundo(p[1], p[0], 20) for p in pts]
    centro = mundo(sum(p[1] for p in pts) / n, sum(p[0] for p in pts) / n, 20)
    rotulos = []
    for k, i in enumerate(quiebres):
        j = quiebres[(k + 1) % len(quiebres)]
        tramo = [m[(i + s) % n] for s in range(((j - i) % n) + 1)]
        largo = sum(math.dist(tramo[s], tramo[s + 1]) for s in range(len(tramo) - 1))
        if largo < 8:  # un lado cortito se dibuja igual, pero su rótulo se encima con los de al lado
            continue
        p1, p2 = pantalla[i], pantalla[j]
        mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
        ang = math.degrees(math.atan2(p2[1] - p1[1], p2[0] - p1[0]))
        if ang > 90:
            ang -= 180
        elif ang < -90:
            ang += 180
        # Hacia afuera: del centro del lote hacia el medio del lado
        dx, dy = mx - centro[0], my - centro[1]
        d = math.hypot(dx, dy) or 1
        rotulos.append({"lat": round((pts[i][1] + pts[j][1]) / 2, 6), "lng": round((pts[i][0] + pts[j][0]) / 2, 6),
                        "ang": round(ang, 1), "afuera": [round(dx / d, 3), round(dy / d, 3)],
                        "texto": f"{largo:.1f} m".replace(".", ",") if largo < 100 else f"{round(largo)} m"})
    return rotulos


def en_pixeles(rotulos, a_pixel):
    """Los rótulos de lados() ubicados en una imagen: 13 px afuera del lado."""
    salida = []
    for r in rotulos:
        x, y = a_pixel(r["lat"], r["lng"])
        salida.append({"x": round(x + r["afuera"][0] * 13, 1), "y": round(y + r["afuera"][1] * 13, 1), "ang": r["ang"], "texto": r["texto"]})
    return salida


# Un rectángulo (en el ecuador) con un vértice de más en el lado de abajo: 4 lados, cada uno con su punto medio,
# acostado o parado, y afuera apuntando para su lado (en pantalla la y crece hacia abajo, o sea al sur)
_rect = {(r["lat"], r["lng"]): r for r in lados([[0, 0], [0.0003, 0], [0.0006, 0], [0.0006, 0.0003], [0, 0.0003], [0, 0]])}
assert set(_rect) == {(0, 0.0003), (0.00015, 0.0006), (0.0003, 0.0003), (0.00015, 0)}, _rect
assert [[round(v) for v in _rect[k]["afuera"]] for k in [(0, 0.0003), (0.00015, 0.0006), (0.0003, 0.0003), (0.00015, 0)]] == [[0, 1], [1, 0], [0, -1], [-1, 0]], _rect
assert all(abs(r["ang"]) in (0, 90) for r in _rect.values()) and _rect[(0, 0.0003)]["texto"] == "66,8 m" and _rect[(0.00015, 0)]["texto"] == "33,2 m", _rect


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
               "celda": celda_de(lat, lng), "titulo": props[t["id"]]["titulo"], "lote_id": lote.get("id")}


def encuadre(t, factor=2.6, minimo=160):
    """Ancho de la foto en metros y zoom: el lote ocupa más o menos 1/factor, y nunca menos de minimo m de contexto."""
    xs = [(p[0] - t["lng"]) * 111320 * math.cos(math.radians(t["lat"])) for p in t["puntos"]]
    ys = [(p[1] - t["lat"]) * 110540 for p in t["puntos"]]
    ancho_m = max(factor * max(max(xs) - min(xs), (max(ys) - min(ys)) * ANCHO / ALTO), minimo)
    z = 18
    while ancho_m / metros_por_pixel(t["lat"], z) > 1400:
        z -= 1
    return ancho_m, z


def tipo_parcela(nombre):
    """El tipo que el catastro escribe dentro de NOMBRE: CALLE, URBANA, SUB-URBANA, RURAL o PROPIEDAD HORIZONTAL."""
    m = re.search(r"Tipo Parcela:\s*([A-Z][A-Z -]*[A-Z])", str(nombre or ""), re.I)
    return m.group(1).upper() if m else ""


assert tipo_parcela("Parcela: 7 \\n Sup. Terreno: 38507.7 m2 \\n Tipo Parcela: CALLE \\n Plano Mensura: 06") == "CALLE"
assert tipo_parcela("Sub-Parcela: 1 \\n Tipo Parcela: PROPIEDAD HORIZONTAL \\n Plano") == "PROPIEDAD HORIZONTAL" and tipo_parcela(None) == ""


def parcelas_alrededor(lat, lng, radio_m=160):
    """Todas las parcelas del catastro alrededor (también las calles): (id, anillo, tipo)."""
    dlat, dlng = radio_m / 110540, radio_m / (111320 * math.cos(math.radians(lat)))
    q = (f"{WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=SanLuis:GIS_PARCELAS_VV&outputFormat=application/json"
         f"&srsName=EPSG:4326&BBOX={lng - dlng},{lat - dlat},{lng + dlng},{lat + dlat},EPSG:4326")
    datos = json.loads(urllib.request.urlopen(q, timeout=60).read())
    return [(f.get("id"), anillo(f["geometry"]), tipo_parcela(f["properties"].get("NOMBRE"))) for f in datos.get("features", [])]


def alrededor(ident, lat, lng):
    """La trama del catastro a ~150 m: (id, anillo, tipo) de cada parcela, sin calles y sin ningún otro dato de la
    parcela (el tipo, URBANA o PROPIEDAD HORIZONTAL por ejemplo, no identifica a nadie y permite filtrar sin volver a
    pedir todo). Se guarda en catastro/<id>-alrededor.geojson y no se vuelve a pedir. Si el catastro no contesta,
    las vecinas que ya se habían bajado (solo los terrenos que se cruzaron con el catastro), o nada; eso no se guarda."""
    archivo = FUENTE / f"catastro/{ident}-alrededor.geojson"
    if not archivo.exists():
        try:
            parcelas = parcelas_alrededor(lat, lng, 150)
        except Exception as e:  # el servidor del catastro se cae seguido
            respaldo = FUENTE / f"catastro/{ident}-vecinas.geojson"
            print(f"  el catastro no contestó para {ident} ({e}); va {'-vecinas' if respaldo.exists() else 'sin trama'}")
            vecinas = json.load(open(respaldo)).get("features", []) if respaldo.exists() else []
            return [(f.get("id"), anillo(f["geometry"]), f["properties"].get("tipo_parcela", "")) for f in vecinas], "respaldo"
        archivo.write_text(json.dumps({"type": "FeatureCollection", "features": [
            {"type": "Feature", "id": fid, "geometry": {"type": "Polygon", "coordinates": [ring]}, "properties": {"tipo": tipo}}
            for fid, ring, tipo in parcelas if tipo != "CALLE"]}))
        time.sleep(0.3)
    return [(f["id"], f["geometry"]["coordinates"][0], f["properties"]["tipo"]) for f in json.load(open(archivo))["features"]], "catastro"


def adentro(lat, lng, anillo_ll):
    dentro = False
    for (x1, y1), (x2, y2) in zip(anillo_ll, anillo_ll[1:]):
        if (y1 > lat) != (y2 > lat) and lng < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
            dentro = not dentro
    return dentro


def sin_encimadas(parcelas):
    """Saca las subparcelas de propiedad horizontal que caen encima de otra parcela (su centro adentro de una que ya
    quedó), que dibujarían una línea doble. Las demás quedan: en 261 de 263 son el único dibujo de ese pedazo, y
    sacarlas dejaría agujeros en la trama."""
    quedan = [p for p in parcelas if p[2] != "PROPIEDAD HORIZONTAL"]
    for p in parcelas:
        c = (sum(q[1] for q in p[1]) / len(p[1]), sum(q[0] for q in p[1]) / len(p[1]))
        if p[2] == "PROPIEDAD HORIZONTAL" and not any(adentro(*c, q[1]) for q in quedan):
            quedan.append(p)
    return quedan


_cuadro = [[0, 0], [0.0003, 0], [0.0003, 0.0003], [0, 0.0003], [0, 0]]
_chico = [[0.0001, 0.0001], [0.0002, 0.0001], [0.0002, 0.0002], [0.0001, 0.0002], [0.0001, 0.0001]]
_lejos = [[x + 0.001, y] for x, y in _chico]
assert adentro(0.00015, 0.00015, _cuadro) and not adentro(0.00015, 0.0004, _cuadro)
# Una PH encima de una urbana se va; dos PH iguales dejan una; una PH sola queda
assert [p[0] for p in sin_encimadas([(1, _cuadro, "URBANA"), (2, _chico, "PROPIEDAD HORIZONTAL"), (3, _lejos, "PROPIEDAD HORIZONTAL"),
                                     (4, _lejos, "PROPIEDAD HORIZONTAL")])] == [1, 3]


def seis(anillo_ll):
    return [[round(p[0], 6), round(p[1], 6)] for p in anillo_ll]


def foto_que_haya(lat, lng, ancho_m, z, corrimiento, tam=(ANCHO, ALTO)):
    """foto() en el zoom más alto (desde z y hasta 15) en el que Esri tiene foto en toda la ventana."""
    while z >= 15:
        img, a_pixel = foto(lat, lng, ancho_m, z, corrimiento, tam)
        if img is not None:
            return img, a_pixel
        z -= 1
    return None, None


def pintar(img, anillos_px, borde=2, fino=3, alfa=115):
    """Lotes con borde blanco y relleno naranja (#FF8000; alfa 115 = 45 %). Se dibujan a fino x y se achican, para que
    el borde salga suave."""
    capa = Image.new("RGBA", (img.width * fino, img.height * fino), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    for poly in anillos_px:
        pts = [(x * fino, y * fino) for x, y in poly]
        d.polygon(pts, fill=(255, 128, 0, alfa))
        d.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=borde * fino, joint="curve")
    return Image.alpha_composite(img.convert("RGBA"), capa.resize(img.size, Image.LANCZOS)).convert("RGB")


def atribucion(img, texto="Esri, Maxar, Earthstar Geographics"):
    """La atribución de la foto, chica, abajo a la derecha."""
    from PIL import ImageFont
    letra = ImageFont.load_default(size=max(10, round(img.width / 110)))
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0, x1, y1 = d.textbbox((0, 0), texto, font=letra)
    aire = round(letra.size * 0.4)
    izq, arriba = img.width - (x1 - x0) - 2 * aire, img.height - (y1 - y0) - 2 * aire
    d.rectangle((izq, arriba, img.width, img.height), fill=(0, 0, 0, 120))
    d.text((izq + aire - x0, arriba + aire - y0), texto, font=letra, fill=(255, 255, 255, 235))
    return img


def tarjeta(t):
    """fotos/lote-tarjeta-<id>.webp: el lote pintado sobre la foto calzada, un poco más cerca que en la ficha. No más:
    la foto z18 tiene ~0,5 m por píxel y 150 m en 560 px ya la estiran 1,9 veces (con 120 m, 2,4, y se ve borrosa)."""
    ancho_m, z = encuadre(t, 2.4, 150)
    img, a_pixel = foto_que_haya(t["lat"], t["lng"], ancho_m, z, CALCES[t["celda"]], (560, 420))
    assert img is not None, f"sin foto para la tarjeta de {t['id']}"
    pintar(img, [[a_pixel(p[1], p[0]) for p in t["puntos"]]]).save(SALIDA / f"lote-tarjeta-{t['id']}.webp", "WEBP", quality=68, method=6)


def portada(dibujados):
    """La foto de la primera pantalla y de la vista previa del link: la ventana de 800 x 500 m que junta más terrenos
    con forma de una misma celda, para que un solo calce sirva para toda la foto, y después ajustada a esos terrenos
    (con aire alrededor) para que se vean grandes y repartidos. Se pintan los lotes de esa celda que entran enteros."""
    ancho_m, alto_m, margen, aire = 800, 500, 15, 35
    kx = lambda lat: 111320 * math.cos(math.radians(lat))

    def sin_salirse(celda, lat, lng, alto=alto_m, ancho=ancho_m):
        """Corre el centro para que la ventana no se salga de la celda (la de al lado tiene otro calce)."""
        fila, col = (int(v) for v in celda[1:].split("_"))
        m_lat, m_lng = alto / 2 / 110540, ancho / 2 / kx(lat)
        return (min(max(lat, fila * GRADOS_POR_CELDA + m_lat), (fila + 1) * GRADOS_POR_CELDA - m_lat),
                min(max(lng, col * GRADOS_POR_CELDA + m_lng), (col + 1) * GRADOS_POR_CELDA - m_lng))

    def enteros(celda, lat, lng):
        """Los lotes de la celda que entran enteros en la ventana."""
        return [t for t in dibujados if t["celda"] == celda and all(
            abs(q[0] - lng) * kx(lat) <= ancho_m / 2 - margen and abs(q[1] - lat) * 110540 <= alto_m / 2 - margen for q in t["puntos"])]

    centro = max(dibujados, key=lambda c: len(enteros(c["celda"], *sin_salirse(c["celda"], c["lat"], c["lng"]))))
    grupo = enteros(centro["celda"], *sin_salirse(centro["celda"], centro["lat"], centro["lng"]))
    pts = [q for t in grupo for q in t["puntos"]]
    medio = ((min(q[1] for q in pts) + max(q[1] for q in pts)) / 2, (min(q[0] for q in pts) + max(q[0] for q in pts)) / 2)
    caja_w = (max(q[0] for q in pts) - min(q[0] for q in pts)) * kx(medio[0]) + 2 * aire
    caja_h = (max(q[1] for q in pts) - min(q[1] for q in pts)) * 110540 + 2 * aire
    de_la_celda = [t for t in dibujados if t["celda"] == centro["celda"]]
    calce = CALCES[centro["celda"]]
    pintados = {}
    for tam, og in [((1600, 1000), False), ((1200, 630), True)]:
        ancho = max(caja_w, caja_h * tam[0] / tam[1])
        lat, lng = sin_salirse(centro["celda"], *medio, ancho * tam[1] / tam[0], ancho)
        img, a_pixel = foto_que_haya(lat, lng, ancho, 18, calce, tam)
        assert img is not None, "sin foto para la portada"
        # Solo los que entran enteros: un lote cortado contra el borde no se entiende
        lotes = [px for px in ([a_pixel(p[1], p[0]) for p in t["puntos"]] for t in de_la_celda)
                 if all(0 <= x <= tam[0] and 0 <= y <= tam[1] for x, y in px)]
        assert len(lotes) >= len(grupo), (len(lotes), len(grupo))
        pintados["og" if og else "portada"] = (len(lotes), round(ancho))
        img = pintar(img, lotes, borde=2 if tam[0] < 1600 else 3, alfa=148)  # 58 %: al 45 % se ve marrón sobre el monte
        if og:
            atribucion(img).save(SALIDA / "og.jpg", "JPEG", quality=82, optimize=True)
            continue
        for ancho in (1600, 800):
            chica = img.resize((ancho, ancho * 10 // 16), Image.LANCZOS) if ancho != img.width else img.copy()
            atribucion(chica).save(SALIDA / f"portada-mapa-{ancho}.webp", "WEBP", quality=70, method=6)
    print(f"portada: celda {centro['celda']}, centro {medio[0]:.6f},{medio[1]:.6f}; lotes pintados y ancho en m: {pintados}")


def hoja(celda, salida, pruebas):
    candidatos = [t for t in terrenos() if t["celda"] == celda]
    if not candidatos:
        # Zona sin terrenos con forma (solo casas): se calza alrededor del punto publicado de cualquier propiedad de la celda
        props = [p for p in json.load(open(FUENTE / "propiedades.json")) if p.get("lat") and celda_de(float(p["lat"]), float(p["lng"])) == celda]
        if not props:
            raise SystemExit(f"no hay propiedades en {celda}")
        p = props[0]
        lat, lng = float(p["lat"]), float(p["lng"])
        candidatos = [{"id": p["id"], "lat": lat, "lng": lng, "titulo": p["titulo"], "puntos": [[lng - 1e-5, lat], [lng + 1e-5, lat], [lng, lat + 1e-5], [lng - 1e-5, lat]]}]
    t = candidatos[0]
    ancho_m, z = 260, 18
    parcelas = parcelas_alrededor(t["lat"], t["lng"])
    cuadros = []
    for este, norte in pruebas:
        img, a_pixel = foto(t["lat"], t["lng"], ancho_m, z, (este, norte))
        if img is None:
            raise SystemExit(f"Esri no tiene foto en z{z} para {celda}")
        d = ImageDraw.Draw(img)
        for _, anillo_ll, tipo in parcelas:
            d.line([a_pixel(p[1], p[0]) for p in anillo_ll], fill=(255, 80, 80) if tipo == "CALLE" else (255, 255, 0), width=1)
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
    formas, sin_calce, sin_foto, dibujados = {}, [], [], {}
    for t in terrenos():
        if t["celda"] not in CALCES:
            sin_calce.append(t["id"])
            continue
        ancho_m, z = encuadre(t)
        img, a_pixel = foto_que_haya(t["lat"], t["lng"], ancho_m, z, CALCES[t["celda"]])
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
            "lados": en_pixeles(lados(t["puntos"]), a_pixel),
            # La silueta sola, en una caja de 0 a 100, para la miniatura de la tarjeta
            "mini": " ".join(f"{(x - min(xs)) / lado * 100:.1f},{(y - min(ys)) / lado * 100:.1f}" for x, y in poly),
        }
        dibujados[t["id"]] = t
        tarjeta(t)
    (FUENTE / "formas.json").write_text(json.dumps(formas, ensure_ascii=False))
    (FUENTE / "calces.json").write_text(json.dumps({c: list(v) for c, v in CALCES.items()}))
    print(len(formas), "terrenos dibujados;", len(sin_calce), "sin calce todavía:", sin_calce[:12], ";", len(sin_foto), "sin foto:", sin_foto)
    portada(list(dibujados.values()))

    # El mapa que se mueve de cada ficha: el lote solo en los mismos terrenos de formas.json, y la trama solo donde la
    # foto está calzada (en el resto va una zona aproximada, que arma castro_datos.py)
    mapas, respaldos = {}, 0
    for p in json.load(open(FUENTE / "propiedades.json")):
        t = dibujados.get(p["id"])
        lat, lng = (t["lat"], t["lng"]) if t else (p["lat"], p["lng"])
        celda = celda_de(lat, lng)
        parcelas, de_donde = alrededor(p["id"], lat, lng)
        respaldos += de_donde == "respaldo"
        propio = t["lote_id"] if t else None
        mapas[p["id"]] = {
            "calce": list(CALCES[celda]) if celda in CALCES else None,
            "celda": celda,
            "zmax": zoom_maximo(lat, lng),
            "lote": seis(t["puntos"]) if t else None,
            "lados": lados(t["puntos"]) if t else None,
            "alrededor": [seis(r) for fid, r, _ in sin_encimadas(parcelas) if fid != propio] if celda in CALCES else [],
        }
    (FUENTE / "mapas.json").write_text(json.dumps(mapas))
    print(len(mapas), "mapas de ficha;", sum(1 for m in mapas.values() if m["alrededor"]), "con trama;", respaldos, "con el respaldo de -vecinas;",
          sum(m["zmax"] == 17 for m in mapas.values()), "con zoom máximo 17")


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
