# HDR Format Landscape

## Format Comparison

| Format | HDR Method | Max DR | Browser Support | Gain Map |
|--------|-----------|--------|-----------------|----------|
| AVIF HDR | Native PQ/HLG, 10/12-bit | 16+ stops | Chrome, Edge, Safari 16.4+ | Via auxiliary image |
| JPEG + Gain Map | ISO 21496-1 container | ~4 stops headroom | Chrome, Edge, Safari 18+ | MPF container |
| JPEG + Android XMP | Google Ultra HDR | ~4 stops headroom | Android 14+, Chrome | XMP metadata |
| JPEG XL | Native HDR, up to 32-bit float | Unlimited | Safari 17+, Chrome (flag) | Built-in |
| HEIF/HEIC | 10-bit HEVC HDR | 12+ stops | Safari, iOS native | Via Apple format |

## ISO 21496-1 (October 2024)

The unified gain map standard replaces incompatible Apple, Adobe, and Android formats.

**Key properties:**
- `gainMapMin` / `gainMapMax` — headroom range in stops
- `gainMapGamma` — gain curve shape
- `offsetSDR` / `offsetHDR` — black point offsets
- `hdrCapacityMin` / `hdrCapacityMax` — device capability range

**Container:** Metadata in codestream (not sidecar). Prevents stripping during editing.

## Browser HDR Support (2025+)

| Browser | AVIF HDR | JPEG Gain Map | JPEG XL HDR |
|---------|----------|---------------|-------------|
| Chrome 85+ | Yes | Yes (ISO + Android) | Behind flag |
| Edge 85+ | Yes | Yes | Behind flag |
| Safari 16.4+ | AVIF only | Safari 18+ (ISO) | Safari 17+ |
| Firefox 93+ | AVIF SDR only | No | No |
| iOS Safari | Same as Safari | Same | Same |
| Chrome Android | Yes | Yes (Ultra HDR) | Behind flag |

**HDR-capable audience:** ~85-90% of web traffic (excluding Firefox HDR gap).

## Headroom by Device (2025)

| Device | Max Headroom | Peak Brightness |
|--------|-------------|-----------------|
| iPhone 15 Pro | 2.5 stops | 2000 nits |
| iPhone 16 Pro | 3.0 stops | 2000 nits |
| MacBook Pro M1+ | 4.0 stops | 1600 nits |
| Pro Display XDR | 4.0 stops | 1600 nits |
| Samsung S24 Ultra | 2.5 stops | 2600 nits |
| Galaxy Z Fold | 2.0 stops | 1750 nits |
| iPad Pro M2+ | 3.0 stops | 1600 nits |
| Budget smartphone | 1.5 stops | 800 nits |
| SDR monitor | 0 stops | 350 nits |

## Dynamic Range Reference

| Source | Dynamic Range |
|--------|--------------|
| Modern camera RAW | 14+ stops |
| Best HDR displays | 12-14 stops |
| sRGB JPEG (8-bit) | ~8 stops |
| AVIF 10-bit | ~12 stops |
| AVIF 12-bit | ~14 stops |
| Human eye (simultaneous) | ~14 stops |
| Human eye (adaptation) | ~20 stops |
