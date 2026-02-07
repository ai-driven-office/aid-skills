---
name: uhd-gain-map-editor
description: Create, edit, extract, and validate HDR gain maps. Use when you need to create gain maps from SDR+HDR image pairs, edit existing gain map parameters (SDR base brightness/contrast/saturation), extract gain maps from HDR images, preview at different headroom levels, or validate ISO 21496-1 compliance. The key tool for controlling how HDR images appear on SDR displays.
---

# UHD Gain Map Editor

Full control over HDR gain maps — the critical layer that determines how HDR images appear on SDR displays. Create from SDR+HDR pairs, edit SDR base parameters, extract and inspect, preview at multiple headroom levels, and validate compliance.

## Why Gain Maps Matter

The #1 problem in HDR photography: **poor SDR fallback quality**. When sharing HDR images, auto-generated SDR base images often appear oversaturated, clipped, or washed out. 85% of viewers have limited HDR headroom. This tool gives full control over the SDR experience.

## Commands

```bash
cd skills/uhd-gain-map-editor/scripts && bun install
```

```bash
# Create gain map from SDR + HDR image pair
bun gainmap.ts create <sdr-image> <hdr-image> -o output.jpg

# Extract gain map and SDR base from HDR image
bun gainmap.ts extract <hdr-image> -o ./extracted/

# Edit gain map parameters
bun gainmap.ts edit <hdr-image> --sdr-brightness +0.1 --sdr-contrast 1.1

# Preview at different headroom levels (opens browser)
bun gainmap.ts preview <hdr-image>

# Validate gain map compliance
bun gainmap.ts validate <hdr-image>

# Inspect gain map metadata
bun gainmap.ts inspect <hdr-image>

# Batch create from paired directories
bun gainmap.ts batch-create ./sdr/ ./hdr/ -o ./output/
```

## Create Command

Build a gain map from an SDR and HDR version of the same image.

```bash
bun gainmap.ts create photo-sdr.jpg photo-hdr.avif -o photo-gainmap.jpg \
  --type rgb \
  --headroom 3.0 \
  --standard both \
  --quality 90
```

| Option | Default | Description |
|--------|---------|-------------|
| `--type` | `rgb` | `rgb` (per-channel, color-accurate) or `luminosity` (smaller) |
| `--headroom` | `3.0` | Maximum headroom in stops |
| `--standard` | `both` | `iso` (ISO 21496-1), `android` (XMP), or `both` |
| `--format` | `jpeg` | Output: `jpeg` (gain map container) or `avif` |
| `--quality` | `90` | SDR base quality |
| `--map-quality` | `85` | Gain map quality (lower = smaller, less accurate) |
| `--map-resolution` | `full` | `full` or `half` (half saves space, loses detail) |

### Create Process

1. **Align** — Verify SDR and HDR images match dimensions
2. **Compute** — Calculate per-pixel gain: `gain = HDR_luminance / SDR_luminance`
3. **Encode** — Quantize gain values to target bit depth
4. **Package** — Embed gain map + metadata in output container
5. **Verify** — Reconstruct HDR from SDR + gain map, compare with original

## Edit Command

Adjust the SDR base image within an existing gain map container without re-encoding the HDR data.

```bash
bun gainmap.ts edit photo-hdr.jpg \
  --sdr-brightness +0.1 \
  --sdr-contrast 1.1 \
  --sdr-saturation 0.95 \
  --sdr-shadows +0.05 \
  --sdr-highlights -0.1
```

| Option | Range | Description |
|--------|-------|-------------|
| `--sdr-brightness` | -1.0 to +1.0 | Global brightness offset |
| `--sdr-contrast` | 0.0 to 3.0 | Contrast multiplier (1.0 = unchanged) |
| `--sdr-saturation` | 0.0 to 3.0 | Saturation multiplier (1.0 = unchanged) |
| `--sdr-shadows` | -1.0 to +1.0 | Shadow level adjustment |
| `--sdr-highlights` | -1.0 to +1.0 | Highlight level adjustment |
| `--sdr-warmth` | -1.0 to +1.0 | Color temperature shift |

This is the critical feature that fixes the #1 HDR photography problem: you can tune exactly how your image looks on SDR displays without affecting the HDR version.

## Extract Command

Pull apart a gain map image into its components.

```bash
bun gainmap.ts extract photo-hdr.jpg -o ./parts/
```

Output:
```
extracted/
├── sdr-base.jpg          # The SDR base image
├── gain-map.png          # The gain map (grayscale or RGB)
├── gain-map-heatmap.png  # Visual heatmap of gain values
└── metadata.json         # Gain map parameters and metadata
```

## Preview Command

```bash
bun gainmap.ts preview photo-hdr.jpg
```

Opens a browser with interactive viewer showing:
- SDR base image
- HDR at 1.5, 2.0, 2.5, 3.0, 4.0 stops headroom
- Gain map heatmap overlay
- Side-by-side slider comparison
- Device simulation (iPhone, MacBook, Samsung, SDR monitor)

## Validate Command

```bash
bun gainmap.ts validate photo-hdr.jpg
```

Checks against ISO 21496-1:
```
Gain Map Validation: photo-hdr.jpg
──────────────────────────────────
✅ Container format valid (JPEG MPF)
✅ Gain map present and decodable
✅ Metadata fields complete
✅ Headroom value within spec (3.0 stops)
⚠️  Map resolution is half — consider full for quality
✅ SDR base renders correctly at 0 headroom
✅ Color space metadata present (Display-P3)
❌ Android XMP not present — add for Android 14+ compatibility

Result: PASS (1 warning, 1 recommendation)
```

## Inspect Command

```bash
bun gainmap.ts inspect photo-hdr.jpg
```

Output:
```
Gain Map Inspection: photo-hdr.jpg
──────────────────────────────────
Type:           RGB (3-channel)
Standard:       ISO 21496-1
Max headroom:   3.0 stops
Min headroom:   0.0 stops
Map resolution: 2000 x 1500 (full)
Map bit depth:  8
SDR base:       4000 x 3000, sRGB, JPEG Q90
Color space:    Display-P3
Gamma:          1.0

Gain statistics:
  Min gain:     0.85 (shadows)
  Max gain:     4.12 (highlights)
  Mean gain:    1.42
  Std dev:      0.68

Coverage:
  Pixels with gain > 2.0:  18% (highlight regions)
  Pixels with gain < 1.0:   8% (shadow regions)
  Neutral pixels (≈1.0):   74%
```

## Dependencies

- **sharp**: Image processing, pixel manipulation, format I/O
- **Bun**: Runtime, file I/O, HTTP server (preview)
