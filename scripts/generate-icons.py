#!/usr/bin/env python3

import os
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

def main():
    icons_dir = Path("src-tauri/icons")
    icons_dir.mkdir(parents=True, exist_ok=True)
    
    for size in [32, 128, 256, 512]:
        filename = "128x128@2x.png" if size == 256 else f"{size}x{size}.png"
        create_icon(size, str(icons_dir / filename))
    
    print("Icons generated!")

if __name__ == "__main__":
    main()