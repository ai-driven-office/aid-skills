# Core Web Vitals Image Optimization Guide

## CWV Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **INP** (Interaction to Next Paint) | < 200ms | 200ms - 500ms | > 500ms |

## How Images Affect CWV

### LCP — The Big One
Images are the LCP element in **70%+ of web pages**. Optimizing images is the single most impactful CWV improvement.

**LCP budget for images:**
- 4G (1.6 Mbps): < 500 KB for 2.5s LCP
- 3G (0.4 Mbps): < 125 KB for 2.5s LCP
- Fast WiFi (25 Mbps): < 7.8 MB for 2.5s LCP

### CLS — Prevent Layout Shift
Images without explicit dimensions cause layout shift. Always:
1. Set `width` and `height` attributes
2. Use `aspect-ratio` CSS
3. Use LQIP placeholders (BlurHash, ThumbHash)

### INP — Decode Performance
Large images block the main thread during decode:
- AVIF: Slower to decode than JPEG (GPU-accelerated on modern browsers)
- WebP: Fast decode
- JPEG: Fastest decode

## Optimization Targets by Connection

| Connection | Speed | Max Hero Image | Max Thumbnail |
|-----------|-------|----------------|---------------|
| 5G | 100 Mbps | 5 MB | 200 KB |
| 4G | 1.6 Mbps | 400 KB | 30 KB |
| 3G | 0.4 Mbps | 100 KB | 10 KB |
| 2G | 0.035 Mbps | 10 KB | 2 KB |

**Default target:** 4G (covers 75th percentile of users globally).

## Responsive Image Strategy

### Breakpoints
Standard responsive breakpoints for `srcset`:

```
320w  — Mobile portrait (small)
640w  — Mobile portrait (large) / tablet portrait
960w  — Tablet landscape
1280w — Desktop (standard)
1920w — Desktop (large) / 1080p
2560w — Desktop (QHD / 2K)
3840w — Desktop (4K / UHD)
```

**Practical default:** `320, 640, 960, 1280, 1920` covers 95%+ of viewports.

### `sizes` Attribute
Critical for browsers to select the right image before CSS loads:

```html
<img
  srcset="photo-320w.avif 320w, photo-640w.avif 640w, ..."
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  src="photo-640w.jpg"
  width="1920" height="1280"
  loading="lazy"
  decoding="async"
  alt="Description"
/>
```

## LQIP (Low-Quality Image Placeholder)

Prevents CLS while images load:

| Method | Size | Quality | CLS Fix | Implementation |
|--------|------|---------|---------|----------------|
| BlurHash | 28 bytes | Blurred gradient | Yes | Canvas decode in JS |
| ThumbHash | 28 bytes | Better color | Yes | Canvas decode in JS |
| CSS gradient | ~200 bytes | Solid color | Yes | Pure CSS, no JS |
| SVG trace | 1-2 KB | Silhouette | Yes | Inline SVG |
| Micro JPEG | 1-2 KB | Tiny image | Yes | `<img>` with blur CSS |
| Dominant color | 7 bytes | Solid color | Yes | `background-color` |

**Recommended:** BlurHash (best size/quality ratio, widely supported).

## Format Selection Strategy

```
If browser supports AVIF → serve AVIF (60-80% smaller than JPEG)
Else if browser supports WebP → serve WebP (25-35% smaller)
Else → serve optimized JPEG (mozjpeg)
```

Implement via:
1. `<picture>` element with `<source type="image/avif">`
2. Server-side content negotiation (`Accept` header)
3. CDN automatic format selection

## Quality Settings

| Format | Perceptually Lossless | Good Balance | Aggressive |
|--------|----------------------|--------------|------------|
| AVIF | 85-90 | 70-80 | 50-65 |
| WebP | 90-95 | 78-85 | 60-72 |
| JPEG | 92-95 | 80-85 | 65-75 |

**Note:** AVIF quality numbers are NOT comparable to JPEG quality numbers. AVIF Q75 ≈ JPEG Q85 perceptually.
