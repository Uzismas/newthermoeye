"""
Generate realistic synthetic OCTA-like images for demo.
Produces grayscale vessel-network images that resemble clinical OCTA scans.
"""
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import math, random

SIZE = 512
OUT = "test-assets/scans/synthetic-realistic"

import os; os.makedirs(OUT, exist_ok=True)

def retinal_bg(rng):
    """Dark circular retinal field with subtle noise."""
    img = np.zeros((SIZE, SIZE), dtype=np.float32)
    cx = cy = SIZE // 2
    for y in range(SIZE):
        for x in range(SIZE):
            r = math.sqrt((x-cx)**2 + (y-cy)**2)
            if r < SIZE*0.46:
                img[y,x] = rng.uniform(4, 18)
    return img

def add_vessels(img, rng, n_primary=6, density=1.0):
    """Branching vessel network radiating from optic disc area."""
    cx, cy = SIZE//2 + rng.integers(-20,20), SIZE//2 + rng.integers(-20,20)
    def branch(x, y, angle, length, width, depth=0):
        if depth > 5 or length < 4 or width < 0.4:
            return
        ex = x + length * math.cos(angle)
        ey = y + length * math.sin(angle)
        steps = max(int(length), 1)
        for i in range(steps):
            px = int(x + (ex-x)*i/steps)
            py = int(y + (ey-y)*i/steps)
            if 0 <= px < SIZE and 0 <= py < SIZE:
                r = max(1, int(width))
                for dy in range(-r, r+1):
                    for dx in range(-r, r+1):
                        if dx**2+dy**2 <= r**2:
                            nx, ny = px+dx, py+dy
                            if 0<=nx<SIZE and 0<=ny<SIZE:
                                img[ny,nx] = min(255, img[ny,nx] + rng.uniform(60,120)*density)
        if depth < 4:
            jitter = rng.uniform(0.2, 0.6)
            branch(ex, ey, angle+jitter, length*rng.uniform(0.5,0.7), width*0.65, depth+1)
            branch(ex, ey, angle-jitter, length*rng.uniform(0.5,0.7), width*0.65, depth+1)
    for _ in range(n_primary):
        angle = rng.uniform(0, 2*math.pi)
        branch(cx, cy, angle, rng.uniform(80,140), rng.uniform(2,4))

def add_faz(img, rng, cx=None, cy=None, radius=18, dark=True):
    """Foveal avascular zone — dark circle in center."""
    cx = cx if cx is not None else SIZE//2 + int(rng.integers(-8,8))
    cy = cy if cy is not None else SIZE//2 + int(rng.integers(-8,8))
    for y in range(SIZE):
        for x in range(SIZE):
            if math.sqrt((x-cx)**2+(y-cy)**2) < radius:
                img[y,x] = img[y,x]*0.15 if dark else img[y,x]*0.5

def apply_noise_blur(img, rng, blur=1.2, noise=6):
    arr = np.clip(img + rng.normal(0, noise, img.shape), 0, 255).astype(np.uint8)
    pil = Image.fromarray(arr, "L").filter(ImageFilter.GaussianBlur(blur))
    return pil

def make_circular_mask(pil_img):
    mask = Image.new("L", pil_img.size, 0)
    d = ImageDraw.Draw(mask)
    m = 28
    d.ellipse([m, m, SIZE-m, SIZE-m], fill=255)
    out = Image.new("L", pil_img.size, 0)
    out.paste(pil_img, mask=mask)
    return out

def save(pil_img, name):
    rgb = Image.merge("RGB", [pil_img, pil_img, pil_img])
    rgb.save(f"{OUT}/{name}.jpg", quality=92)
    print(f"  saved {name}.jpg")


specs = [
    # (name, n_primary, density, faz_radius, faz_dark, noise, seed)
    ("normal-octa-01",      7, 1.0, 16, True,  5, 1),
    ("normal-octa-02",      6, 1.0, 14, True,  6, 2),
    ("alzheimer-risk-01",   4, 0.55, 22, True, 8, 3),   # low density, large FAZ
    ("alzheimer-risk-02",   3, 0.50, 24, True, 9, 4),
    ("diabetic-ret-01",     5, 0.40, 28, True, 10, 5),  # very sparse, large FAZ
    ("diabetic-ret-02",     4, 0.35, 30, True, 12, 6),
    ("glaucoma-01",         5, 0.60, 15, True,  7, 7),  # moderate density
    ("glaucoma-02",         5, 0.58, 14, True,  6, 8),
    ("amd-01",              6, 0.75, 12, False, 14, 9), # bright spots (drusen)
    ("amd-02",              5, 0.70, 10, False, 16, 10),
    ("hypertensive-01",     8, 1.1, 15, True,   9, 11), # tortuous vessels
    ("pathologic-myopia-01",3, 0.30, 18, True,  5, 12), # very pale/thin
]

print("Generating realistic synthetic OCTA images...")
for (name, n_prim, density, faz_r, faz_dark, noise, seed) in specs:
    rng = np.random.default_rng(seed)
    img = retinal_bg(rng)
    add_vessels(img, rng, n_primary=n_prim, density=density)
    add_faz(img, rng, radius=faz_r, dark=faz_dark)
    pil = apply_noise_blur(img, rng, noise=noise)
    pil = make_circular_mask(pil)
    save(pil, name)

print("Done.")
