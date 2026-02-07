---
name: uhd-image-analyzer
description: Deep image inspection and analysis tool. Use when you need to inspect image metadata, detect HDR capability, analyze color spaces, check gain map presence, extract EXIF data, assess bit depth, or generate browser/device compatibility reports. Supports single files and batch directory analysis.
---

# UHD Image Analyzer

Inspect images with surgical precision: metadata, color space, bit depth, HDR capability, gain map presence, ICC profiles, and browser compatibility — all from one CLI.

## Commands

```bash
cd skills/uhd-image-analyzer/scripts && bun install
```

```bash
# Full inspection report for a single image
bun analyze.ts inspect <file>

# Extract EXIF/XMP metadata
bun analyze.ts metadata <file>

# HDR capability analysis (color space, bit depth, gain map, headroom)
bun analyze.ts hdr <file>

# Browser/device compatibility matrix
bun analyze.ts compat <file>

# Batch analysis of a directory
bun analyze.ts batch <dir> [--recursive]

# Generate JSON/markdown report
bun analyze.ts report <dir> -o report.json
bun analyze.ts report <dir> -o report.md

# Compare two images side-by-side
bun analyze.ts diff <file1> <file2>
```

## Output Modes

| Flag | Effect |
|------|--------|
| (none) | Formatted terminal output with color |
| `--json` | Machine-readable JSON |
| `-o <file>` | Write report to file (format from extension) |
| `--quiet` | Errors only |

## Inspect Output Fields

| Field | Description |
|-------|-------------|
| **Format** | File format (JPEG, PNG, AVIF, WebP, TIFF, HEIF, JXL) |
| **Dimensions** | Width x Height in pixels |
| **File size** | Bytes + human-readable |
| **Color space** | sRGB, Display-P3, Rec.2020, Adobe RGB, ProPhoto |
| **Bit depth** | 8, 10, 12, 16 bits per channel |
| **Channels** | RGB, RGBA, CMYK, Grayscale |
| **ICC profile** | Embedded profile name and description |
| **HDR capable** | Yes/No with reason |
| **Gain map** | Present/Absent, type (ISO 21496-1, Apple, Android XMP) |
| **Dynamic range** | Estimated stops of DR |
| **EXIF** | Camera, lens, exposure, GPS (if present) |
| **Compression** | Codec, quality estimate, effort level |

## HDR Detection Logic

The analyzer checks multiple signals to determine HDR capability:

1. **Bit depth** > 8 bits → HDR candidate
2. **Color space** is Display-P3 or Rec.2020 → wide gamut
3. **Transfer function** is PQ or HLG → HDR mastering
4. **Gain map present** → backward-compatible HDR
5. **AVIF** with high bit depth → likely HDR
6. **CICP** (Coding Independent Code Points) in HEIF/AVIF

## Browser Compatibility Matrix

`bun analyze.ts compat <file>` produces:

```
Browser Compatibility for: sunset-hdr.avif
──────────────────────────────────────────
Format: AVIF HDR (10-bit, Display-P3)

✅ Chrome 85+        Full HDR support
✅ Edge 85+          Full HDR support
✅ Safari 16.4+      AVIF support (HDR varies)
✅ Opera 71+         Full HDR support
⚠️  Firefox 93+      AVIF SDR only (no HDR)
❌ IE 11             No AVIF support

Mobile:
✅ iOS Safari 16.4+  AVIF + HDR (500M+ devices)
✅ Chrome Android    Full HDR support
⚠️  Samsung Internet  AVIF yes, HDR limited

Recommended fallback: WebP (SDR) → JPEG (universal)
HDR-capable audience: ~85% of web traffic
```

## Batch Analysis

```bash
# Analyze all images in a directory
bun analyze.ts batch ./photos --recursive

# Output summary table
bun analyze.ts batch ./photos --summary

# Filter by HDR capability
bun analyze.ts batch ./photos --filter hdr
bun analyze.ts batch ./photos --filter sdr
```

## Dependencies

- **sharp**: Image metadata extraction, format detection, ICC profile reading
- **Bun**: Runtime and file I/O
