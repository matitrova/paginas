"""Arma los datos de la propuesta de Castro Inmobiliaria desde lo que se sacó de su propio sitio.

Entrada: ~/castro-datos (propiedades.json, urbanizaciones.json, institucional.json y las fotos bajadas).
No va al repo: son 1,3 GB. Sale:
  propuestas/castro-inmobiliaria/src/datos/indice.json      lo que necesitan la portada y el listado
  propuestas/castro-inmobiliaria/src/datos/sitio.json       urbanizaciones, equipo, museo y contacto
  public/propuestas/castro-inmobiliaria/fichas/<id>.json    la ficha completa, se pide al abrirla
  public/propuestas/castro-inmobiliaria/fotos/p-<id>.webp   una foto chica por propiedad, recortada a 4:3
  public/propuestas/castro-inmobiliaria/fotos/*.webp         equipo, museo, urbanizaciones y el logo
  ~/castro-datos/errores_de_carga.md                         lo que no cierra en sus datos, para Mauro
Las galerías completas no se copian: se ven desde el servicio de fotos de ellos (static.tokkobroker.com).

Los datos van tal cual los publican, salvo dos cosas que se muestran mal en su sitio:
  - un 0 ("0.00M2", "0 años", 0 dormitorios) es un campo vacío, no un dato: queda en null;
  - en 12 propiedades la unidad dice "HA" pero el número está en m² ("Campo 570 Ha" figura 5700000.00HA):
    se toma como m². El catastro lo confirma en los terrenos que se pudieron comparar.

Uso:  ../Test1_Inmo/.venv/bin/python scripts/castro_datos.py [carpeta-de-datos]
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

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
    return f"{n} años" if n else None


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
_muestra = {x["id"]: x for x in propiedades if x["id"] in ("633017", "8147479")}
assert [es_volante(FUENTE / f) for f in _muestra["633017"]["fotos_locales"][:3]] == [True, True, False]
assert [es_volante(FUENTE / f) for f in _muestra["8147479"]["fotos_locales"][:2]] == [True, False]

indice, errores, con_volante = [], [], 0
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
        "zona": p["zona"] or "",
        "localidad": LOCALIDADES.get(p["localidad"], p["localidad"] or ""),
        "urbanizacion": [u["id"] for u in p.get("urbanizacion") or []],
        "precio": entero(p["precio_numero"]),
        "moneda": p["moneda"] or "",
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
    })
    ficha = {
        "id": ident,
        "descripcion": p.get("descripcion") or "",
        "adicionales": p.get("adicionales") or [],
        "servicios": p.get("servicios") or [],
        "fotos": [p["fotos"][i] for i in orden],
        "semicubierta": superficie(s.get("semicubierta")),
        "cochera": entero(p.get("cochera")),
        "plantas": entero(p.get("plantas")),
        "antiguedad": antiguedad(p.get("antiguedad")),
        "operaciones": p.get("operaciones") or [],
    }
    (PUB / "fichas").mkdir(parents=True, exist_ok=True)
    (PUB / "fichas" / f"{ident}.json").write_text(json.dumps(ficha, ensure_ascii=False, separators=(",", ":")))
    foto(FUENTE / p["fotos_locales"][orden[0]], PUB / "fotos" / f"p-{ident}.webp", 560, 62, (560, 420))
    if p.get("inconsistencias"):
        errores.append(f"- **{p['codigo']}** · {p['titulo'].strip()} — " + "; ".join(p["inconsistencias"]))

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
        "fotos": fotos, "propiedades": u.get("propiedades") or [],
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
for archivo in ("logo.png", "logofooter.png", "favicon.png"):
    destino = PUB / "fotos" / archivo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes((FUENTE / "fotos/sitio" / archivo).read_bytes())

sitio = {
    "urbanizaciones": urbanizaciones,
    "equipo": equipo,
    "museo": {"titulo": inst["museo"]["titulo"], "textos": inst["museo"]["textos"], "fotos": museo},
    "inicio": inst["inicio"],
    "nosotros": {k: inst["nosotros"][k] for k in ("titulo", "texto", "valores")},
    "vender": inst["vender"],
    "pie": inst["pie"],
    "contacto": {k: inst[k] for k in ("direccion", "telefono", "whatsapp", "email", "redes", "corredor_y_matricula", "colegio", "oficina_lat", "oficina_lng")},
}
(SRC / "sitio.json").write_text(json.dumps(sitio, ensure_ascii=False, indent=1))

(FUENTE / "errores_de_carga.md").write_text(
    "# Lo que no cierra en los datos que publica Castro Inmobiliaria\n\n"
    "Sacado de su propio sitio el 25/10/2026. En la propuesta no se muestra ningún dato roto; esto es para pasárselo a Mauro.\n\n"
    + "\n".join(errores) + "\n"
)
print(con_volante, "con volante (la portada es la primera foto de verdad);", len(indice), "propiedades,", len(urbanizaciones), "urbanizaciones,", len(equipo), "personas,", len(museo), "fotos del museo,", len(errores), "con errores de carga")
