"""Genera las fotos de cada página de muestra en public/<página>/fotos/ a partir de fotos-fuente/.

Las fuentes (Unsplash y Wikimedia Commons, ver FOTOS.md) no se suben al repo. Acá se achican y se
pasan a WebP sin metadatos.

Uso:  ../Test1_Inmo/.venv/bin/python scripts/fotos.py
"""
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent

# página -> { nombre de salida: (archivo fuente sin .jpg, ancho máximo) }
# La fuente se busca en fotos-fuente/<página>/; si lleva "/", desde fotos-fuente/.
FOTOS = {
    "cabanas": {
        "portada": ("sierra-cabanas", 1920),
        "valle": ("sierra-valle", 1600),
        "cumbre": ("sierra-cumbre", 1600),
        "tala": ("living-1", 1400),
        "molle": ("living-2", 1400),
        "chanar": ("living-4", 1400),
        "dormitorio": ("dormitorio-1", 1000),
        "pileta": ("pileta-1", 1920),
        "desayuno": ("desayuno-1", 1000),
        "cafe": ("desayuno-2", 1000),
        "picada": ("picada", 1000),
        "hamaca": ("hamaca-1", 1000),
        "asado": ("asado-2", 1000),
        "hogar": ("hogar-1", 1000),
    },
    "casa-tala": {
        "dia": ("cafe-1", 1920),
        "noche": ("bar-3", 1920),
        "cafe": ("latte-1", 1000),
        "desayuno": ("medialuna-1", 1000),
        "almuerzo": ("brunch-1", 1000),
        "tragos": ("trago-3", 1000),
        "cervezas": ("cerveza-1", 1000),
        "picar": ("picada-1", 1000),
        "platos": ("pasta-1", 1000),
        "lugar-1": ("cafe-2", 1100),
        "lugar-2": ("barista", 1100),
        "lugar-3": ("terraza-1", 1100),
        "lugar-4": ("bar-2", 1100),
        "lugar-5": ("medialuna-2", 1100),
        "lugar-6": ("cerveza-2", 1100),
    },
    # Propuestas para comercios reales: fotos y cuadros de video de sus propias publicaciones de Instagram
    "propuestas/mirador-de-los-condores": {
        "portada": ("condores-cuadros/ig-00-0", 1200),
        "tirolesa": ("condores-cuadros/ig-04-2", 1100),
        "balcones": ("condores-cuadros/ig-05-0", 1100),
        "puentes": ("condores-cuadros/ig-03-3", 1100),
        "escalada": ("condores-cuadros/ig-04-3", 1100),
        "g-brazos": ("condores/ig-05", 1100),
        "g-puente": ("condores-cuadros/ig-01-1", 900),
        "g-nubes": ("condores-cuadros/ig-02-0", 900),
        "g-valle": ("condores-cuadros/ig-03-2", 900),
        "g-arnes": ("condores-cuadros/ig-06-3", 900),
        "g-mar": ("condores-cuadros/ig-01-3", 900),
        "g-cima": ("condores-cuadros/ig-07-3", 900),
        "camino": ("condores-cuadros/ig-07-0", 1100),
        "base": ("condores-cuadros/ig-07-4", 1100),
    },
    # Solo comida, lugares y paisajes: nada de primeros planos de clientes ni de empleados.
    # El tercer valor recorta (izquierda, arriba, derecha, abajo, en fracciones) para dejar afuera
    # los textos y logos que traen las piezas de Instagram.
    "propuestas/cabeza-del-indio": {
        "portada": ("indio/ig-02", 1200, (0, 0, 1, 0.8)),
        "sendero": ("indio-cuadros/ig-05-0", 1100, (0, 0, 1, 0.72)),
        "picada": ("indio-cuadros/ig-04-2", 1100),
        "te": ("indio-cuadros/ig-02-3", 1100),
        "higos": ("indio-cuadros/ig-01-2", 1100),
        "refugio": ("indio/ig-05", 1100, (0, 0.585, 1, 0.9)),
        "tirolesa": ("indio-cuadros/ig-03-1", 1100),
        "hamaca": ("indio-cuadros/ig-04-1", 900),
        "bosque": ("indio-cuadros/ig-04-0", 900),
        "camino": ("indio-cuadros/ig-00-0", 1100, (0, 0, 1, 0.78)),
        "bandera": ("indio-cuadros/ig-00-4", 900, (0, 0, 1, 0.8)),
        "carpintero": ("indio-cuadros/ig-00-3", 900, (0, 0, 1, 0.8)),
        "pileton": ("indio-cuadros/ig-05-2", 900, (0.22, 0.05, 1, 0.8)),
        "ventana": ("indio/ig-00", 1080, (0, 0.44, 1, 0.88)),
    },
    "propuestas/hosteria-vegetariana": {
        "portada": ("hosteria/ig-01", 1300),
        "frutas": ("hosteria/ig-00", 1100),
        "flores": ("hosteria/ig-05", 1200),
        "plato": ("hosteria-cuadros/ig-00-3", 1100),
        "sala": ("hosteria-cuadros/ig-00-2", 1100, (0, 0, 1, 0.42)),
        "terraza": ("hosteria-cuadros/ig-03-2", 1100, (0, 0.13, 1, 0.58)),
        "arroyo": ("hosteria-cuadros/ig-03-3", 1100, (0, 0, 1, 0.68)),
        "edificio": ("hosteria/ig-02", 1100, (0, 0.12, 1, 0.92)),
        "galeria": ("hosteria/ig-06", 1100, (0, 0.37, 1, 0.73)),
        "mural": ("hosteria/ig-04", 1100, (0, 0.08, 1, 0.72)),
        "ronda": ("hosteria-cuadros/ig-01-0", 1100, (0, 0.49, 1, 1)),
        "cuencos": ("hosteria-cuadros/ig-04-3", 1000, (0, 0.5, 1, 1)),
    },
}


def main() -> None:
    for pagina, fotos in FOTOS.items():
        destino = RAIZ / "public" / pagina / "fotos"
        destino.mkdir(parents=True, exist_ok=True)
        for nombre, (fuente, ancho, *recorte) in fotos.items():
            origen = RAIZ / "fotos-fuente" / (f"{fuente}.jpg" if "/" in fuente else f"{pagina}/{fuente}.jpg")
            im = ImageOps.exif_transpose(Image.open(origen)).convert("RGB")
            if recorte:
                izq, arr, der, aba = recorte[0]
                im = im.crop((int(izq * im.width), int(arr * im.height), int(der * im.width), int(aba * im.height)))
            im.thumbnail((ancho, ancho * 3))
            im.save(destino / f"{nombre}.webp", "WEBP", quality=76, method=6)
        # La vista previa al compartir el link sale de la primera foto de la lista
        ImageOps.fit(Image.open(destino / f"{next(iter(fotos))}.webp"), (1200, 630)).save(RAIZ / "public" / pagina / "og.jpg", "JPEG", quality=82)
        print(pagina, len(fotos), "fotos")


if __name__ == "__main__":
    main()
