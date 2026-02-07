---
name: uhd-format-converter
description: Convert images between formats with precise encoding control. Use when you need to convert images to AVIF, WebP, JPEG, PNG, JPEG XL, HEIF, or TIFF. Supports batch conversion, quality control, bit depth selection, color space conversion, and browser-targeted format negotiation.
---

# UHD Format Converter

Convert between image formats with full control over encoding parameters. Supports AVIF, WebP, JPEG, PNG, JPEG XL, HEIF, and TIFF with quality, bit depth, color space, and effort controls.

## Commands

```bash
cd skills/uhd-format-converter/scripts && bun install
```

```bash
# Convert a single image
bun convert.ts convert <input> -f avif
bun convert.ts convert <input> -f webp -q 85 -o output.webp

# Batch convert a directory
bun convert.ts batch <dir> -f avif -q 80 -o ./converted/
bun convert.ts batch <dir> -f webp --recursive

# Generate all formats and compare size/quality
bun convert.ts compare <input>
bun convert.ts compare <input> --quality 60,75,85,95

# Recommend best format for target browsers
bun convert.ts negotiate <input> --target modern
bun convert.ts negotiate <input> --target "chrome,safari,firefox"
```

## Format Support Matrix

| Format | Encode | Decode | HDR | Lossless | Max Depth |
|--------|--------|--------|-----|----------|-----------|
| **AVIF** | ✅ | ✅ | ✅ | ✅ | 12-bit |
| **WebP** | ✅ | ✅ | ❌ | ✅ | 8-bit |
| **JPEG** | ✅ | ✅ | ❌* | ❌ | 8-bit |
| **PNG** | ✅ | ✅ | ❌ | ✅ | 16-bit |
| **JPEG XL** | ✅ | ✅ | ✅ | ✅ | 32-bit |
| **HEIF** | ✅ | ✅ | ✅ | ❌ | 10-bit |
| **TIFF** | ✅ | ✅ | ❌ | ✅ | 32-bit |

*JPEG supports HDR via gain maps (separate container, not format-level)

## Encoding Options

```bash
# Quality (1-100, lossy formats)
bun convert.ts convert photo.png -f avif -q 75

# Bit depth (for formats that support it)
bun convert.ts convert photo.tiff -f avif --bit-depth 10

# Color space conversion
bun convert.ts convert photo.jpg -f avif --color-space display-p3

# Lossless mode
bun convert.ts convert photo.png -f avif --lossless
bun convert.ts convert photo.png -f webp --lossless

# Encoding effort (speed vs compression, 0-9)
bun convert.ts convert photo.jpg -f avif --effort 6

# Chroma subsampling
bun convert.ts convert photo.png -f avif --chroma 444
bun convert.ts convert photo.png -f jpeg --chroma 420

# Strip metadata (remove EXIF, ICC, XMP)
bun convert.ts convert photo.jpg -f avif --strip

# Preserve metadata (default)
bun convert.ts convert photo.jpg -f avif --keep-metadata
```

## Compare Mode

Generate all supported formats at multiple quality levels:

```bash
bun convert.ts compare sunset.png
```

Output:
```
Format Comparison: sunset.png (4200x2800, 18.2 MB)
──────────────────────────────────────────────────
Format    Q75        Q85        Q95        Lossless
AVIF      312 KB     486 KB     1.2 MB     8.1 MB
WebP      524 KB     780 KB     1.8 MB     12.4 MB
JPEG      680 KB     1.1 MB     2.8 MB     —
PNG       —          —          —          18.2 MB
JXL       298 KB     462 KB     1.1 MB     7.8 MB

Best lossy:    AVIF @ Q75 (312 KB, 98.3% reduction)
Best lossless: JXL (7.8 MB, 57.1% reduction)
```

## Browser Negotiation

```bash
# Modern browsers (Chrome, Edge, Safari 16+, Firefox 93+)
bun convert.ts negotiate photo.jpg --target modern
# → AVIF primary, WebP fallback

# Universal (including older browsers)
bun convert.ts negotiate photo.jpg --target universal
# → WebP primary, JPEG fallback

# Specific browsers
bun convert.ts negotiate photo.jpg --target "chrome 85+, safari 16+, firefox"
# → AVIF for Chrome/Safari, WebP for Firefox

# Generate all needed formats
bun convert.ts negotiate photo.jpg --target modern --generate -o ./out/
# Creates: photo.avif, photo.webp, photo.jpg (fallback)
```

## Batch Options

```bash
# Convert all images in directory to AVIF
bun convert.ts batch ./photos -f avif -q 80 -o ./converted/

# Recursive with glob pattern
bun convert.ts batch "./photos/**/*.{jpg,png}" -f webp -o ./out/

# Preserve directory structure
bun convert.ts batch ./photos -f avif --recursive --preserve-structure -o ./out/

# Dry run (show plan without converting)
bun convert.ts batch ./photos -f avif --dry-run

# Concurrency control
bun convert.ts batch ./photos -f avif -c 8

# Skip existing files
bun convert.ts batch ./photos -f avif --skip-existing -o ./out/
```

## Dependencies

- **sharp**: Image encoding/decoding for all major formats
- **Bun**: Runtime, file I/O, glob support
