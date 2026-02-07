# Browser HDR & Format Compatibility Matrix

## Desktop Browsers (2025+)

| Browser | AVIF | AVIF HDR | WebP | JPEG XL | JPEG Gain Map | HEIF |
|---------|------|----------|------|---------|---------------|------|
| Chrome 85+ | Yes | Yes | Yes | Flag | Yes (ISO+Android) | No |
| Edge 85+ | Yes | Yes | Yes | Flag | Yes | No |
| Safari 16.4+ | Yes | Varies | Yes (16+) | Yes (17+) | Yes (18+) | Yes |
| Firefox 93+ | Yes | SDR only | Yes (65+) | No | No | No |
| Opera 71+ | Yes | Yes | Yes | Flag | Yes | No |
| Brave | Yes | Yes | Yes | Flag | Yes | No |

## Mobile Browsers

| Browser | AVIF | AVIF HDR | WebP | JPEG Gain Map |
|---------|------|----------|------|---------------|
| iOS Safari 16.4+ | Yes | Varies | Yes | Yes (iOS 18+) |
| Chrome Android | Yes | Yes | Yes | Yes (Ultra HDR) |
| Samsung Internet 15+ | Yes | Limited | Yes | Limited |
| Firefox Android | Yes | SDR only | Yes | No |

## Traffic Share (Approximate 2025)

| Browser | Desktop | Mobile | Total |
|---------|---------|--------|-------|
| Chrome | 65% | 60% | 63% |
| Safari | 17% | 25% | 20% |
| Firefox | 8% | 3% | 6% |
| Edge | 6% | 1% | 4% |
| Samsung | 0% | 5% | 3% |
| Other | 4% | 6% | 4% |

## HDR-Capable Traffic

- **AVIF HDR support:** ~85% (Chrome + Edge + Safari + Opera)
- **JPEG Gain Map support:** ~75% (Chrome + Edge + Safari 18+)
- **No HDR support:** ~10% (Firefox + older browsers)

## Format Recommendation by Audience

| Target Audience | Primary | Fallback | Universal |
|----------------|---------|----------|-----------|
| Modern web (2024+) | AVIF | WebP | JPEG |
| HDR-first | AVIF HDR | JPEG + Gain Map | JPEG |
| Maximum compat | WebP | JPEG | JPEG |
| Apple ecosystem | HEIF | AVIF | JPEG |
| Photography portfolio | JPEG + Gain Map | AVIF HDR | JPEG |

## Content Negotiation via Accept Header

```
Accept: image/avif,image/webp,image/jpeg
```

Server responds with best supported format. Use `Vary: Accept` for CDN caching.

For HDR capability detection, no standard header exists yet. Options:
1. Client-side JS: `matchMedia('(dynamic-range: high)')`
2. CSS: `@media (dynamic-range: high) { ... }`
3. User-Agent sniffing (unreliable, last resort)
