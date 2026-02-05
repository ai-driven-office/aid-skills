---
name: aid-brand-guidelines
description: Applies AID (AI Driven Office / AIドリブン推進室) brand colors, gradient effects, and design language. Use when AID branding, red-blue gradient identity, `:=` symbol, or AIドリブン design standards apply. Extends CyberAgent brand (ca-brand-guidelines) with AID-specific overrides.
license: Complete terms in LICENSE.txt
---

# AID (AI Driven Office) Brand Guidelines

AID is CyberAgent's internal organization driving AI-native transformation. The brand identity builds on CyberAgent foundations but establishes a distinct visual language centered on a red-blue gradient, geometric minimalism, and digital texture.

**Parent brand**: CyberAgent (ca-brand-guidelines) — inherit typography, gray scales, semantic colors, and spacing system from there. This skill defines AID-specific overrides only.

## Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| AID Red | `#FF0413` | Primary brand — energy, action, top-right position |
| AID Blue | `#3370FE` | Primary brand — intelligence, origin, bottom-left position |
| AID Magenta | `#E0247A` | Gradient midpoint — transition, connection |
| AID Purple | `#8A3CB8` | Gradient midpoint — depth, blend zone |
| Black | `#000000` | Text on light backgrounds |
| White | `#ffffff` | Text on dark backgrounds |

### Gradient Direction

Always **Blue (bottom-left) → Red (top-right)**. This is the signature AID gradient flow representing "temperature rising" — from cool intelligence to warm action.

```css
/* Standard AID gradient */
background: linear-gradient(135deg, #3370FE 0%, #8A3CB8 40%, #E0247A 70%, #FF0413 100%);

/* Simplified two-stop */
background: linear-gradient(135deg, #3370FE, #FF0413);
```

### Inherited from CyberAgent

Gray scale, semantic colors (error, warning, info), and third-party colors — use ca-brand-guidelines tokens.

## Typography

Inherits CyberAgent typography (Meiryo for Japanese, Calibri/Arial for English). AID-specific overrides:

| Context | Font | Weight |
|---------|------|--------|
| English Display/Headlines | Bold geometric sans-serif (e.g., Inter, Archivo Black) | Black (900) |
| `:=` Symbol | Must use logo glyph or match logo proportions | — |
| "Driven" wordmark | Rounded terminal sans-serif | Bold (700) |

Fallback to CyberAgent fonts for body text, Japanese content, presentations, and print.

## Logo & Naming

| Context | Value |
|---------|-------|
| English Name | AID / AI Driven Office |
| Japanese Name | AIドリブン推進室 |
| Parent Org | 株式会社サイバーエージェント 技術政策管轄 |
| Tagline Concept | AI := Driven |

| Logo | File |
|------|------|
| Full logomark (digital) | `rgb_Logomark.png` |
| Full logomark (print) | `cmyk_Logomark.png` |
| Symbol mark only (digital) | `rgb_Symbol Mark.png` |
| Symbol mark only (print) | `cmyk_Symbol Mark.png` |
| Vector (digital) | `ai_driven_logo_rgb.ai` |
| Vector (print) | `ai_driven_logo_cmyk.ai` |

### Logo Forms

| Form | Description | Use |
|------|-------------|-----|
| Full Logomark | "AI := Driven" (text + symbol) | Primary usage |
| Symbol Mark | `:=` glyph only | Icons, favicons, avatars |
| Template | "AI := ___" | Campaigns, events (e.g., "AI := Innovation") |

## Design Language

### Core Shapes

Only **circles** (dots) and **rectangles** (lines). Geometric and minimal.

### Signature Effects

1. **Dithering/stipple texture** — scattered dots creating a gradient-like transition between colors. Digital, generative feel. Used in the colon trail and as background texture.
2. **Noise grain** — subtle film grain overlay for depth. Apply sparingly on gradients and solid color areas.
3. **Gradient bars** — sharp-edged rectangles with blue-to-red gradient fills. No border-radius.
4. **Particle fade** — dots scatter and dissolve toward edges, representing energy dissipation.

### Contrast Principle

Hard geometric lines (AI, technology) vs. soft organic curves (Driven, human). This tension between mechanical precision and human warmth is central to the brand.

## Theme Presets

| Theme | Primary | Secondary | Accent | Background |
|-------|---------|-----------|--------|------------|
| AID Gradient | `#3370FE` | `#FF0413` | `#E0247A` | `#ffffff` |
| AID Dark | `#3370FE` | `#FF0413` | `#E0247A` | `#0A0A0A` |
| AID Blue | `#3370FE` | `#E8EEFF` | `#FF0413` | `#ffffff` |
| AID Red | `#FF0413` | `#FFE5E7` | `#3370FE` | `#ffffff` |
| AID Mono | `#000000` | `#F5F5F5` | `#3370FE` | `#ffffff` |
| AID Night | `#5C8DFE` | `#FF3640` | `#C055E0` | `#08121a` |

### When to use which theme

- **AID Gradient**: Hero sections, cover slides, key visuals — maximum brand impact
- **AID Dark**: Presentations, event materials, developer-facing content
- **AID Blue / AID Red**: Single-color emphasis when gradient is too busy
- **AID Mono**: Documents, reports, formal communications — with color accents
- **AID Night**: Dark mode interfaces, inherited CyberAgent dark theme base

## Design Principles

1. **Blue-to-Red gradient as identity**: The temperature gradient anchors all materials
2. **Texture over flatness**: Use dithering, stipple, or noise to add digital warmth
3. **Geometric minimalism**: Circles and rectangles only — no decorative flourishes
4. **Contrast creates meaning**: Sharp vs. soft, cool vs. warm, mechanical vs. organic
5. **Inherit CyberAgent foundations**: 4px grid, spacing tokens, semantic colors from parent brand

## Reference Files

| File | Content |
|------|---------|
| `reference/mission.md` | Organizational context, vision, culture strategy — informs brand voice |
| `reference/colors.md` | Full AID color scales (Red, Blue, Purple, gradient stops) |
| `reference/logos.md` | Logo specifications, symbol mark `:=` construction, usage rules |