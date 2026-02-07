---
name: uhd-image-sdr-to-hdr
description: Convert SDR images to HDR using gain map generation or AI inverse tone mapping. Use when you need to add HDR headroom to standard images, create gain maps from SDR sources, generate HDR AVIF/JPEG from SDR input, or enhance dynamic range with AI. Supports both deterministic gain map mode and creative AI mode.
---

# UHD SDR-to-HDR Converter

Convert standard dynamic range images to HDR using two approaches: deterministic gain map generation (standards-based, controllable) or AI inverse tone mapping (creative, for photos lacking dynamic range). Both produce backward-compatible HDR with proper SDR fallback.

## Commands

```bash
cd skills/uhd-image-sdr-to-hdr/scripts && bun install
export FAL_KEY="your-api-key"  # Only needed for AI mode
```

```bash
# Convert using auto-selected method
bun sdr-to-hdr.ts convert <input> [output]

# Gain map mode (deterministic, local processing)
bun sdr-to-hdr.ts convert photo.jpg -m gainmap --headroom 2.5

# AI mode (creative, requires FAL_KEY)
bun sdr-to-hdr.ts convert photo.jpg -m ai

# Batch convert
bun sdr-to-hdr.ts batch <dir> -m gainmap --headroom 3.0 -o ./hdr/

# Preview: simulate HDR at different headroom levels (opens browser)
bun sdr-to-hdr.ts preview photo.jpg

# Analyze SDR image's HDR potential
bun sdr-to-hdr.ts analyze photo.jpg

# Dry run (show plan without processing)
bun sdr-to-hdr.ts convert photo.jpg --dry-run
```

## Methods

### Gain Map Mode (`-m gainmap`)

Local, deterministic processing using sharp. Analyzes SDR luminance and creates a synthetic gain map that expands highlights and shadows to fill the target HDR headroom.

| Setting | Default | Description |
|---------|---------|-------------|
| `--headroom` | `2.5` | Target HDR headroom in stops (1.0-4.0) |
| `--map-type` | `rgb` | Gain map type: `rgb` (color-aware) or `luminosity` |
| `--gamma` | `1.0` | Gain map gamma curve adjustment |
| `--highlight-boost` | `1.5` | Extra boost for bright regions |
| `--shadow-lift` | `1.2` | Lift factor for dark regions |
| `--format` | `avif` | Output: `avif` (HDR native) or `jpeg` (gain map container) |
| `--bit-depth` | `10` | Output bit depth: `10` or `12` |
| `--color-space` | `display-p3` | Target: `display-p3` or `rec2020` |

**How it works:**
1. Analyze source luminance histogram
2. Identify highlight/shadow regions with expansion potential
3. Generate per-pixel gain values (RGB or luminosity)
4. Encode HDR version with expanded range
5. Package with original SDR as fallback

**Best for:** Photographs with clipped highlights (skies, windows, reflections), images that were tone-mapped from RAW, any SDR image where you want controlled HDR expansion.

### AI Mode (`-m ai`)

Uses fal.ai image enhancement models for intelligent HDR expansion. More creative and can invent detail in blown highlights, but less controllable.

| Setting | Default | Description |
|---------|---------|-------------|
| `--strength` | `0.7` | Enhancement strength (0.0-1.0) |
| `--model` | `auto` | AI model selection |
| `--format` | `avif` | Output format |

**Cost:** ~$0.08-0.15 per image depending on resolution.

**Best for:** Photos with completely blown highlights, low dynamic range phone photos, creative enhancement where "looks good" matters more than accuracy.

### Auto Mode (default)

Analyzes the image and picks the best method:
- High dynamic range potential (good histogram spread) → **gain map**
- Blown highlights / low DR / phone photo → **AI**
- Already wide gamut → **gain map** with conservative settings

## Headroom Guide

| Stops | Typical Display | Use Case |
|-------|----------------|----------|
| 1.5 | Budget smartphone | Conservative, safe everywhere |
| 2.0 | Mid-range phone | Good balance |
| 2.5 | iPhone 15, Galaxy S24 | Recommended default |
| 3.0 | MacBook Pro M1+ | Rich HDR, may clip on phones |
| 4.0 | Pro Display XDR | Maximum, only for pro displays |

**Rule of thumb:** Target 2.5 stops. 85% of HDR-capable viewers have 1.5-3 stops of headroom. Content mastered at 4 stops will clip on most devices.

## Preview Command

```bash
bun sdr-to-hdr.ts preview photo.jpg
```

Opens a browser with side-by-side comparison:
- Original SDR
- Simulated HDR at 1.5, 2.5, and 4.0 stops
- Gain map visualization (heatmap)
- Histogram overlay showing DR expansion

## Analyze Command

```bash
bun sdr-to-hdr.ts analyze photo.jpg
```

Output:
```
HDR Potential Analysis: photo.jpg
─────────────────────────────────
Dimensions:     4000 x 3000
Format:         JPEG (8-bit, sRGB)
Current DR:     ~7.2 stops (estimated)

Histogram Analysis:
  Shadows (0-15%):    12% of pixels — moderate shadow detail
  Midtones (15-85%):  71% of pixels — good distribution
  Highlights (85-100%): 17% of pixels — some clipping detected

HDR Expansion Potential: HIGH
  Highlight recovery:  Good (soft clipping, recoverable)
  Shadow lift:         Moderate (some noise expected)
  Recommended method:  Gain map (--headroom 2.5)
  Estimated quality:   ★★★★☆

Suggested command:
  bun sdr-to-hdr.ts convert photo.jpg -m gainmap --headroom 2.5 --highlight-boost 1.8
```

## Output Formats

| Format | HDR Method | Browser Support |
|--------|-----------|-----------------|
| **AVIF HDR** | Native 10/12-bit PQ/HLG | Chrome, Edge, Safari 16.4+ |
| **JPEG + Gain Map** | ISO 21496-1 container | Chrome, Edge, Safari 18+ |
| **JPEG + Android XMP** | Android Ultra HDR | Android 14+, Chrome |

## Dependencies

- **sharp**: Image analysis, luminance extraction, HDR encoding, format conversion
- **@fal-ai/client**: AI inverse tone mapping (AI mode only)
- **Bun**: Runtime and file I/O

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_KEY` | AI mode only | fal.ai API key |
