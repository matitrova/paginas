"""Arma los datos de la propuesta de Castro Inmobiliaria desde lo que se sacó de su propio sitio.

Entrada: ~/castro-datos (propiedades.json, urbanizaciones.json, institucional.json y las fotos bajadas).
No va al repo: son 1,3 GB. Sale:
  propuestas/castro-inmobiliaria/src/datos/indice.json      lo que necesitan la portada y el listado
  propuestas/castro-inmobiliaria/src/datos/sitio.json       urbanizaciones, equipo, museo y contacto
  public/propuestas/castro-inmobiliaria/fichas/<id>.json    la ficha completa, se pide al abrirla; con su mapa
                                                            (de ~/castro-datos/mapas.json, que arma castro_satelite.py),
                                                            a cuánto queda de la plaza, la terminal y el hospital, y la
                                                            altura y la pendiente de la zona
  public/propuestas/castro-inmobiliaria/mapa.json           los lotes simplificados y los calces, para el mapa general
  public/propuestas/castro-inmobiliaria/fotos/p-<id>.webp   una foto chica por propiedad, recortada a 4:3
  public/propuestas/castro-inmobiliaria/fotos/*.webp         equipo, museo, urbanizaciones y el logo
  ~/castro-datos/errores_de_carga.md                         lo que no cierra en sus datos, para Mauro
Guarda lo que pide afuera: ~/castro-datos/rutas.json (OSRM) y ~/castro-datos/terrarium/ (relieve).
Antes hay que correr castro_satelite.py.
Las galerías completas no se copian: se ven desde el servicio de fotos de ellos (static.tokkobroker.com).

Los datos van tal cual los publican, salvo dos cosas que se muestran mal en su sitio:
  - un 0 ("0.00M2", "0 años", 0 dormitorios) es un campo vacío, no un dato: queda en null;
  - en 12 propiedades la unidad dice "HA" pero el número está en m² ("Campo 570 Ha" figura 5700000.00HA):
    se toma como m². El catastro lo confirma en los terrenos que se pudieron comparar.

Uso:  ../Test1_Inmo/.venv/bin/python scripts/castro_datos.py [carpeta-de-datos]
"""
import json
import math
import re
import sys
import time
import urllib.request
from collections import Counter
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageOps

sys.dont_write_bytecode = True  # que importar castro_satelite no deje scripts/__pycache__ en el repo
from castro_satelite import adentro, celda_de, mundo  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "castro-datos")
SRC = RAIZ / "propuestas/castro-inmobiliaria/src/datos"
PUB = RAIZ / "public/propuestas/castro-inmobiliaria"

# Grafías distintas de un mismo lugar en sus títulos; solo para agrupar en los filtros
LOCALIDADES = {"Carpinteria": "Carpintería", "Merlo": "Villa de Merlo", "Santa Rosa de Conlara": "Santa Rosa del Conlara"}


def superficie(texto):
    """'600.00M2' → 600; '5700000.00HA' → 5700000 (está en m² aunque diga HA); '0.00M2' → None."""
    m = re.match(r"^\s*([\d.]+)\s*(M2|HA)\s*$", texto or "")
    if not m:
        return None
    valor = float(m.group(1))
    return round(valor, 2) if valor > 0 else None


def entero(valor):
    try:
        n = int(float(valor))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def antiguedad(texto):
    n = entero(re.sub(r"\D", "", texto or "") or None) if "-" not in (texto or "") else None
    return (f"{n} años" if n > 1 else "1 año") if n else None


def etiquetas(p):
    """Lo que se ve de un vistazo en la tarjeta. Sale de lo que publican: el título, la descripción y los servicios."""
    texto = f"{p['titulo']} {p.get('descripcion') or ''}"
    marcas = []
    if re.search(r"\ba estrenar\b", texto, re.I):
        marcas.append("A estrenar")
    if re.search(r"apto\s+cr[eé]dito", texto, re.I):
        marcas.append("Apto crédito")
    if re.search(r"financiaci[oó]n|financiamos|en cuotas", texto, re.I):
        marcas.append("Financiación")
    if any("gas natural" in s.lower() for s in p.get("servicios") or []):
        marcas.append("Gas natural")
    return marcas


def clave_zona(z):
    """'Rincón Del Este', 'Rincón del Este' y 'rincon del este' son la misma zona."""
    import unicodedata
    z = unicodedata.normalize("NFD", z or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", "", z)).strip()


# Variantes que el agrupado solo no junta (escritas distinto, no solo con otra mayúscula)
ALIAS_ZONA = {"rincon de este": "rincon del este", "santa rosa de conlara": "santa rosa del conlara"}

UA = "castro-propuesta/1.0 (matitrova13 at gmail)"
# A cuánto queda: los lugares salen de OpenStreetMap (buscados en Nominatim el 26/10/2026; centro del área o el nodo):
#   Plaza de Merlo: way 145821661, "Plaza Márquez de Sobremonte", -32.342700, -65.013678
#   Terminal: node 505820708, "Terminal Omnibus Merlo", Ruta Provincial 1, -32.350158, -65.016442. La "Terminal de
#     Ómnibus locales" de al lado de la plaza (node 2726154850) es la vieja: sus paradas dicen "Vieja Terminal de Merlo".
#   Hospital: way 731766514, "Hospital Madre Catalina Rodríguez", El Ceibo y Ruta 1, -32.352941, -65.016397. En OSM
#     figura como landuse=residential (con emergency=yes); hay además un amenity=hospital sin nombre (node 2725909561)
#     en Las Magdalenas, que no se usa.
LUGARES = [("Plaza de Merlo", -32.342700, -65.013678), ("Terminal de ómnibus", -32.350158, -65.016442),
           ("Hospital de Merlo", -32.352941, -65.016397)]


def metros_entre(lat1, lng1, lat2, lng2):
    return math.hypot((lng2 - lng1) * 111320 * math.cos(math.radians(lat1)), (lat2 - lat1) * 110540)


def rutas(puntos):
    """Metros y segundos en auto de cada punto a los LUGARES, con el servicio table del OSRM de demostración: pocos
    pedidos (90 puntos cada uno), uno por segundo. Se guardan en rutas.json y no se vuelven a pedir."""
    archivo = FUENTE / "rutas.json"
    guardadas = json.loads(archivo.read_text()) if archivo.exists() else {}
    faltan = [pt for pt in dict.fromkeys(puntos) if f"{pt[0]},{pt[1]}" not in guardadas]
    for i in range(0, len(faltan), 90):
        tanda = faltan[i:i + 90]
        coords = ";".join(f"{lng},{lat}" for lat, lng in tanda + [(la, ln) for _, la, ln in LUGARES])
        n = len(tanda)
        url = (f"https://router.project-osrm.org/table/v1/driving/{coords}?sources={';'.join(map(str, range(n)))}"
               f"&destinations={';'.join(str(n + k) for k in range(len(LUGARES)))}&annotations=duration,distance")
        r = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90).read())
        assert r["code"] == "Ok", r.get("message")
        for k, (lat, lng) in enumerate(tanda):
            guardadas[f"{lat},{lng}"] = [[d, s] if d is not None else None for d, s in zip(r["distances"][k], r["durations"][k])]
        archivo.write_text(json.dumps(guardadas))
        time.sleep(1.1)
    return guardadas


def cercanos(lat, lng, viajes):
    """En auto, aproximado. Lejos de Merlo (a más de 20 km de la plaza por ruta, o en línea recta si OSRM no encontró
    camino), solo cuánto queda Merlo: con la línea recta, un campo de Santa Rosa del Conlara a 23 km por ruta salía con
    "Hospital de Merlo 22,9 km"."""
    viaje = viajes[f"{lat},{lng}"]
    if (viaje[0][0] if viaje[0] else metros_entre(lat, lng, LUGARES[0][1], LUGARES[0][2])) > 20000:
        return [{"lugar": "Villa de Merlo", "km": round(viaje[0][0] / 1000)}] if viaje[0] else []
    return [{"lugar": nombre, "km": round(v[0] / 1000, 1), "min": max(1, round(v[1] / 60))} for (nombre, _, _), v in zip(LUGARES, viaje) if v]


@lru_cache(maxsize=None)
def terrarium(x, y):
    """Un pedacito del relieve (Terrarium, z14: ~8 m por píxel, de datos SRTM de ~30 m)."""
    archivo = FUENTE / f"terrarium/14/{x}/{y}.png"
    if not archivo.exists():
        archivo.parent.mkdir(parents=True, exist_ok=True)
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/{x}/{y}.png"
        archivo.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read())
        time.sleep(0.05)
    return Image.open(archivo).convert("RGB")


def elevacion(lat, lng):
    """Metros sobre el nivel del mar: (R*256 + G + B/256) - 32768, interpolado entre los cuatro píxeles de alrededor."""
    px, py = (v - 0.5 for v in mundo(lat, lng, 14))
    x0, y0 = math.floor(px), math.floor(py)
    fx, fy = px - x0, py - y0

    def h(x, y):
        r, g, b = terrarium(x // 256, y // 256).getpixel((x % 256, y % 256))
        return r * 256 + g + b / 256 - 32768
    return (h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx) * (1 - fy) + (h(x0, y0 + 1) * (1 - fx) + h(x0 + 1, y0 + 1) * fx) * fy


RUMBOS = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"]


def hacia(sube_este, sube_norte):
    """Para dónde baja el terreno (al revés de para dónde sube), en 8 rumbos."""
    return RUMBOS[round(math.degrees(math.atan2(-sube_este, -sube_norte)) / 45) % 8]


assert hacia(1, 0) == "oeste" and hacia(0, -1) == "norte" and hacia(-1, -1) == "noreste" and hacia(0.2, 1) == "sur"


def altura(lat, lng):
    """La altura en el punto y la pendiente de la zona, con muestras a 50 m al norte, sur, este y oeste (~100 m): se
    habla de la zona y no del lote, porque el relieve es de ~30 m."""
    d_lat, d_lng = 50 / 110540, 50 / (111320 * math.cos(math.radians(lat)))
    sube_este = (elevacion(lat, lng + d_lng) - elevacion(lat, lng - d_lng)) / 100
    sube_norte = (elevacion(lat + d_lat, lng) - elevacion(lat - d_lat, lng)) / 100
    pendiente = math.hypot(sube_este, sube_norte) * 100
    tipo = "plana" if pendiente < 3 else "suave" if pendiente < 8 else "marcada" if pendiente <= 15 else "fuerte"
    return {"m": int(round(elevacion(lat, lng), -1)), "pendiente": tipo, "hacia": None if tipo == "plana" else hacia(sube_este, sube_norte)}


def simplificar(anillo, tolerancia_m=1.0):
    """Douglas-Peucker en metros (para el mapa general, que no necesita cada quiebre de menos de 1 m)."""
    lat0 = anillo[0][1]
    m = [((p[0] - anillo[0][0]) * 111320 * math.cos(math.radians(lat0)), (p[1] - lat0) * 110540) for p in anillo]

    def dist(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        return abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0])) / math.hypot(dx, dy) if dx or dy else math.dist(p, a)

    def rdp(i, j):
        k, lejos = max(((k, dist(m[k], m[i], m[j])) for k in range(i + 1, j)), key=lambda kd: kd[1], default=(None, 0))
        return rdp(i, k)[:-1] + rdp(k, j) if lejos > tolerancia_m else [i, j]
    return [anillo[i] for i in rdp(0, len(anillo) - 1)]


# Un cuadrado de ~33 m con un vértice de más en un lado (se va) y uno corrido 3 m (queda)
assert len(simplificar([[0, 0], [0.00015, 0], [0.0003, 0], [0.0003, 0.0003], [0, 0.0003], [0, 0]])) == 5
assert len(simplificar([[0, 0], [0.00015, 0.00003], [0.0003, 0], [0.0003, 0.0003], [0, 0.0003], [0, 0]])) == 6

# Lo que nunca se publica: los nombres de resumen.json y los del catastro (NOMBRE trae nomenclatura, partida, plano y
# superficie; LINK, el id de la parcela). Se comparan en minúscula, y además se busca una nomenclatura en el texto.
PROHIBIDAS = {"nomenclatura", "tributaria", "partida", "plano_mensura", "etiqueta", "superficie_catastro", "superficie_catastro_m2",
              "nombre", "link", "catnmc_tri", "catnmc_cat", "catmen_codigo"}
NOMENCLATURA = re.compile(r"\d{2}-\d{2}-\d{2}-\d{2}-\d{6}-\d{6}|Nom\.")


def claves(x):
    if isinstance(x, dict):
        for k, v in x.items():
            yield k
            yield from claves(v)
    elif isinstance(x, list):
        for v in x:
            yield from claves(v)


def sin_catastro(nombre, dato):
    malas = PROHIBIDAS & {k.lower() for k in claves(dato)}
    assert not malas, f"{nombre}: lleva {malas}, que no se publica"
    assert not NOMENCLATURA.search(json.dumps(dato, ensure_ascii=False)), f"{nombre}: lleva una nomenclatura del catastro"


for _mala in ({"mapa": [{"ETIQUETA": "8"}]}, {"CATNMC_TRI": "13-931519"}, {"d": "Nom.Catastral: 00-06-44-07-000000-000007"}, {"d": "00-06-44-07-000000-000007"}):
    try:
        sin_catastro("prueba", _mala)
    except AssertionError:
        continue
    raise AssertionError(f"sin_catastro no ve {_mala}")
sin_catastro("prueba", {"descripcion": "Plano aprobado, nomenclado. Tel 2656-123456", "lados": [{"texto": "19,9 m"}]})


def centro(anillo):
    """El promedio de los vértices tal como vienen (con el que cierra, como castro_satelite.terrenos()): lat, lng."""
    return sum(q[1] for q in anillo) / len(anillo), sum(q[0] for q in anillo) / len(anillo)


def metros_al_borde(lat, lng, anillo):
    """Distancia en metros de un punto al borde de un anillo [[lng, lat], ...]."""
    kx = 111320 * math.cos(math.radians(lat))
    xy = [((q[0] - lng) * kx, (q[1] - lat) * 110540) for q in anillo]

    def al_tramo(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        t = max(0, min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy))) if dx or dy else 0
        return math.hypot(a[0] + t * dx, a[1] + t * dy)
    return min(al_tramo(xy[i], xy[i + 1]) for i in range(len(xy) - 1))


def mismo_poligono(a, b, tolerancia_m=0.5):
    """Cada vértice de uno a menos de tolerancia_m de algún vértice del otro, y al revés."""
    cerca = lambda p, otro: any(metros_entre(p[1], p[0], q[1], q[0]) <= tolerancia_m for q in otro)
    return all(cerca(p, b) for p in a) and all(cerca(q, a) for q in b)


_cuadro = [[0, 0], [0.0003, 0], [0.0003, 0.0003], [0, 0.0003], [0, 0]]  # ~33 m en el ecuador
assert metros_al_borde(0, 0.00015, _cuadro) < 0.01 and 16 < metros_al_borde(0.00015, 0.00015, _cuadro) < 17
assert mismo_poligono(_cuadro, [[0.000002, 0], *_cuadro[1:4], [0.000002, 0]]) and not mismo_poligono(_cuadro, _cuadro[:3] + [[0, 0.0004], [0, 0]])


def foto(origen, destino, ancho, calidad=72, recorte=None):
    """recorte=(ancho, alto) recorta al centro: las fotos de Tokko son cuadradas y la tarjeta es 4:3."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists():
        return
    im = ImageOps.exif_transpose(Image.open(origen)).convert("RGB")
    if recorte:
        im = ImageOps.fit(im, recorte, Image.LANCZOS)
    elif im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    im.save(destino, "WEBP", quality=calidad, method=6)


def es_volante(origen):
    """La primera foto de cada propiedad es un volante armado por ellos, con el precio, la zona y el logo pegados
    (a veces el precio es viejo). Se reconoce por la pestaña naranja del logo, arriba al centro: ahí un volante
    tiene más de la mitad de naranja y una foto común, nada."""
    im = Image.open(origen)
    im.draft("RGB", (300, 300))
    im = im.convert("RGB")
    w, h = im.size
    datos = im.crop((int(w * 0.42), 0, int(w * 0.58), int(h * 0.09))).tobytes()
    pixeles = [datos[i:i + 3] for i in range(0, len(datos), 3)]
    return sum(1 for r, g, b in pixeles if r > 210 and 80 < g < 175 and b < 90) / len(pixeles) > 0.25


# Asserts baratos: si cambia el formato de la fuente, esto falla antes de generar algo malo
assert superficie("600.00M2") == 600 and superficie("0.00M2") is None and superficie("5700000.00HA") == 5700000
assert antiguedad("0 años") is None and antiguedad("-1 años") is None and antiguedad("7 años") == "7 años"

propiedades = json.load(open(FUENTE / "propiedades.json"))
PINES = json.load(open(FUENTE / "pines.json"))
# Las zonas salen del título de cada aviso, escritas de varias formas: se agrupan y se muestra la grafía que más usan.
# Es solo para el filtro y la tarjeta; los títulos quedan tal cual los publican.
_grafias = {}
for _p in propiedades:
    _k = ALIAS_ZONA.get(clave_zona(_p["zona"]), clave_zona(_p["zona"]))
    _grafias.setdefault(_k, []).append(_p["zona"] or "")
# Entre grafías igual de usadas, la que ya estaba publicada en indice.json (un link con esa zona en el filtro sigue
# andando, porque el listado la compara tal cual) y después g, para no depender del orden del set
_publicadas = {x["zona"] for x in json.load(open(SRC / "indice.json"))} if (SRC / "indice.json").exists() else set()
ZONA = {z: max(set(v), key=lambda g: (v.count(g), g != g.lower(), "del" in g, g in _publicadas, g)) for z, v in _grafias.items()}
zona_de = lambda z: ZONA[ALIAS_ZONA.get(clave_zona(z), clave_zona(z))]
assert zona_de("Rincón Del Este") == zona_de("Rincón de Este") == "Rincón del Este"
assert antiguedad("1 años") == "1 año" and antiguedad("7 años") == "7 años"
# La forma real de los terrenos (formas.json), el mapa que se mueve de cada ficha (mapas.json) y las celdas calzadas
# (calces.json) los arma castro_satelite.py
for _falta in ("formas.json", "mapas.json", "calces.json"):
    if not (FUENTE / _falta).exists():
        raise SystemExit(f"falta {FUENTE / _falta}: corré antes scripts/castro_satelite.py")
FORMAS = json.load(open(FUENTE / "formas.json"))
MAPAS = json.load(open(FUENTE / "mapas.json"))
CALCES = json.load(open(FUENTE / "calces.json"))
# Cuántas propiedades publican exactamente el mismo punto (suele ser el del barrio, no el de la propiedad)
PUNTOS = Counter((p["lat"], p["lng"]) for p in propiedades)
# A cuánto queda y la altura se miden en el centro del lote cuando lo hay (el punto publicado puede estar a 140 m)
DONDE = {p["id"]: tuple(round(v, 6) for v in centro(MAPAS[p["id"]]["lote"])) if MAPAS[p["id"]]["lote"] else (p["lat"], p["lng"])
         for p in propiedades}
VIAJES = rutas(list(DONDE.values()))
_muestra = {x["id"]: x for x in propiedades if x["id"] in ("633017", "8147479")}
assert [es_volante(FUENTE / f) for f in _muestra["633017"]["fotos_locales"][:3]] == [True, True, False]
assert [es_volante(FUENTE / f) for f in _muestra["8147479"]["fotos_locales"][:2]] == [True, False]

indice, errores, con_volante, FICHAS = [], [], 0, {}
for p in propiedades:
    s = p.get("superficies") or {}
    ident = p["id"]
    # Las fotos de verdad primero y los volantes al final: no se pierde nada, pero arriba no aparece un precio pegado
    assert len(p["fotos"]) == len(p["fotos_locales"]), ident
    volantes = [es_volante(FUENTE / f) for f in p["fotos_locales"]]
    con_volante += any(volantes)
    orden = sorted(range(len(volantes)), key=lambda i: volantes[i])
    indice.append({
        "id": ident,
        "codigo": p["codigo"],
        "titulo": p["titulo"].strip(),
        "operacion": p["operacion"].split("/"),
        "tipo": p["tipo"],
        "zona": zona_de(p["zona"]),
        "localidad": LOCALIDADES.get(p["localidad"], p["localidad"] or ""),
        "urbanizacion": [u["id"] for u in p.get("urbanizacion") or []],
        # La única que está en venta y en alquiler (7665257) no trae precio de listado: va el de su primera operación
        "precio": entero(p["precio_numero"]) or entero((p.get("operaciones") or [{}])[0].get("precio")),
        "moneda": p["moneda"] or (p.get("operaciones") or [{}])[0].get("moneda", ""),
        # El precio de cada operación: en el listado de alquileres se muestra el del alquiler
        "precios": {o["operacion"]: [entero(o["precio"]), o["moneda"]] for o in p.get("operaciones") or []},
        "ambientes": entero(p["ambientes"]),
        "dormitorios": entero(p["dormitorios"]),
        "banos": entero(p["banos"]),
        "cubierta": superficie(s.get("cubierta")),
        "construido": superficie(s.get("total_construido")),
        "terreno": superficie(s.get("terreno")),
        "alta": (p.get("alta_en_listado") or "")[:10],
        "destacada": bool(p.get("destacada_en_inicio")),
        "lat": p["lat"],
        "lng": p["lng"],
        "fotos": len(p["fotos"]),
        "mini": FORMAS.get(ident, {}).get("mini"),
        "etiquetas": etiquetas(p),
    })
    ficha = {
        "id": ident,
        "descripcion": p.get("descripcion") or "",
        "adicionales": list(dict.fromkeys(p.get("adicionales") or [])),
        "servicios": list(dict.fromkeys(p.get("servicios") or [])),
        "fotos": [p["fotos"][i] for i in orden],
        "semicubierta": superficie(s.get("semicubierta")),
        "cochera": entero(p.get("cochera")),
        "plantas": entero(p.get("plantas")),
        "antiguedad": antiguedad(p.get("antiguedad")),
        "operaciones": p.get("operaciones") or [],
        "forma": {k: v for k, v in FORMAS[ident].items() if k != "mini"} if ident in FORMAS else None,
    }
    m = MAPAS[ident]
    compartido = PUNTOS[(p["lat"], p["lng"])] - 1
    ficha["mapa"] = {"calce": m["calce"], "celda": m["celda"], "zmax": m["zmax"], "lote": m["lote"], "lados": m["lados"],
                     "zona": None if m["lote"] else {"radio": 400 if compartido else 150, "compartido": compartido},
                     "alrededor": m["alrededor"]}
    ficha["cercanos"] = cercanos(*DONDE[ident], VIAJES)
    ficha["altura"] = altura(*DONDE[ident])
    FICHAS[ident] = ficha
    foto(FUENTE / p["fotos_locales"][orden[0]], PUB / "fotos" / f"p-{ident}.webp", 560, 62, (560, 420))
    if p.get("inconsistencias"):
        errores.append(f"- **{p['codigo']}** · {p['titulo'].strip()} — " + "; ".join(p["inconsistencias"]))

# El mapa general: los lotes simplificados y las celdas calzadas (los puntos ya están en indice.json)
mapa_general = {"calces": CALCES, "lotes": {i: [[round(x, 6), round(y, 6)] for x, y in simplificar(m["lote"])] for i, m in MAPAS.items() if m["lote"]}}

# Autochequeos de los datos de los mapas, antes de escribir nada. Cada uno mide algo por su lado: no repite la cuenta
# que armó el dato.
sin_catastro("mapa.json", mapa_general)
assert set(FORMAS) == {i for i, f in FICHAS.items() if f["mapa"]["lote"]} == set(mapa_general["lotes"]), "los terrenos con lote no son los de formas.json"
en_indice = Counter((x["lat"], x["lng"]) for x in indice)
for x in indice:
    i, f = x["id"], FICHAS[x["id"]]
    mapa = f["mapa"]
    sin_catastro(f"ficha {i}", f)
    assert f["altura"] and 400 <= f["altura"]["m"] <= 2200, f"{i}: altura {f['altura']}"
    assert f["cercanos"], f"{i}: sin a cuánto queda"
    # La celda, de nuevo desde el lote o el punto publicado, y su calce desde calces.json
    assert mapa["celda"] == celda_de(*(centro(mapa["lote"]) if mapa["lote"] else (x["lat"], x["lng"]))), f"{i}: celda {mapa['celda']}"
    assert mapa["calce"] == CALCES.get(mapa["celda"]), f"{i}: calce {mapa['calce']} en {mapa['celda']}"
    if mapa["calce"] is None:
        assert mapa["alrededor"] == [] and mapa["lote"] is None, f"{i}: sin calce pero con lote o trama"
    if mapa["lote"]:
        assert mapa["zona"] is None and len(mapa["lados"]) == len(FORMAS[i]["lados"]), f"{i}: los lados no son los de formas.json"
        for lado in mapa["lados"]:
            assert metros_al_borde(lado["lat"], lado["lng"], mapa["lote"]) < 0.5, f"{i}: el rótulo {lado['texto']} no cae sobre el borde del lote"
        assert not any(mismo_poligono(a, mapa["lote"]) for a in mapa["alrededor"]), f"{i}: el lote está repetido en la trama de alrededor"
        c = centro(mapa["lote"])
        assert not adentro(*c, mapa["lote"]) or not any(adentro(*c, a) for a in mapa["alrededor"]), f"{i}: una parcela de la trama tapa el lote"
    else:
        compartido = en_indice[(x["lat"], x["lng"])] - 1
        assert mapa["zona"] == {"radio": 400 if compartido else 150, "compartido": compartido}, f"{i}: zona {mapa['zona']}"

(PUB / "fichas").mkdir(parents=True, exist_ok=True)
for i, f in FICHAS.items():
    (PUB / "fichas" / f"{i}.json").write_text(json.dumps(f, ensure_ascii=False, separators=(",", ":")))
(PUB / "mapa.json").write_text(json.dumps(mapa_general, separators=(",", ":")))
SRC.mkdir(parents=True, exist_ok=True)
(SRC / "indice.json").write_text(json.dumps(indice, ensure_ascii=False, separators=(",", ":")))

urbanizaciones = []
for u in json.load(open(FUENTE / "urbanizaciones.json")):
    fotos = []
    for n, local in enumerate(u.get("fotos_locales") or [], 1):
        foto(FUENTE / local, PUB / "fotos" / f"u-{u['id']}-{n}.webp", 1200)
        fotos.append(f"fotos/u-{u['id']}-{n}.webp")
    urbanizaciones.append({
        "id": u["id"], "nombre": u["nombre"], "acceso": u.get("acceso_ubicacion") or "", "localidad": u.get("localidad") or "",
        "descripcion": u.get("descripcion") or "", "servicios": u.get("servicios") or [], "lat": u.get("lat"), "lng": u.get("lng"),
        "fotos": fotos, "propiedades": u.get("propiedades") or [], "adicionales": u.get("adicionales") or [],
    })

inst = json.load(open(FUENTE / "institucional.json"))
equipo = []
for persona in inst["nosotros"]["equipo"]:
    archivo = persona["foto"].rsplit("/", 1)[-1]
    clave = re.sub(r"[^a-z]", "", persona["nombre"].lower())
    foto(FUENTE / "fotos/sitio" / archivo, PUB / "fotos" / f"equipo-{clave}.webp", 480, 78)
    equipo.append({**{k: persona[k] for k in ("nombre", "cargo", "matricula", "whatsapp", "email")}, "foto": f"fotos/equipo-{clave}.webp"})

museo = []
for archivo in ("museoentera.jpg", "camisetasmuseo.jpg", "articulos.jpg", "fondomuseo.jpg", *[f"photo{n}.jpg" for n in range(1, 13)]):
    origen = FUENTE / "fotos/sitio" / archivo
    if origen.exists():
        destino = f"fotos/museo-{origen.stem}.webp"
        foto(origen, PUB / destino, 1200)
        museo.append(destino)
# La imagen que aparece al compartir el link (fotos/og.jpg) la arma castro_satelite.py: la foto satelital con los lotes
for archivo in ("fondonos.jpg", "imagcontact.jpg"):
    foto(FUENTE / "fotos/sitio" / archivo, PUB / "fotos" / f"{Path(archivo).stem}.webp", 1600)
for archivo in ("logo.png", "logofooter.png", "favicon.png"):
    destino = PUB / "fotos" / archivo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes((FUENTE / "fotos/sitio" / archivo).read_bytes())

sitio = {
    "urbanizaciones": urbanizaciones,
    "equipo": equipo,
    "museo": {"titulo": inst["museo"]["titulo"], "textos": inst["museo"]["textos"], "fotos": museo},
    "inicio": inst["inicio"],
    "nosotros": {k: inst["nosotros"][k] for k in ("titulo", "texto", "valores", "equipo_titulo")},
    "vender": inst["vender"],
    "pie": inst["pie"],
    "contacto": {k: inst[k] for k in ("direccion", "telefono", "whatsapp", "email", "redes", "corredor_y_matricula", "colegio", "oficina_lat", "oficina_lng", "razon_social", "cuit", "afip_data_fiscal")},
    # Su mapa ilustrado de Merlo con los 22 loteos, tal cual lo tienen en su portada (pines en % del ancho y del alto)
    "mapa": {"fondo": "fotos/mapa-merlo.webp", "pines": [{**pin, "img": f"fotos/pin-{i + 1:02d}.webp"} for i, pin in enumerate(PINES)]},
}
# Tres errores de tipeo de sus textos, corregidos: el resto va tal cual lo escribieron
_texto = json.dumps(sitio, ensure_ascii=False, indent=1)
for mal, bien in {"experiancia": "experiencia", "Tasa tu propiedad": "Tasá tu propiedad", "Envia documentación": "Enviá documentación"}.items():
    assert mal in _texto, mal
    _texto = _texto.replace(mal, bien)
(SRC / "sitio.json").write_text(_texto)

# El mapa ilustrado y sus pines
foto(FUENTE / "fotos/sitio/mapfondo.jpg", PUB / "fotos" / "mapa-merlo.webp", 1600, 70)
for i, pin in enumerate(PINES):
    destino = PUB / "fotos" / f"pin-{i + 1:02d}.webp"
    if not destino.exists():
        Image.open(FUENTE / "fotos/sitio/pines" / pin["img"].rsplit("/", 1)[-1]).convert("RGBA").resize((180, 180), Image.LANCZOS).save(destino, "WEBP", quality=85)

# Una página chica por propiedad, solo para que al compartir el link por WhatsApp se vea su foto, título y precio:
# GitHub Pages sirve archivos fijos y la ficha se arma en el navegador, que WhatsApp no ejecuta. Redirige a ?p=ID.
URL_BASE = "https://matitrova.github.io/paginas/propuestas/castro-inmobiliaria/"
for p in indice:
    ficha = FICHAS[p["id"]]
    precio_txt = (f"USD {p['precio']:,}" if p["moneda"] == "USD" else f"$ {p['precio']:,}").replace(",", ".") if p["precio"] else ""
    titulo = f"{p['titulo']}{' · ' + precio_txt if precio_txt else ''}"
    desc = " · ".join(x for x in [p["tipo"], p["zona"], p["localidad"], "Castro Inmobiliaria"] if x)
    esc = lambda s: s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
    carpeta = PUB / "p" / p["id"]
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / "index.html").write_text(f"""<!doctype html><html lang="es-AR"><head><meta charset="utf-8">
<meta name="robots" content="noindex, nofollow"><title>{esc(titulo)}</title>
<meta property="og:title" content="{esc(titulo)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(ficha['fotos'][0] if ficha['fotos'] else URL_BASE + 'fotos/og.jpg')}">
<meta property="og:url" content="{URL_BASE}p/{p['id']}/"><meta property="og:type" content="website">
<meta http-equiv="refresh" content="0; url=../../?p={p['id']}"></head>
<body><script>location.replace("../../?p={p['id']}")</script><a href="../../?p={p['id']}">{esc(p['titulo'])}</a></body></html>
""")


grupos = {}
for p in propiedades:
    grupos.setdefault((p["lat"], p["lng"]), []).append(p)
compartidos = []
for (lat, lng), ps in sorted(grupos.items(), key=lambda g: -len(g[1])):
    if len(ps) > 1:
        # "Barrio Los Troncos" y "Los Troncos", o "Country Club Chumamaya" y "Chumamaya", son el mismo lugar
        zonas = {clave_zona(zona_de(p["zona"])) for p in ps}
        distintas = any(a not in b and b not in a for a in zonas for b in zonas)
        compartidos.append(f"- **{lat}, {lng}** ({len(ps)}): " + "; ".join(f"**{p['codigo']}** {p['titulo'].strip()} ({zona_de(p['zona'])})" for p in ps)
                           + (" — **figuran en zonas distintas: conviene revisar cuál está bien ubicada**" if distintas else ""))

(FUENTE / "errores_de_carga.md").write_text(
    "# Lo que no cierra en los datos que publica Castro Inmobiliaria\n\n"
    "Sacado de su propio sitio el 25/10/2026. En la propuesta no se muestra ningún dato roto; esto es para pasárselo a Mauro.\n\n"
    + "\n".join(errores) + "\n\n"
    "## Propiedades que publican el mismo punto\n\n"
    "Varias propiedades con exactamente la misma ubicación: suele ser un punto del barrio y no el de cada propiedad. En la "
    "propuesta se muestran con una zona aproximada más grande que lo aclara.\n\n"
    + "\n".join(compartidos) + "\n"
)

# Ninguna ficha vieja de una propiedad que ya no está
assert {f.stem for f in (PUB / "fichas").glob("*.json")} == set(FICHAS), "hay fichas de más en public/"
fichas = FICHAS
pesos = sorted((f.stat().st_size, f.stem) for f in (PUB / "fichas").glob("*.json"))
alturas = [f["altura"]["m"] for f in fichas.values()]
print(f"fichas: promedio {sum(p for p, _ in pesos) / len(pesos) / 1024:.1f} KB, la más pesada {pesos[-1][0] / 1024:.1f} KB ({pesos[-1][1]});"
      f" mapa.json {(PUB / 'mapa.json').stat().st_size / 1024:.1f} KB")
print(sum(1 for f in fichas.values() if f["mapa"]["lote"]), "con lote;", sum(1 for f in fichas.values() if f["mapa"]["zona"]), "con zona;",
      sum(1 for f in fichas.values() if f["mapa"]["alrededor"]), "con trama;", sum(1 for f in fichas.values() if f["mapa"]["calce"] is None), "sin calce;",
      sum(n for n in PUNTOS.values() if n > 1), "comparten punto en", len(compartidos), "grupos; alturas de", min(alturas), "a", max(alturas), "m;",
      Counter(f["altura"]["pendiente"] for f in fichas.values()), ";", sum(1 for f in fichas.values() if f["cercanos"][0]["lugar"] == "Villa de Merlo"), "lejos de Merlo")
print(con_volante, "con volante (la portada es la primera foto de verdad);", len(indice), "propiedades,", len(urbanizaciones), "urbanizaciones,", len(equipo), "personas,", len(museo), "fotos del museo,", len(errores), "con errores de carga")
