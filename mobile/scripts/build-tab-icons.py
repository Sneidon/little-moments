#!/usr/bin/env python3
"""
Renders tab bar icons to PNG (@1x/@2x/@3x, 24pt) from the @expo/vector-icons
fonts, for the native bottom tabs on Android (which need image icons; iOS
uses SF Symbols). Icons are black on transparent; the tab bar tints them.

Usage: python3 scripts/build-tab-icons.py   (requires Pillow)
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR = os.path.join(ROOT, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons')
OUT = os.path.join(ROOT, 'assets/tab-icons')

# output name -> (icon set, glyph name)
ICONS = {
    'dashboard': ('Ionicons', 'grid-outline'),
    'students': ('MaterialCommunityIcons', 'human-child'),
    'messages': ('Ionicons', 'chatbubbles-outline'),
    'profile': ('Ionicons', 'person-outline'),
    'home': ('Ionicons', 'home-outline'),
    'media': ('Ionicons', 'images-outline'),
    'calendar': ('Ionicons', 'calendar-outline'),
    'settings': ('Ionicons', 'settings-outline'),
}

BASE = 24


def render(icon_set: str, glyph: str, scale: int) -> Image.Image:
    glyphs = json.load(open(os.path.join(VENDOR, 'glyphmaps', f'{icon_set}.json')))
    font = ImageFont.truetype(os.path.join(VENDOR, 'Fonts', f'{icon_set}.ttf'), BASE * scale)
    size = BASE * scale
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    char = chr(glyphs[glyph])
    left, top, right, bottom = draw.textbbox((0, 0), char, font=font)
    x = (size - (right - left)) / 2 - left
    y = (size - (bottom - top)) / 2 - top
    draw.text((x, y), char, font=font, fill=(0, 0, 0, 255))
    return img


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for name, (icon_set, glyph) in ICONS.items():
        for scale in (1, 2, 3):
            suffix = '' if scale == 1 else f'@{scale}x'
            render(icon_set, glyph, scale).save(os.path.join(OUT, f'{name}{suffix}.png'))
    print(f'Wrote {len(ICONS) * 3} icons to {OUT}')


if __name__ == '__main__':
    main()
