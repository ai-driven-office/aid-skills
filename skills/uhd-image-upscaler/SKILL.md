---
name: uhd-image-upscaler
description: AI-powered image upscaling using fal.ai models. Use when you need to upscale images 2x or 4x, enhance low-resolution photos to UHD, improve AI-generated image quality, or compare upscaling models. Supports batch processing and pairs well with uhd-text-to-image output.
---

# UHD Image Upscaler

AI-powered upscaling via fal.ai. Turn low-resolution images into UHD quality with multiple model options. Pairs naturally with uhd-text-to-image output for maximum quality.

## Commands

```bash
cd skills/uhd-image-upscaler/scripts && bun install
export FAL_KEY="your-api-key"
```

```bash
# Upscale a single image (2x default)
bun upscale.ts upscale <input> [output]

# Upscale 4x
bun upscale.ts upscale photo.jpg -s 4

# Choose a specific model
bun upscale.ts upscale photo.jpg --model clarity

# Batch upscale a directory
bun upscale.ts batch <dir> -s 2 -o ./upscaled/
bun upscale.ts batch <dir> -s 4 --model real-esrgan -c 4

# Compare all models on the same image
bun upscale.ts compare photo.jpg

# Preview cost without processing
bun upscale.ts upscale photo.jpg --dry-run

# JSON output for automation
bun upscale.ts upscale photo.jpg --json --yes
```

## Models

| Model | Endpoint | Best For | Cost | Speed |
|-------|----------|----------|------|-------|
| **Clarity** | `fal-ai/clarity-upscaler` | Photos, natural images, faces | ~$0.10/img | Medium |
| **Real-ESRGAN** | `fal-ai/real-esrgan` | General purpose, anime, illustrations | ~$0.05/img | Fast |
| **Aura SR** | `fal-ai/aura-sr` | AI-generated images, text-to-image output | ~$0.08/img | Fast |
| **Creative** | `fal-ai/creative-upscaler` | Artistic enhancement + upscale | ~$0.12/img | Slow |

### When to use which

- **Clarity**: Best for photographs — faces, landscapes, products. Preserves fine detail and adds natural sharpness.
- **Real-ESRGAN**: General workhorse. Good for illustrations, anime, screenshots. Fastest and cheapest.
- **Aura SR**: Purpose-built for AI-generated images. Fixes common AI artifacts while upscaling. Use after uhd-text-to-image generation.
- **Creative**: Adds artistic detail during upscale. Can hallucinate new detail. Best when "looks impressive" matters more than accuracy.

Auto-selection: The CLI inspects the image for AI generation metadata (fal.ai, DALL-E, Midjourney signatures) and picks Aura SR for AI images, Clarity for photos.

## Options

```bash
# Scale factor
bun upscale.ts upscale photo.jpg -s 2    # 2x (default)
bun upscale.ts upscale photo.jpg -s 4    # 4x

# Output format
bun upscale.ts upscale photo.jpg -f png   # PNG (default)
bun upscale.ts upscale photo.jpg -f jpeg  # JPEG
bun upscale.ts upscale photo.jpg -f webp  # WebP

# Creativity (Creative model only, 0.0-1.0)
bun upscale.ts upscale photo.jpg --model creative --creativity 0.5

# Skip confirmation
bun upscale.ts upscale photo.jpg --yes
```

## Compare Mode

```bash
bun upscale.ts compare photo.jpg
```

Generates 2x upscale with all models, saves side-by-side:

```
Upscale Comparison: photo.jpg (512x512 → 1024x1024)
────────────────────────────────────────────────────
Model          Time      Size       Cost
Clarity        4.2s      2.1 MB     $0.10
Real-ESRGAN    1.8s      1.9 MB     $0.05
Aura SR        2.1s      2.0 MB     $0.08
Creative       8.3s      2.3 MB     $0.12

Total cost: $0.35
Output: ./compare-photo/
  clarity-photo-2x.png
  real-esrgan-photo-2x.png
  aura-sr-photo-2x.png
  creative-photo-2x.png
```

## Batch Processing

```bash
# Upscale all images in a directory
bun upscale.ts batch ./images/ -s 2 -o ./upscaled/

# With concurrency control
bun upscale.ts batch ./images/ -s 2 -c 4 -o ./upscaled/

# Filter by pattern
bun upscale.ts batch "./images/*.{jpg,png}" -s 2 -o ./upscaled/

# Dry run to check cost
bun upscale.ts batch ./images/ -s 4 --dry-run
```

Batch output:
```
Batch Upscale Plan
──────────────────
Images:      12
Scale:       2x
Model:       auto (Clarity for photos, Aura SR for AI-generated)
Est. cost:   $1.04
Output:      ./upscaled/

Proceed? [y/N]:
```

## Pipeline Integration

Combine with other UHD skills:

```bash
# Generate → Upscale → Optimize for web
bun ../uhd-text-to-image/scripts/uhd.ts generate "A sunset" --num 2 --json --yes \
  | bun upscale.ts upscale --stdin -s 2 -o ./upscaled/ \
  | bun ../uhd-image-optimization/scripts/optimize.ts optimize --stdin --preset web -o ./final/
```

## Dependencies

- **@fal-ai/client**: AI upscaling API calls
- **sharp**: Pre/post processing, format conversion, metadata
- **Bun**: Runtime and file I/O

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_KEY` | Yes | fal.ai API key for all upscaling operations |

## Cost Estimation

Every command shows cost before execution and requires confirmation. Use `--dry-run` to preview costs without processing, or `--yes` to skip confirmation for automation.
