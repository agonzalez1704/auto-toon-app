"""
The app's icon, splash and Android icons, drawn from the mark: the pixel butterfly (the web's
app/icon.svg) in the «dos calmos, uno fuerte» palette — red field, a white wing, a lime wing,
an ink body. Run from the repo root:  python3 scripts/iconos.py
"""
from PIL import Image, ImageDraw

ROJO, BLANCO, BLANCO_IN = (228, 38, 0), (253, 253, 255), (232, 232, 234)
LIMA, LIMA_IN, TINTA = (212, 255, 61), (186, 228, 40), (10, 10, 10)
SS = 4  # supersampling, for the body's round ends

# The mark on its 80×64 grid (app/icon.svg); its pixels span x 10–70, y 12–52.
ALA_IZQ = [((10, 12, 14, 14), BLANCO), ((24, 20, 10, 10), BLANCO_IN), ((10, 38, 14, 14), BLANCO), ((24, 34, 10, 10), BLANCO_IN)]
ALA_DER = [((56, 12, 14, 14), LIMA), ((46, 20, 10, 10), LIMA_IN), ((56, 38, 14, 14), LIMA), ((46, 34, 10, 10), LIMA_IN)]
CUERPO = (36, 18, 8, 32)


def lienzo(fondo):
    # Plain red: the landing's grid fights the mark's own squares at icon size.
    return Image.new('RGBA', (1024 * SS, 1024 * SS), fondo)


def marca(im, ancho, mono=None):
    """Draws the mark centred, `ancho` px wide (of 1024); `mono` paints every part one colour."""
    k = ancho * SS / 60
    ox, oy = 512 * SS - 40 * k, 512 * SS - 32 * k
    d = ImageDraw.Draw(im)
    for (x, y, w, h), c in ALA_IZQ + ALA_DER:
        d.rectangle((ox + x * k, oy + y * k, ox + (x + w) * k - 1, oy + (y + h) * k - 1), fill=mono or c)
    x, y, w, h = CUERPO
    d.rounded_rectangle((ox + x * k, oy + y * k, ox + (x + w) * k, oy + (y + h) * k), radius=3 * k, fill=mono or TINTA)
    return im


def guardar(im, ruta, lado=1024, modo='RGBA'):
    im.resize((lado, lado), Image.LANCZOS).convert(modo).save(ruta, optimize=True)
    print(ruta)


A = 'assets/images/'
guardar(marca(lienzo(ROJO), 668), A + 'icon.png', modo='RGB')          # iOS: no alpha
guardar(marca(lienzo((0, 0, 0, 0)), 428), A + 'splash-icon.png')                       # on app.json's red
guardar(marca(lienzo((0, 0, 0, 0)), 506), A + 'android-icon-foreground.png')           # inside the 66 % safe zone
guardar(lienzo(ROJO), A + 'android-icon-background.png', modo='RGB')
guardar(marca(lienzo((0, 0, 0, 0)), 506, mono=(255, 255, 255)), A + 'android-icon-monochrome.png', modo='LA')
guardar(marca(lienzo(ROJO), 760), A + 'favicon.png', lado=48, modo='RGB')
