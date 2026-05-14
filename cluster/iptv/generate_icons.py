#!/usr/bin/env python3
"""Generate app icons for all platforms from logoSVG1.svg"""

import shutil
import struct
import zlib
from pathlib import Path

import cairosvg
from PIL import Image
import io

BASE = Path(__file__).parent
SVG = BASE / "logo.svg"
CLIENT = BASE / "client"


def svg_to_png(size, padding=0.0):
    # Initial render at large size to maintain quality during crop
    render_size = max(size * 4, 1024)
    data = cairosvg.svg2png(url=str(SVG), output_width=render_size)
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    
    # Find bounding box of significant content
    # We use a threshold to ignore noise/artifacts at the edges
    alpha = img.split()[-1]
    mask_alpha = alpha.point(lambda x: 255 if x > 250 else 0)
    gray = img.convert("L")
    mask_gray = gray.point(lambda x: 255 if x > 150 else 0)
    
    from PIL import ImageChops
    mask = ImageChops.lighter(mask_alpha, mask_gray)
    bbox = mask.getbbox()
    if not bbox:
        return img.resize((size, size), Image.LANCZOS)
    
    # Crop to content
    img = img.crop(bbox)
    
    # Make it square
    w, h = img.size
    new_size = max(w, h)
    square_img = Image.new("RGBA", (new_size, new_size), (0, 0, 0, 0))
    square_img.paste(img, ((new_size - w) // 2, (new_size - h) // 2))
    
    # Add padding (5% to make it look balanced)
    padding = 0.05
    pad = int(new_size * padding)
    padded_size = new_size + 2 * pad
    padded_img = Image.new("RGBA", (padded_size, padded_size), (0, 0, 0, 0))
    padded_img.paste(square_img, (pad, pad))
    
    # Resize to final target size
    return padded_img.resize((size, size), Image.LANCZOS)


def save_png(path, size):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    img = svg_to_png(size)
    img.save(path, "PNG")
    print(f"  {path.relative_to(BASE)} ({size}x{size})")


def save_ico(path, sizes):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    images = []
    for s in sizes:
        img = svg_to_png(s)
        images.append(img)
    images[0].save(
        str(path), format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:]
    )
    print(f"  {path.relative_to(BASE)} ({', '.join(str(s) for s in sizes)})")


print("=== Flutter in-app assets ===")
save_png(CLIENT / "assets/images/logo.png", 512)
shutil.copy(SVG, CLIENT / "assets/images/logo.svg")
print(f"  client/assets/images/logo.svg (copied)")

print("\n=== Android mipmap icons ===")
android_res = CLIENT / "android/app/src/main/res"
save_png(android_res / "mipmap-mdpi/ic_launcher.png", 48)
save_png(android_res / "mipmap-hdpi/ic_launcher.png", 72)
save_png(android_res / "mipmap-xhdpi/ic_launcher.png", 96)
save_png(android_res / "mipmap-xxhdpi/ic_launcher.png", 144)
save_png(android_res / "mipmap-xxxhdpi/ic_launcher.png", 192)

print("\n=== iOS app icons ===")
ios_icons = CLIENT / "ios/Runner/Assets.xcassets/AppIcon.appiconset"
ios_files = {
    "Icon-App-20x20@1x.png": 20,
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-50x50@1x.png": 50,
    "Icon-App-50x50@2x.png": 100,
    "Icon-App-57x57@1x.png": 57,
    "Icon-App-57x57@2x.png": 114,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-72x72@1x.png": 72,
    "Icon-App-72x72@2x.png": 144,
    "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}
for fname, size in ios_files.items():
    save_png(ios_icons / fname, size)

print("\n=== macOS app icons ===")
macos_icons = CLIENT / "macos/Runner/Assets.xcassets/AppIcon.appiconset"
macos_files = {
    "app_icon_16.png": 16,
    "app_icon_32.png": 32,
    "app_icon_64.png": 64,
    "app_icon_128.png": 128,
    "app_icon_256.png": 256,
    "app_icon_512.png": 512,
    "app_icon_1024.png": 1024,
}
for fname, size in macos_files.items():
    save_png(macos_icons / fname, size)

print("\n=== Linux desktop icon ===")
save_png(CLIENT / "linux/my_application.png", 512)

print("\n=== Windows app icon ===")
save_ico(CLIENT / "windows/runner/resources/app_icon.ico", [16, 32, 48, 64, 128, 256])

print("\nDone!")
