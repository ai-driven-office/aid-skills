---
name: uhd-image-optimization
description: Optimize images for web, print, or social media with preset profiles. Use when you need to optimize images for Core Web Vitals, generate responsive srcsets, create LQIP/BlurHash placeholders, batch compress images, audit image performance, or prepare images for specific platforms (Instagram HDR, print CMYK).
---

# UHD Image Optimizer

Optimize images with intelligent presets for web (srcset, LQIP, CWV), print (max quality, CMYK), and social (Instagram HDR-safe). Includes auditing against Core Web Vitals targets and savings reports.

## Commands

```bash
cd skills/uhd-image-optimization/scripts && bun install
```

```bash
# Optimize with a preset
bun optimize.ts optimize <input> --preset web
bun optimize.ts optimize <input> --preset print
bun optimize.ts optimize <input> --preset social

# Web-specific: generate responsive srcset + LQIP
bun optimize.ts web <input> -o ./optimized/
bun optimize.ts web <input> --breakpoints 320,640,960,1280,1920 --lqip blurhash

# Batch optimize a directory
bun optimize.ts batch <dir> --preset web -o ./optimized/
bun optimize.ts batch <dir> --preset social --recursive

# Audit images against CWV targets
bun optimize.ts audit <dir>
bun optimize.ts audit <file>

# Generate savings report
bun optimize.ts report <dir> -o report.md
```

## Presets

### Web Preset

Optimized for Core Web Vitals (LCP, CLS) and modern browsers.

| Setting | Value |
|---------|-------|
| **Primary format** | AVIF |
| **Fallback format** | WebP → JPEG |
| **Quality** | 75 (AVIF), 80 (WebP), 82 (JPEG) |
| **Max width** | 1920px (configurable) |
| **Responsive sizes** | 320, 640, 960, 1280, 1920 |
| **LQIP** | BlurHash (4x3 components) |
| **Metadata** | Stripped (except copyright) |
| **Effort** | 6 (balanced speed/compression) |

Output structure:
```
optimized/
├── photo.avif              # Primary (AVIF)
├── photo.webp              # Fallback (WebP)
├── photo-320w.avif         # Responsive variants
├── photo-640w.avif
├── photo-960w.avif
├── photo-1280w.avif
├── photo-1920w.avif
├── photo-320w.webp
├── photo-640w.webp
├── photo-960w.webp
├── photo-1280w.webp
├── photo-1920w.webp
├── photo-lqip.txt          # BlurHash string
└── photo-manifest.json     # Metadata for all variants
```

### Print Preset

Maximum quality preservation for print production.

| Setting | Value |
|---------|-------|
| **Format** | TIFF (lossless) or PNG |
| **Quality** | 100 / lossless |
| **Color space** | Preserve original (or convert to CMYK) |
| **Bit depth** | Preserve (16-bit if available) |
| **Resolution** | Preserve original |
| **Metadata** | Preserve all |
| **Sharpening** | None (preserve original) |

### Social Preset

Optimized for Instagram, Threads, and social platforms.

| Setting | Value |
|---------|-------|
| **Format** | JPEG (universal), AVIF (HDR-capable) |
| **Quality** | 88 (JPEG), 80 (AVIF) |
| **Max dimension** | 1440px (Instagram optimal) |
| **Aspect ratios** | 1:1, 4:5, 1.91:1 (auto-crop guides) |
| **Color space** | sRGB (safe), Display-P3 (HDR) |
| **HDR** | Preserve gain maps when present |
| **Metadata** | Strip GPS, keep copyright |

## Web Command Details

```bash
# Full web optimization with all features
bun optimize.ts web photo.jpg -o ./out/ \
  --breakpoints 320,640,960,1280,1920 \
  --formats avif,webp,jpeg \
  --lqip blurhash \
  --max-width 1920

# Generate HTML picture element
bun optimize.ts web photo.jpg -o ./out/ --html
# Outputs <picture> element with srcset and fallbacks

# Custom quality per format
bun optimize.ts web photo.jpg -o ./out/ \
  --quality-avif 70 \
  --quality-webp 78 \
  --quality-jpeg 82
```

### LQIP Options

| Type | Size | Description |
|------|------|-------------|
| `blurhash` | ~28 bytes | Compact hash, renders as blurred gradient |
| `thumbhash` | ~28 bytes | Better color accuracy than blurhash |
| `css` | ~200 bytes | CSS gradient approximation |
| `svg` | ~1-2 KB | SVG trace with shapes |
| `micro` | ~1 KB | Tiny 16px JPEG/WebP thumbnail |

## Audit Command

```bash
bun optimize.ts audit ./images/
```

Output:
```
Image Audit Report
──────────────────
Target: LCP < 2.5s on 4G (1.6 Mbps)

⚠️  hero.jpg         3.2 MB    Would take 16s on 4G — NEEDS OPTIMIZATION
    → Suggestion: Convert to AVIF (est. 380 KB), add srcset

✅ logo.png          12 KB     OK (0.06s on 4G)

⚠️  gallery-01.jpg   1.8 MB    Would take 9s on 4G — NEEDS OPTIMIZATION
    → Suggestion: Resize from 5000px to 1920px, convert to AVIF

✅ icon.svg          2 KB      OK

Summary: 2/4 images need optimization
Potential savings: 4.6 MB → 0.4 MB (91% reduction)
Estimated LCP improvement: 16s → 1.9s on 4G
```

## Report Command

```bash
bun optimize.ts report ./images/ -o report.md
```

Generates a markdown report with:
- Total file count and size
- Format distribution pie chart (text)
- Optimization opportunities ranked by impact
- Before/after size comparisons
- Estimated bandwidth savings
- CWV impact projections

## Dependencies

- **sharp**: Image processing, resizing, format conversion, metadata
- **blurhash**: BlurHash LQIP generation
- **Bun**: Runtime, file I/O, glob
