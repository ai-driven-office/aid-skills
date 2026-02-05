# AID (AI Driven Office) Slide Template Specs

AID presentations use a distinct visual language from the standard CyberAgent template. Where CA slides are clean, green, and corporate, AID slides are modern, gradient-driven, and tech-forward.

## Typography

Inherits CA base fonts with AID-specific overrides for display text.

| Context | Font | Notes |
|---------|------|-------|
| Japanese (all text) | **M PLUS 1p** | Same as CA standard |
| English body | **Arial** | Same as CA standard |
| English display/headlines | **Inter Black** or **Archivo Black** | Bold geometric sans-serif, weight 900 |

For presentations where Inter/Archivo aren't available, use Arial Black as fallback for English display text.

### Text Size Scale

Same as CA standard:

| Element | Size | Weight |
|---------|------|--------|
| Headline | 24pt | Bold / Black |
| Major Heading | 18pt | Bold |
| Sub-Heading | 14pt | Bold |
| Body Text | 12pt | Regular |
| Notes/Captions | 8pt | Regular |

### Text Rules

- Same spacing and alignment rules as CA (1.15 line spacing, left-align default, 30px margins)
- **Emphasis**: Use AID Blue (`#3370FE`) or AID Red (`#FF0413`) text for key terms — NOT green
- On dark backgrounds, use white text (`#FFFFFF`)

## Colors

### Light Theme (AID Gradient)

| Role | Hex | Notes |
|------|-----|-------|
| Background | `#FFFFFF` | White, clean |
| Accent — Primary | `#3370FE` | AID Blue |
| Accent — Secondary | `#FF0413` | AID Red |
| Accent — Gradient bar | Blue → Red | Sharp-edged rectangle fills |
| Callout background | `#E8EEFF` | Light blue tint |
| Text — Primary | `#000000` | Black |
| Text — Emphasis | `#3370FE` | Blue for highlights |
| Text — Secondary | `#485055` | Gray (inherited from CA) |

### Dark Theme (AID Dark)

| Role | Hex | Notes |
|------|-----|-------|
| Background | `#0A0A0A` | Near black |
| Accent — Primary | `#5C8DFE` | Lightened AID Blue (for dark bg) |
| Accent — Secondary | `#FF3640` | Lightened AID Red (for dark bg) |
| Text — Primary | `#FFFFFF` | White |
| Text — Secondary | `#9CA0A3` | Muted gray |
| Gradient overlay | Blue → Red | Use for hero sections |

### Gradient Construction

```
Direction: 135deg (bottom-left → top-right)
4-stop: #3370FE 0%, #8A3CB8 40%, #E0247A 70%, #FF0413 100%
2-stop: #3370FE → #FF0413
```

PPTX hex (no `#` prefix): `3370FE`, `8A3CB8`, `E0247A`, `FF0413`

Note: PptxGenJS does not support native gradient fills. Use a pre-rendered gradient image as background instead. For template-based editing, gradient shapes can be defined in the XML.

## Logo Assets

Located in `reference/logos/aid/`:

| File | Use |
|------|-----|
| `rgb_Logomark.png` | Full logo "AI := Driven" — for title slides (light bg) |
| `rgb_Symbol Mark.png` | `:=` symbol only — for slide headers, favicons |


For dark backgrounds, the logomark works as-is (black text + colored symbol on dark). For extra contrast, use the symbol mark alone.

## Slide Types

### 1. Title Slide (Cover)

**Dark variant (preferred for AID):**
- Background: `#0A0A0A` (near black)
- AID logomark or symbol: top-left area
- Title: White text, 24pt+ bold
- Subtitle: White text, 14pt regular
- Optional: Gradient bar accent (thin horizontal line, blue-to-red)
- Footer: `©CyberAgent, Inc. AIドリブン推進室` in muted gray

**Light variant:**
- Background: `#FFFFFF`
- AID logomark: top-left
- Title: Black text, 24pt+ bold
- Blue-to-red gradient bar below title as accent

### 2. Agenda Slide

- White background
- "AGENDA" in AID Blue (`#3370FE`) bold text
- Numbered items: Blue numbers (`01`, `02`, etc.) with black description text
- Optional: `:=` symbol mark as decorative element

### 3. Section Divider

**Dark variant:**
- Background: `#0A0A0A`
- Section number in AID Blue or gradient text
- Section title in white bold
- Optional: Gradient bar accent

**Light variant:**
- Background: `#FFFFFF`
- Blue section number + black title
- Gradient bar separator

### 4. Content Slide (Standard)

- White background
- **Section header bar** at top: Section number + gradient vertical bar (`|`) + section name
- The vertical bar uses AID gradient (blue-to-red) instead of CA green
- Content area below
- Footer: copyright + page number

### 5. Content Slide with CONFIDENTIAL

- Same as content slide
- `CONFIDENTIAL` badge: outlined box at top-right (AID Blue border)

### 6. Key Visual / Hero Slide

- Full-bleed gradient background (blue → red, 135deg)
- Large white text statement (headline or key metric)
- Minimal additional elements — let the gradient speak

### 7. "AI := ___" Campaign Slide

- Uses the expandable logo format: "AI := [Topic]"
- `:=` symbol mark centered or left-aligned
- The fill-in word in bold display font
- Can be dark or light themed

### 8. Closing Slide

**Dark variant:**
- Background: `#0A0A0A`
- AID logomark centered
- Optional: Subtle gradient glow behind symbol

**Light variant:**
- Background: `#FFFFFF`
- AID logomark centered

## Visual Language

### Gradient Bars (replaces CA green bars)

Where CA uses green vertical/horizontal bars as separators, AID uses gradient-filled bars:
- Direction: Left-to-right or bottom-to-top (consistent with blue → red flow)
- Shape: Sharp-edged rectangles, no border-radius
- Width: Same proportions as CA green bars

### Section Numbers

- Format: Two digits (`01`, `02`, `03`)
- Color: AID Blue (`#3370FE`) on light backgrounds, lightened blue (`#5C8DFE`) on dark
- Weight: Bold

### Callout Boxes

- Light blue background (`#E8EEFF`) on light slides — replaces CA's green `#E7F5E9`
- Dark gray background (`#141E25`) on dark slides
- No rounded corners (geometric minimalism — circles and rectangles only, but for boxes use sharp corners)

### Texture

AID brand uses dithering/stipple textures — scattered dots creating gradient transitions. In PPTX:
- Use pre-rendered texture images as shape fills or backgrounds
- Apply sparingly — a subtle noise overlay on gradient areas adds the "digital warmth" without overwhelming

### Charts & Diagrams

- Use AID color palette: Blue (`#3370FE`), Red (`#FF0413`), Magenta (`#E0247A`), Purple (`#8A3CB8`)
- Gradient-colored segments where possible
- Dark chart backgrounds for data-heavy slides
- White/light gray for supporting elements

### Contrast Principle

Hard geometric lines (representing AI, technology) vs. soft organic curves (representing humans, "Driven"). Apply this tension:
- Sharp rectangular shapes for data, metrics, technical content
- Rounded elements for people, culture, collaboration topics
