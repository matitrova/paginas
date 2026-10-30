"""Arma los datos de la propuesta de Castro Inmobiliaria desde lo que se sacó de su propio sitio.

Entrada: ~/castro-datos (propiedades.json, urbanizaciones.json, institucional.json y las fotos bajadas).
No va al repo: son 1,3 GB. Sale:
  propuestas/castro-inmobiliaria/src/datos/indice.json      lo que necesitan la portada y el listado
  propuestas/castro-inmobiliaria/src/datos/sitio.json       urbanizaciones, equipo, museo y contacto
  public/propuestas/castro-inmobiliaria/fichas/<id>.json    la ficha completa, se pide al abrirla; con su mapa
                                                            (de ~/castro-datos/mapas.json, que arma castro_satelite.py)
  public/propuestas/castro-inmobiliaria/mapa.json           los lotes simplificados y los calces, para el mapa general
  public/propuestas/castro-inmobiliaria/fotos/p-<id>.webp   una foto chica por propiedad, recortada a 4:3
  public/propuestas/castro-inmobiliaria/fotos/*.webp         equipo, museo, urbanizaciones y el logo
  ~/castro-datos/errores_de_carga.md                         lo que no cierra en sus datos, para Mauro
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
from pathlib import Path

from PIL import Image, ImageOps

sys.dont_write_bytecode = True  # que importar castro_satelite no deje scripts/__pycache__ en el repo
from castro_satelite import EXCLUIR, adentro, celda_de, mundo  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "castro-datos")
SRC = RAIZ / "propuestas/castro-inmobiliaria/src/datos"
PUB = RAIZ / "public/propuestas/castro-inmobiliaria"

# Grafías distintas de un mismo lugar en sus títulos; solo para agrupar en los filtros
LOCALIDADES = {"Carpinteria": "Carpintería", "Merlo": "Villa de Merlo", "Santa Rosa de Conlara": "Santa Rosa del Conlara", "Junin": "Junín"}
# Errores de tipeo de sus textos, corregidos en todo lo que se publica (sitio.json, títulos, zonas y descripciones): el
# resto va tal cual lo escribieron. En una sola línea: scripts/verificar.py lee este diccionario con una expresión regular
ERRATAS = {"experiancia": "experiencia", "Tasa tu propiedad": "Tasá tu propiedad", "Envia documentación": "Enviá documentación", "Cincurvanlación": "Circunvalación", "Libertar": "Libertador", "conoce el valor": "conocé el valor", "a lo que buscas": "a lo que buscás", "única!.": "única!", "Guillermo—su": "Guillermo —su", "Más de 20 Urbanizaciones": "Más de 20 urbanizaciones", "Martin| centro": "Martin | Centro", "Av. Del Libertador San Martin": "Av. del Libertador San Martín", "Déjanos": "Dejanos", "Eloisa": "Eloísa", "ELOISA": "ELOÍSA", "Fermin Romero": "Fermín Romero", "Don Fermin": "Don Fermín", "Carpinteria": "Carpintería"}


def corregir(texto):
    for mal, bien in ERRATAS.items():
        texto = texto.replace(mal, bien)
    return texto


def titulo_prolijo(titulo):
    """Sus títulos, emprolijados sin cambiar lo que dicen: "Casa en Venta" -> "en venta", el guion siempre con un
    espacio a cada lado y sin punto final."""
    t = re.sub(r"\s+-\s*|\s*-\s+", " - ", corregir(titulo).strip())
    t = re.sub(r"\ben (Venta|Alquiler)\b", lambda m: "en " + m.group(1).lower(), t)
    return re.sub(r"\s{2,}", " ", t).rstrip(". ")


assert titulo_prolijo("Casa en Venta- Barrio Los Olmos.") == "Casa en venta - Barrio Los Olmos"
assert titulo_prolijo("Casa en venta -  Carpinteria") == "Casa en venta - Carpintería" and titulo_prolijo("Semi-cubierta") == "Semi-cubierta"


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


# Variantes que el agrupado solo no junta (escritas distinto, no solo con otra mayúscula). Solo el mismo lugar escrito de
# otra forma: "Piedra Blanca Arriba" o "Pantanillo este" no son "Piedra Blanca" ni "El Pantanillo"
ALIAS_ZONA = {"rincon de este": "rincon del este", "santa rosa de conlara": "santa rosa del conlara",
              "ruta n 5": "ruta n5", "ruta 5": "ruta n5", "pantanillo": "el pantanillo", "barrio los troncos": "los troncos",
              # "Centro, Villa de Merlo" sin la coma; y la errata del galpón, que en su descripción está "ubicado en el Polo
              # Logístico", el mismo que la urbanización ("Ubicado en Urbanización Polo Logístico", dice el aviso de sus lotes)
              "centro villa de merlo": "centro", "polo logistco": "polo logistico productivo merlo"}
# Pueden ser el mismo lugar, pero lo publicado no alcanza para asegurarlo: no se juntan, van a errores_de_carga.md para Mauro
A_CONFIRMAR = [("Ruta 1", "Ruta Provincial 1"), ("Chumamaya", "Country Club Chumamaya"), ("Las Cascadas", "Country Las Cascadas", "Las Cascadas Golf"),
               ("Santa Rosa", "Santa Rosa del Conlara"), ("Solares", "Solares del Valle")]

def metros_entre(lat1, lng1, lat2, lng2):
    return math.hypot((lng2 - lng1) * 111320 * math.cos(math.radians(lat1)), (lat2 - lat1) * 110540)


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
# Entre grafías igual de usadas: la que coincide con el nombre de una urbanización (como la escribe nombreLindo de
# Ficha.tsx), la de más palabras con mayúscula ("Piedra Blanca Abajo", no "Piedra blanca Abajo"), la que ya estaba
# publicada en indice.json (un link con esa zona en el filtro sigue andando: el listado la compara tal cual) y después g,
# para no depender del orden del set
_publicadas = {x["zona"] for x in json.load(open(SRC / "indice.json"))} if (SRC / "indice.json").exists() else set()
_lindo = lambda n: " ".join(w if i and w in ("de", "la", "las", "los", "del", "y") else w[:1].upper() + w[1:] for i, w in enumerate(n.lower().split()))
_urbanizaciones = {_lindo(u["nombre"]) for u in json.load(open(FUENTE / "urbanizaciones.json"))}
_mayusculas = lambda g: sum(w[:1].isupper() for w in g.split())
ZONA = {z: max(set(v), key=lambda g: (v.count(g), g in _urbanizaciones, g != g.lower(), "del" in g, _mayusculas(g), g in _publicadas, g))
        for z, v in _grafias.items()}
zona_de = lambda z: ZONA[ALIAS_ZONA.get(clave_zona(z), clave_zona(z))]
assert zona_de("Rincón Del Este") == zona_de("Rincón de Este") == "Rincón del Este"
assert zona_de("Ruta 5") == zona_de("Ruta Nº 5") == zona_de("Ruta N°5") == "Ruta N°5" and zona_de("Pantanillo") == "El Pantanillo"
assert zona_de("Barrio Los Troncos") == "Los Troncos" and zona_de("Pantanillo este") != zona_de("Pantanillo")
assert zona_de("Centro Villa de Merlo") == "Centro" and zona_de("Polo Logístco") == "Polo Logístico Productivo Merlo"
assert zona_de("Piedra blanca Abajo") == "Piedra Blanca Abajo" and zona_de("Estancia el Carril") == "Estancia El Carril"
assert zona_de("Jardines de La Plaza") == "Jardines de la Plaza", "en un empate gana el nombre de la urbanización"
assert all(len({zona_de(z) for z in g}) == len(g) and all(z in ZONA.values() for z in g) for g in A_CONFIRMAR), "A_CONFIRMAR desactualizado"
assert antiguedad("1 años") == "1 año" and antiguedad("7 años") == "7 años"
# La forma real de los terrenos (formas.json), el mapa que se mueve de cada ficha (mapas.json) y las celdas calzadas
# (calces.json) los arma castro_satelite.py
for _falta in ("formas.json", "mapas.json", "calces.json"):
    if not (FUENTE / _falta).exists():
        raise SystemExit(f"falta {FUENTE / _falta}: corré antes scripts/castro_satelite.py")
FORMAS = json.load(open(FUENTE / "formas.json"))
assert all(i not in FORMAS for i in EXCLUIR), "un terreno de EXCLUIR quedó con forma: corré castro_satelite.py"
MAPAS = json.load(open(FUENTE / "mapas.json"))
CALCES = json.load(open(FUENTE / "calces.json"))
# Cuántas propiedades publican exactamente el mismo punto (suele ser el del barrio, no el de la propiedad)
PUNTOS = Counter((p["lat"], p["lng"]) for p in propiedades)
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
        "titulo": titulo_prolijo(p["titulo"]),
        "operacion": p["operacion"].split("/"),
        "tipo": p["tipo"],
        "zona": corregir(zona_de(p["zona"])),
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
        # La silueta va solo en terrenos y campos: es la tarjeta con el lote y lo que cuenta "N terrenos con su forma real"
        "mini": FORMAS.get(ident, {}).get("mini") if p["tipo"] in ("Terreno", "Campo") else None,
        "etiquetas": etiquetas(p),
    })
    ficha = {
        "id": ident,
        "descripcion": corregir(p.get("descripcion") or ""),
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
                     "zona": None if m["lote"] else {"compartido": compartido},
                     "alrededor": m["alrededor"]}
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
        assert mapa["zona"] == {"compartido": compartido}, f"{i}: zona {mapa['zona']}"

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
for archivo in ("fondonos.jpg", "imagcontact.jpg"):
    foto(FUENTE / "fotos/sitio" / archivo, PUB / "fotos" / f"{Path(archivo).stem}.webp", 1600)
# Arriba de la portada, su foto aérea de Merlo con las sierras (images/fondocontacto.jpg de su sitio), en dos tamaños;
# y la imagen que aparece al compartir el link, recortada de la misma foto
for ancho in (800, 1600):
    foto(FUENTE / "fotos/sitio/fondocontacto.jpg", PUB / "fotos" / f"portada-merlo-{ancho}.webp", ancho, 70)
ImageOps.fit(Image.open(FUENTE / "fotos/sitio/fondocontacto.jpg").convert("RGB"), (1200, 630), Image.LANCZOS).save(PUB / "fotos/og.jpg", "JPEG", quality=82, optimize=True)
# Su mapa dibujado y sus pines. Arriba trae una franja gris con "Urbanizaciones que comercializamos", que repetía el
# título de la sección: se recorta, y la altura de cada pin (en % del alto) se recalcula sobre la imagen recortada
FRANJA = 160
_mapa = Image.open(FUENTE / "fotos/sitio/mapfondo.jpg").convert("RGB")
_mapa_alto = _mapa.height
_mapa = _mapa.crop((0, FRANJA, _mapa.width, _mapa.height))
assert min(_mapa.getpixel((20, 0))) > 190, "la franja gris del título sigue arriba del mapa"
_mapa.resize((1600, round(1600 * _mapa.height / _mapa.width)), Image.LANCZOS).save(PUB / "fotos" / "mapa-merlo.webp", "WEBP", quality=70)
PINES = [{**pin, "top": round((pin["top"] * _mapa_alto / 100 - FRANJA) / (_mapa_alto - FRANJA) * 100, 2)} for pin in PINES]
for i, pin in enumerate(PINES):
    destino = PUB / "fotos" / f"pin-{i + 1:02d}.webp"
    if not destino.exists():
        Image.open(FUENTE / "fotos/sitio/pines" / pin["img"].rsplit("/", 1)[-1]).convert("RGBA").resize((180, 180), Image.LANCZOS).save(destino, "WEBP", quality=85)
for archivo in ("logo.png", "logofooter.png", "favicon.png"):
    destino = PUB / "fotos" / archivo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes((FUENTE / "fotos/sitio" / archivo).read_bytes())

sitio = {
    "urbanizaciones": urbanizaciones,
    "equipo": equipo,
    "museo": {"titulo": inst["museo"]["titulo"], "textos": inst["museo"]["textos"], "fotos": museo},
    "inicio": inst["inicio"],
    "nosotros": {k: inst["nosotros"][k] for k in ("titulo", "texto", "mision", "vision", "valores", "equipo_titulo")},
    "vender": inst["vender"],
    "pie": inst["pie"],
    # El formulario de contacto con su título y sus motivos
    "formulario": {"titulo": inst["contacto"]["titulo_formulario"], "motivos": inst["contacto"]["motivos"]},
    "contacto": {k: inst[k] for k in ("direccion", "telefono", "whatsapp", "email", "redes", "corredor_y_matricula", "colegio", "oficina_lat", "oficina_lng", "razon_social", "cuit", "afip_data_fiscal")},
    # Su mapa dibujado de Merlo con los 22 loteos, tal cual lo tienen en su portada (pines en % del ancho y del alto)
    "mapa": {"fondo": "fotos/mapa-merlo.webp", "pines": [{**pin, "img": f"fotos/pin-{i + 1:02d}.webp"} for i, pin in enumerate(PINES)]},
}
# Errores de tipeo de sus textos (ERRATAS, arriba), corregidos
_texto = json.dumps(sitio, ensure_ascii=False, indent=1)
# En orden, como corregir(): alguna aparece recién después de otra ("Libertar" -> "Av. Del Libertador San Martin")
for mal, bien in ERRATAS.items():
    assert mal in _texto, mal
    _texto = _texto.replace(mal, bien)
(SRC / "sitio.json").write_text(_texto)

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
    "propuesta se muestran con un marcador en ese punto y el aviso de que es aproximado.\n\n"
    + "\n".join(compartidos) + "\n\n"
    "## Terrenos que no se dibujan\n\n"
    "El catastro tiene una parcela que coincide, pero el aviso no deja asegurar que sea esa. En la propuesta van con la zona "
    "aproximada, sin forma.\n\n"
    + "\n".join(f"- **{p['codigo']}** · {p['titulo'].strip()} — {EXCLUIR[p['id']]}" for p in propiedades if p["id"] in EXCLUIR) + "\n\n"
    "## Zonas escritas de varias formas\n\n"
    "En los títulos, el mismo lugar figura escrito de distintas maneras. En la propuesta se agrupan con la forma más usada.\n\n"
    + "\n".join(f"- **{ZONA[k]}**: " + ", ".join(f"«{g}» ({v.count(g)})" for g in sorted(set(v), key=lambda g: (-v.count(g), g)))
                for k, v in sorted(_grafias.items(), key=lambda x: ZONA[x[0]]) if len(set(v)) > 1) + "\n\n"
    "## Zonas que pueden ser el mismo lugar, a confirmar\n\n"
    "Parecen el mismo lugar, pero con lo publicado no se puede asegurar. En la propuesta van separadas; si son el mismo, se "
    "juntan.\n\n"
    + "\n".join("- " + " / ".join(f"«{z}» ({sum(zona_de(p['zona']) == z for p in propiedades)})" for z in g) for g in A_CONFIRMAR) + "\n"
)

# Ninguna ficha vieja de una propiedad que ya no está
assert {f.stem for f in (PUB / "fichas").glob("*.json")} == set(FICHAS), "hay fichas de más en public/"
fichas = FICHAS
pesos = sorted((f.stat().st_size, f.stem) for f in (PUB / "fichas").glob("*.json"))
print(f"fichas: promedio {sum(p for p, _ in pesos) / len(pesos) / 1024:.1f} KB, la más pesada {pesos[-1][0] / 1024:.1f} KB ({pesos[-1][1]});"
      f" mapa.json {(PUB / 'mapa.json').stat().st_size / 1024:.1f} KB")
print(sum(1 for f in fichas.values() if f["mapa"]["lote"]), "con lote;", sum(1 for f in fichas.values() if f["mapa"]["zona"]), "con zona;",
      sum(1 for f in fichas.values() if f["mapa"]["alrededor"]), "con trama;", sum(1 for f in fichas.values() if f["mapa"]["calce"] is None), "sin calce;",
      sum(n for n in PUNTOS.values() if n > 1), "comparten punto en", len(compartidos), "grupos")
print(con_volante, "con volante (la portada es la primera foto de verdad);", len(indice), "propiedades,", len(urbanizaciones), "urbanizaciones,", len(equipo), "personas,", len(museo), "fotos del museo,", len(errores), "con errores de carga")

# La vista previa del link (og:description de la propuesta) dice cuántos terrenos tienen su forma: sale de los datos
_html = RAIZ / "propuestas/castro-inmobiliaria/index.html"
_n = sum(1 for x in indice if x["mini"])
_nuevo = re.sub(r"\d+ terrenos con su forma real", f"{_n} terrenos con su forma real", _html.read_text())
assert f"{_n} terrenos con su forma real" in _nuevo, "la vista previa del link no dice cuántos terrenos tienen forma"
_html.write_text(_nuevo)
