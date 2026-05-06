#!/usr/bin/env python3

import os
import subprocess
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess
    subprocess.check_call(["pip", "install", "Pillow"])
    from PIL import Image, ImageDraw

def create_icon(size: int, output_path: str):
    indigo = (99, 102, 241, 255)
    white = (255, 255, 255, 255)
    border_opacity = (255, 255, 255, 50)
    
    img = Image.new('RGBA', (size, size), indigo)
    draw = ImageDraw.Draw(img)
    
    margin = size // 8
    
    points = [
        (margin, size - margin),           # bottom-left
        (margin, margin),                   # top-left
        (size // 2, size // 2 - margin // 4),  # center peak
        (size - margin, margin),            # top-right
        (size - margin, size - margin),     # bottom-right
    ]
    
    draw.polygon(points, fill=white)
    draw.rectangle([2, 2, size-3, size-3], outline=border_opacity, width=2)
    
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")

def create_ico(output_path: str):
    """Create Windows .ico file with multiple sizes"""
    sizes = [16, 32, 48, 64, 128, 256]
    images = []
    
    for size in sizes:
        img = Image.new('RGBA', (size, size), (99, 102, 241, 255))
        draw = ImageDraw.Draw(img)
        
        margin = size // 8
        points = [
            (margin, size - margin),
            (margin, margin),
            (size // 2, size // 2 - margin // 4),
            (size - margin, margin),
            (size - margin, size - margin),
        ]
        
        draw.polygon(points, fill=(255, 255, 255, 255))
        
        if size >= 16:
            draw.rectangle([2, 2, size-3, size-3], outline=(255, 255, 255, 50), width=1 if size < 32 else 2)
        
        images.append(img)
    
    # Save as .ico
    images[0].save(output_path, format='ICO', sizes=[(img.width, img.height) for img in images])
    print(f"Created: {output_path} (Windows ICO)")

def create_icns_macos(output_path: str):
    """Create macOS .icns using iconutil (macOS only)"""
    icons_dir = Path(output_path).parent
    
    iconset_dir = icons_dir / "icon.iconset"
    iconset_dir.mkdir(exist_ok=True)
    
    sizes = [16, 32, 128, 256, 512]
    
    for size in sizes:
        img = Image.new('RGBA', (size, size), (99, 102, 241, 255))
        draw = ImageDraw.Draw(img)
        
        margin = size // 8
        points = [
            (margin, size - margin),
            (margin, margin),
            (size // 2, size // 2 - margin // 4),
            (size - margin, margin),
            (size - margin, size - margin),
        ]
        
        draw.polygon(points, fill=(255, 255, 255, 255))
        
        if size >= 16:
            draw.rectangle([2, 2, size-3, size-3], outline=(255, 255, 255, 50), width=1 if size < 32 else 2)
        
        img.save(str(iconset_dir / f"icon_{size}x{size}.png"))
        
        if size <= 256:
            img_2x = img.resize((size * 2, size * 2), Image.Resampling.LANCZOS)
            img_2x.save(str(iconset_dir / f"icon_{size}x{size}@2x.png"))
    
    subprocess.run(["iconutil", "-c", "icns", str(iconset_dir), "-o", output_path], check=True)
    print(f"Created: {output_path} (macOS ICNS)")

def create_icns_linux(output_path: str):
    """Create placeholder .icns for Linux CI"""
    img = Image.new('RGBA', (128, 128), (99, 102, 241, 255))
    draw = ImageDraw.Draw(img)
    
    margin = 16
    points = [
        (margin, 112),
        (margin, 16),
        (64, 60),
        (112, 16),
        (112, 112),
    ]
    
    draw.polygon(points, fill=(255, 255, 255, 255))
    
    img.save(output_path, format='PNG')
    print(f"Created placeholder: {output_path} (Linux ICNS)")

def main():
    icons_dir = Path("src-tauri/icons")
    icons_dir.mkdir(parents=True, exist_ok=True)
    
    for size in [32, 128, 256, 512]:
        filename = "128x128@2x.png" if size == 256 else f"{size}x{size}.png"
        create_icon(size, str(icons_dir / filename))
    
    create_ico(str(icons_dir / "icon.ico"))
    
    if os.uname().sysname == 'Darwin':
        create_icns_macos(str(icons_dir / "icon.icns"))
    else:
        create_icns_linux(str(icons_dir / "icon.icns"))
    
    print("Icons generated!")

if __name__ == "__main__":
    main()