# UVX (UHD) Skills Overview

This repository currently ships a UHD image workflow suite (`uhd-*` skills). If you refer to these as "UVX skills", this is the set.

## What These Skills Cover

| Skill | Primary purpose | Path |
|---|---|---|
| `uhd-text-to-image` | Generate images from prompts with session/review/refine/finalize workflow | `skills/uhd-text-to-image` |
| `uhd-image-upscaler` | 2x/4x AI upscaling for photos, illustrations, and generated images | `skills/uhd-image-upscaler` |
| `uhd-image-optimization` | Web/print/social optimization, responsive variants, LQIP, auditing | `skills/uhd-image-optimization` |
| `uhd-format-converter` | Precise format conversion (AVIF/WebP/JPEG/PNG/JXL/HEIF/TIFF) | `skills/uhd-format-converter` |
| `uhd-image-analyzer` | Deep metadata/HDR/compatibility inspection and reporting | `skills/uhd-image-analyzer` |
| `uhd-image-sdr-to-hdr` | Convert SDR images to HDR-style outputs (local or AI-assisted) | `skills/uhd-image-sdr-to-hdr` |
| `uhd-gain-map-editor` | Create/edit/inspect/validate gain-map workflows and SDR fallback behavior | `skills/uhd-gain-map-editor` |

## Shared Prerequisites

- Runtime: Bun (`bun --version`)
- Install per skill: `cd skills/<skill>/scripts && bun install`
- API key required for fal.ai-backed flows:
  - `uhd-text-to-image`
  - `uhd-image-upscaler`
  - `uhd-image-sdr-to-hdr` (AI mode only)
- Env var: `export FAL_KEY="..."`

## Typical Pipelines

### 1) Prompt to production web asset

```bash
# Generate
bun skills/uhd-text-to-image/scripts/uhd.ts generate "A cinematic ramen poster" --num 2

# Review/refine/finalize
bun skills/uhd-text-to-image/scripts/uhd.ts review
bun skills/uhd-text-to-image/scripts/uhd.ts refine
bun skills/uhd-text-to-image/scripts/uhd.ts finalize --dest ./images

# Upscale and optimize
bun skills/uhd-image-upscaler/scripts/upscale.ts upscale ./images/poster.png -s 2 -o ./images/poster-2x.png
bun skills/uhd-image-optimization/scripts/optimize.ts web ./images/poster-2x.png -o ./dist/images
```

### 2) Existing image library modernization

```bash
# Audit current images
bun skills/uhd-image-analyzer/scripts/analyze.ts batch ./assets --summary
bun skills/uhd-image-optimization/scripts/optimize.ts audit ./assets

# Convert to modern delivery formats
bun skills/uhd-format-converter/scripts/convert.ts batch ./assets -f avif -o ./assets-modern --recursive
```

### 3) HDR-oriented workflow

```bash
# SDR to HDR
bun skills/uhd-image-sdr-to-hdr/scripts/sdr-to-hdr.ts convert ./photo.jpg -m gainmap -o ./photo-hdr.avif

# Gain-map inspection/validation
bun skills/uhd-gain-map-editor/scripts/gainmap.ts inspect ./photo-hdr.jpg
bun skills/uhd-gain-map-editor/scripts/gainmap.ts validate ./photo-hdr.jpg
```

## Skill Selection Quick Guide

- Need new visuals from text: `uhd-text-to-image`
- Need bigger/sharper output: `uhd-image-upscaler`
- Need smaller/faster web delivery: `uhd-image-optimization` + `uhd-format-converter`
- Need diagnostics/compliance checks: `uhd-image-analyzer`
- Need HDR conversion or gain-map control: `uhd-image-sdr-to-hdr` + `uhd-gain-map-editor`
