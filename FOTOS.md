# De dónde salen las fotos

Las páginas de muestra usan fotos libres. Las fuentes no se suben al repo (`fotos-fuente/`);
`scripts/fotos.py` genera las versiones web en `public/<página>/fotos/`.

## Cabañas Cielo de Piedra

### Wikimedia Commons (CC BY-SA 4.0: hay que nombrar al autor, está en el pie de la página)

| Archivo | Autor | Original |
|---|---|---|
| sierra-cabanas (portada) | daniel scaramella | https://commons.wikimedia.org/wiki/File:Las_Sierras_de_Comechingones.jpg |
| sierra-valle | daniel scaramella | https://commons.wikimedia.org/wiki/File:Valle_de_merlo.JPG |
| sierra-cumbre | daniel scaramella | https://commons.wikimedia.org/wiki/File:Merlo_valleys.JPG |
| sierra-conlara (sin usar) | daniel scaramella | https://commons.wikimedia.org/wiki/File:Valle_de_Conlara.jpg |

### Unsplash (licencia Unsplash: uso libre, sin atribución obligatoria)

| Archivo | Autor | Original |
|---|---|---|
| living-1 | Hans | https://unsplash.com/photos/bQTVoJHrkO0 |
| living-2 | Clay Banks | https://unsplash.com/photos/f_6yPIgDxxs |
| living-3 | Hans | https://unsplash.com/photos/_k0Pyd1uMEc |
| living-4 | Hans | https://unsplash.com/photos/uX8wVtW5PQo |
| dormitorio-1 | Clay Banks | https://unsplash.com/photos/rP0OTFdVaak |
| dormitorio-2 | Clay Banks | https://unsplash.com/photos/w9wV2Hwz9sI |
| dormitorio-3 | Clay Banks | https://unsplash.com/photos/eNJUZM12TlY |
| pileta-1 | Karsten Winegeart | https://unsplash.com/photos/86NRAa4ceTM |
| pileta-2 | Virginia Marinova | https://unsplash.com/photos/9nTQGA2RPQo |
| desayuno-1 | Randy Fath | https://unsplash.com/photos/j_bIj51nW8Y |
| desayuno-2 | Ahmet Yüksek | https://unsplash.com/photos/W8JZUCWvHXw |
| picada | Uldis Laganovskis | https://unsplash.com/photos/1anNU6Xr-y0 |
| hamaca-1 | Rachel Cromer | https://unsplash.com/photos/rumqorJo2kA |
| hamaca-2 | Steph Quernemoen | https://unsplash.com/photos/s8ebg13PGIM |
| asado-1 | DEBY RODRIGUEZ | https://unsplash.com/photos/B6kciNEJgN8 |
| asado-2 | Ezequiel Garrido | https://unsplash.com/photos/k9DoE3aRPdw |
| hogar-1 | Clay Banks | https://unsplash.com/photos/-_Rvjx9D7QY |

## Casa Tala

### Unsplash (licencia Unsplash: uso libre, sin atribución obligatoria)

| Archivo | Autor | Original |
|---|---|---|
| cafe-1 | Gavin CC | https://unsplash.com/photos/0XIN93NFcN8 |
| cafe-2 | Tim Raderschad | https://unsplash.com/photos/IKvl3PLi8pQ |
| cafe-3 | Phước Sang | https://unsplash.com/photos/F_tgnJBIArw |
| latte-1 | Lex Sirikiat | https://unsplash.com/photos/1tEkissU8dY |
| latte-2 | Nathan Dumlao | https://unsplash.com/photos/gOn7dKcCWKg |
| brunch-1 | Eiliv Aceron | https://unsplash.com/photos/uAm1CZMdPCw |
| brunch-2 | Flipboard | https://unsplash.com/photos/hpZPl3cGOpE |
| medialuna-1 | Kyle Hinkson | https://unsplash.com/photos/8aSR_-CHjPo |
| medialuna-2 | Ngo Ngoc Khai Huyen | https://unsplash.com/photos/ikCfEh8ZR94 |
| barista | Brooke Cagle | https://unsplash.com/photos/X4RJG4aNi8o |
| bar-1 | Alexander Korte | https://unsplash.com/photos/Ue-34H7an9o |
| bar-2 | atelierbyvineeth | https://unsplash.com/photos/ghUtZC-Ezxs |
| bar-3 | Shawn DENG | https://unsplash.com/photos/nsgzQHsxbXE |
| trago-1 | Milan Trninic | https://unsplash.com/photos/7c3kfbsQqFY |
| trago-2 | Milan Trninic | https://unsplash.com/photos/R31OwFKbRdE |
| trago-3 | Nuff | https://unsplash.com/photos/_JKy0LtToQc |
| cerveza-1 | Jon Parry | https://unsplash.com/photos/C8eSYwQkwHw |
| cerveza-2 | Amie Johnson | https://unsplash.com/photos/VJXLzQi5TlE |
| picada-1 | Theme Photos | https://unsplash.com/photos/qSoh9dju8rg |
| picada-2 | Anto Meneghini | https://unsplash.com/photos/XM6hy5te24U |
| pasta-1 | engin akyurt | https://unsplash.com/photos/-t76lOh80xY |
| pasta-2 | novila misastra | https://unsplash.com/photos/bavp8l4-GBE |
| terraza-1 | avansear | https://unsplash.com/photos/IoGqOxDrCvg |
| terraza-2 | MARIOLA GROBELSKA | https://unsplash.com/photos/3Vhq_qfI9q8 |

## Propuestas para comercios reales (`propuestas/`)

Las fotos y los datos salen de lo que cada negocio publicó en su Instagram. No son de uso libre:
se usan solo para mostrarle al dueño cómo quedaría su página. Cada propuesta lleva el cartel fijo
"Propuesta de diseño · No es la página oficial" y `noindex`. **Si el negocio dice que no, se borran
la carpeta de `propuestas/` y la de `public/propuestas/`.**

Se bajan con `scripts/fotos_instagram.py` (a `fotos-fuente/`, que no se sube) y se recortan en
`scripts/fotos.py` para sacar los textos que traen encima. No se usan primeros planos de personas.

| Propuesta | Fuente |
|---|---|
| mirador-de-los-condores | https://www.instagram.com/miradordeloscondores/ |
| cabeza-del-indio | https://www.instagram.com/cabeza_del_indio/ y https://www.instagram.com/laberinto_tematico/ |
| hosteria-vegetariana | https://www.instagram.com/hosteriavegetariana/ |
