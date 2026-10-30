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
  (la portada y fotos/og.jpg ya no salen de acá: las arma castro_datos.py con su foto de Merlo)

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
    # 29/10: dos calibradores por separado coincidieron a menos de 0,5 m (uno con confianza alta); se usa el promedio.
    # No entraron c-1617_-3255 ni c-1618_-3256 (difieren 1,5 m, ambos con confianza media) ni c-1620_-3251 (uno: no calzable).
    "c-1621_-3251": (0.25, 0),  # Carpintería: bordes de calles abiertas en el monte
    "c-1618_-3259": (-6.75, -4.25),  # Santa Rosa del Conlara: ojo, sin corrimiento parece calzar y no
    "c-1617_-3260": (-5.5, 2.25),  # Santa Rosa del Conlara: lotes que calzan de ancho y huellas centradas
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
        # El rótulo va en la mitad del recorrido del borde, no en la mitad de la recta entre las puntas: en un lado
        # largo apenas quebrado (menos de 5° por vértice) la recta se separa del borde (6415358: 122 m)
        falta = largo / 2
        for s in range(len(tramo) - 1):
            seg = math.dist(tramo[s], tramo[s + 1])
            if falta <= seg or s == len(tramo) - 2:
                f = min(falta / seg, 1) if seg else 0
                medio = (tramo[s][0] + (tramo[s + 1][0] - tramo[s][0]) * f, tramo[s][1] + (tramo[s + 1][1] - tramo[s][1]) * f)
                break
            falta -= seg
        mlat = pts[0][1] + medio[1] / 110540
        mlng = pts[0][0] + medio[0] / (111320 * math.cos(math.radians(lat0)))
        p1, p2 = pantalla[i], pantalla[j]
        mx, my = mundo(mlat, mlng, 20)
        ang = math.degrees(math.atan2(p2[1] - p1[1], p2[0] - p1[0]))
        if ang > 90:
            ang -= 180
        elif ang < -90:
            ang += 180
        # Hacia afuera: del centro del lote hacia el medio del lado
        dx, dy = mx - centro[0], my - centro[1]
        d = math.hypot(dx, dy) or 1
        rotulos.append({"lat": round(mlat, 6), "lng": round(mlng, 6),
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
               "celda": celda_de(lat, lng), "titulo": props[t["id"]]["titulo"], "lote_id": lote.get("id"), "tipo": props[t["id"]]["tipo"]}


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


def area_m2(anillo_ll):
    """Superficie de un anillo [lng, lat] en m² (proyección local; sobra para un lote)."""
    lat0 = sum(p[1] for p in anillo_ll) / len(anillo_ll)
    k = 111320 * math.cos(math.radians(lat0))
    pts = [(p[0] * k, p[1] * 110540) for p in anillo_ll]
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))) / 2


TOLERANCIA_SUPERFICIE = 0.10


def por_punto(ya):
    """Las propiedades sin terreno cruzado con el catastro (casas, locales, complejos y terrenos que no se encontraron)
    cuyo punto publicado cae ADENTRO de una parcela con la misma superficie publicada (±10%): con esas dos cosas a la
    vez, la parcela es la de la propiedad. La parcela sale de la trama ya guardada (catastro/<id>-alrededor.geojson).
    Quedan afuera las de EXCLUIR y las que comparten el punto con otra (ese punto no es de ninguna en particular)."""
    indice = {p["id"]: p for p in json.load(open(RAIZ / "propuestas/castro-inmobiliaria/src/datos/indice.json"))}
    props = json.load(open(FUENTE / "propiedades.json"))
    puntos = {}
    for p in props:
        puntos[(p["lat"], p["lng"])] = puntos.get((p["lat"], p["lng"]), 0) + 1
    for p in props:
        sup = (indice.get(p["id"]) or {}).get("terreno")
        if p["id"] in ya or p["id"] in EXCLUIR or not sup or not p.get("lat") or puntos[(p["lat"], p["lng"])] > 1:
            continue
        parcelas, _ = alrededor(p["id"], p["lat"], p["lng"])
        contienen = [(fid, r) for fid, r, _ in parcelas if adentro(p["lat"], p["lng"], r)]
        # Si el punto cae en más de una (una parcela adentro de otra, como el complejo 6415358), no se sabe cuál es: marcador
        if len(contienen) != 1:
            continue
        fid, ring = contienen[0]
        if abs(area_m2(ring) - sup) / sup > TOLERANCIA_SUPERFICIE:
            continue
        lat = sum(q[1] for q in ring) / len(ring)
        lng = sum(q[0] for q in ring) / len(ring)
        # Para la imagen fija, las que lo tocan (algún vértice a menos de 3 m de uno del lote)
        cerca = lambda a, b: math.hypot((a[0] - b[0]) * 111320 * math.cos(math.radians(lat)), (a[1] - b[1]) * 110540) < 3
        vecinas = [r for f2, r, _ in parcelas if f2 != fid and any(cerca(x, y) for x in r for y in ring)]
        yield {"id": p["id"], "confianza": "punto", "lat": lat, "lng": lng, "puntos": ring, "vecinas": vecinas,
               "celda": celda_de(lat, lng), "titulo": p["titulo"], "lote_id": fid, "tipo": p["tipo"]}


assert round(area_m2([[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]])) == round(0.001 * 111320 * 0.001 * 110540)


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


def tarjeta(t):
    """fotos/lote-tarjeta-<id>.webp: el lote pintado sobre la foto calzada, un poco más cerca que en la ficha. No más:
    la foto z18 tiene ~0,5 m por píxel y 150 m en 560 px ya la estiran 1,9 veces (con 120 m, 2,4, y se ve borrosa)."""
    ancho_m, z = encuadre(t, 2.4, 150)
    img, a_pixel = foto_que_haya(t["lat"], t["lng"], ancho_m, z, CALCES[t["celda"]], (560, 420))
    assert img is not None, f"sin foto para la tarjeta de {t['id']}"
    pintar(img, [[a_pixel(p[1], p[0]) for p in t["puntos"]]]).save(SALIDA / f"lote-tarjeta-{t['id']}.webp", "WEBP", quality=68, method=6)


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
    de_resumen = list(terrenos())
    for t in [*de_resumen, *por_punto({x["id"] for x in de_resumen})]:
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
        if t["tipo"] in ("Terreno", "Campo"):  # las casas siguen con la foto de la casa en la tarjeta
            tarjeta(t)
    (FUENTE / "formas.json").write_text(json.dumps(formas, ensure_ascii=False))
    (FUENTE / "calces.json").write_text(json.dumps({c: list(v) for c, v in CALCES.items()}))
    por_tipo = {}
    for t in dibujados.values():
        por_tipo[t["tipo"]] = por_tipo.get(t["tipo"], 0) + 1
    print(len(formas), "lotes dibujados", por_tipo, "(", sum(t["confianza"] == "punto" for t in dibujados.values()), "por el punto);",
          len(sin_calce), "sin calce todavía:", sin_calce[:12], ";", len(sin_foto), "sin foto:", sin_foto)
    # La portada ya no es la foto satelital (30/10, versión básica): la arma castro_datos.py con su foto de Merlo

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
