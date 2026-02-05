# CyberAgent Official Slide Template Specs

Extracted from `cyberagent_guideline_slide_template.pptx` (2026.01.23).

## Typography

| Context | Font | Notes |
|---------|------|-------|
| Japanese (all text) | **M PLUS 1p** | Google Font. Must be installed on the machine. |
| English (all text) | **Arial** | System font on both Windows and Mac. |

M PLUS 1p is not a system font — it must be downloaded from Google Fonts and installed. Without it, Japanese text falls back to a different font and layout breaks.

### Text Size Scale

| Element | Japanese | Size | Weight |
|---------|----------|------|--------|
| ワンセンテンス | Headline / one-sentence statement | 24pt | Bold |
| 大見出し | Major heading | 18pt | Bold |
| 中見出し | Sub-heading | 14pt | Bold |
| 文章 | Body text | 12pt | Regular |
| 注釈 | Notes, captions, footnotes | 8pt | Regular |

Recommended stops: 8, 12, 14, 18, 24. Stay within these values.

### Text Rules

- **Line spacing**: 1.15 lines
- **Alignment**: Left-align by default. Center only for titles and short text.
- **Headings**: Keep to 1 line. If longer, split between slide text and spoken words.
- **Points per slide**: Max 4-5 headings or bullet points.
- **Emphasis**: Use green text (`#298737`) for keywords to highlight. Supplementary text in smaller font.
- **Notes/captions**: Use 8pt and keep small.

## Colors

### Backgrounds

| Name | Hex | Use |
|------|-----|-----|
| White | `#FFFFFF` | Default background |
| Gray | `#F0F1F1` | Alternate/section backgrounds |
| Green | `#E7F5E9` | Callout boxes, highlight areas |

### Text Colors

| Name | Hex | Use |
|------|-----|-----|
| Black | `#000000` | Primary text |
| Green | `#298737` | Emphasis text, headings with emphasis |
| Gray | `#485055` | Secondary/supplementary text |

Note: Text green (`#298737`) is adjusted from corporate YellowGreen (`#82be28`) for readability on white backgrounds.

### Accent

| Name | Hex | Use |
|------|-----|-----|
| Light Green (YellowGreen) | `#82be28` | Accent color for shapes, icons, filled elements |

### Dark Slides

| Element | Hex |
|---------|-----|
| Background | `#1E2430` (dark blue-gray) |
| Text | `#FFFFFF` |
| Accent bar | `#82be28` (light green, same as accent) |

## Margins

30px on all four sides. Content (text, images, shapes) must stay within this boundary.

## Slide Types

### 1. Title Slide (Cover)

- White background
- CyberAgent logo: top-left area
- Title: Large bold text (24pt+), left-aligned
- Subtitle: Below title, regular weight
- Date: `YYYY.MM.DD` format, below subtitle
- Footer: `©CyberAgent, Inc. All Rights Reserved` centered at bottom

### 2. Agenda Slide

- White background
- "AGENDA" in green bold text, left-aligned
- Numbered items: Green numbers (`01`, `02`, `03`, `04`) with black description text
- No footer/page number header

### 3. Section Divider

- White background
- Green section number (`01`, `02`, etc.) + section title in bold black text
- Vertically centered, left-of-center position
- Footer with copyright + page number

### 4. Content Slide (Standard)

- White background
- **Section header bar** at top: `NN` `|` `セクション名` — green vertical bar as separator, section number and name in black
- Content area below header bar
- Footer: copyright centered, page number bottom-right

### 5. Content Slide with CONFIDENTIAL

- Same as standard content slide
- `CONFIDENTIAL` badge: outlined box at top-right corner (green border, no fill)

### 6. Profile / Self-Introduction

- Section header bar at top
- Left half: Image placeholder (gray box)
- Right half: Department, Name (large bold), romaji name, bio/history text

### 7. Vision / Purpose / Brand Concept

- White background
- CyberAgent logo + label (`Vision`, `Purpose`, `Brand Concept`) separated by vertical bar
- Large centered statement text

### 8. Logo Closing Slide

- White background
- CyberAgent logo centered (horizontal lockup)
- No other elements

## Visual Language

### Green Vertical Bar

A thin green vertical bar (`|`) is used as a separator in:
- Section header bars (between number and section name)
- Logo + label combinations (e.g., `CyberAgent | Vision`)

Color: `#298737` or `#82be28` depending on context.

### Section Numbers

- Format: two digits (`01`, `02`, `03`)
- Color: Green (`#298737`)
- Weight: Bold
- Used in: Agenda slides, section dividers, content slide headers

### Callout Boxes

- Light green background (`#E7F5E9`) with rounded corners
- Used for highlighting key concepts (side-by-side comparison boxes)
- Green text for labels within boxes

### Charts & Diagrams

- Use green palette: multiple shades of green for segments
- Donut charts preferred over pie charts
- Gray (`#F0F1F1`) backgrounds for code blocks or comparison boxes
- Green filled buttons/badges for action items or highlighted flow elements

### Anti-Patterns (from guideline)

- **Information overload**: Leave sufficient whitespace; keep text concise
- **Poor readability**: Stick to the defined color palette; don't introduce new colors
- **Copyright/confidential violations**: Always include copyright footer; add CONFIDENTIAL when sharing internally
