"""Draws the app icons (PIL).  python3 tools/make_icons.py"""
from PIL import Image, ImageDraw, ImageFilter
import math

def icon(size, maskable=False):
    S = 1024
    img = Image.new("RGB", (S, S), (26, 15, 6))
    d = ImageDraw.Draw(img)
    for i in range(S // 2, 0, -8):                                   # warm radial glow
        t = i / (S / 2)
        c = (int(26 + (1 - t) * 70), int(15 + (1 - t) * 34), int(6 + (1 - t) * 8))
        d.ellipse([S / 2 - i, S / 2 - i, S / 2 + i, S / 2 + i], fill=c)
    pad = 0.12 if maskable else 0.0                                   # keep content in the safe zone for maskable
    k = 1 - pad * 2
    def P(x, y): return (S / 2 + (x - 0.5) * S * k, S / 2 + (y - 0.5) * S * k)
    d.ellipse([*P(0.12, 0.12), *P(0.88, 0.88)], outline=(216, 178, 90), width=int(22 * k))      # gold ring
    
    # sword (diagonal)
    ang = math.radians(-45)
    def rot(x, y):
        return P(0.5 + x * math.cos(ang) - y * math.sin(ang), 0.5 + x * math.sin(ang) + y * math.cos(ang))
    blade = [rot(-0.035, 0.30), rot(0.035, 0.30), rot(0.035, -0.28), rot(0, -0.34), rot(-0.035, -0.28)]
    d.polygon(blade, fill=(226, 232, 240))
    d.polygon([rot(-0.008, 0.28), rot(0.008, 0.28), rot(0.008, -0.26), rot(-0.008, -0.26)], fill=(150, 162, 178))
    d.polygon([rot(-0.12, 0.30), rot(0.12, 0.30), rot(0.12, 0.34), rot(-0.12, 0.34)], fill=(240, 192, 64))
    d.polygon([rot(-0.025, 0.34), rot(0.025, 0.34), rot(0.025, 0.46), rot(-0.025, 0.46)], fill=(110, 70, 36))
    cx, cy = rot(0, 0.49); r = 0.04 * S * k; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(240, 192, 64))
    # lightning bolt
    bolt = [(0.60, 0.16), (0.40, 0.50), (0.52, 0.50), (0.40, 0.84), (0.72, 0.42), (0.58, 0.42), (0.70, 0.16)]
    glow = Image.new("RGB", (S, S), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.polygon([P(*p) for p in bolt], fill=(90, 200, 255))
    glow = glow.filter(ImageFilter.GaussianBlur(int(26 * k)))
    img = Image.blend(img, Image.composite(glow, img, glow.convert("L")), 0.9)
    d = ImageDraw.Draw(img)
    d.polygon([P(*p) for p in bolt], fill=(210, 245, 255), outline=(255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)

icon(192).save("icons/icon-192.png"); icon(512).save("icons/icon-512.png")
icon(512, True).save("icons/icon-maskable-512.png"); icon(180).save("icons/apple-touch-icon.png")
print("icons written")
