"""Genera las fotos de cada página de muestra en public/<página>/fotos/ a partir de fotos-fuente/.

Las fuentes (Unsplash y Wikimedia Commons, ver FOTOS.md) no se suben al repo. Acá se achican y se
pasan a WebP sin metadatos.

Uso:  ../Test1_Inmo/.venv/bin/python scripts/fotos.py
"""
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent

# página -> { nombre de salida: (archivo fuente sin .jpg, ancho máximo) }
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
}


def main() -> None:
    for pagina, fotos in FOTOS.items():
        destino = RAIZ / "public" / pagina / "fotos"
        destino.mkdir(parents=True, exist_ok=True)
        for nombre, (fuente, ancho) in fotos.items():
            im = ImageOps.exif_transpose(Image.open(RAIZ / "fotos-fuente" / pagina / f"{fuente}.jpg")).convert("RGB")
            im.thumbnail((ancho, ancho * 3))
            im.save(destino / f"{nombre}.webp", "WEBP", quality=76, method=6)
        # La vista previa al compartir el link sale de la primera foto de la lista
        ImageOps.fit(Image.open(destino / f"{next(iter(fotos))}.webp"), (1200, 630)).save(RAIZ / "public" / pagina / "og.jpg", "JPEG", quality=82)
        print(pagina, len(fotos), "fotos")


if __name__ == "__main__":
    main()
