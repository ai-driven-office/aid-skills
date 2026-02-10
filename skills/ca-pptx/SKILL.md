---
name: ca-pptx
description: "Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions \"deck,\" \"slides,\" \"presentation,\" or references a .pptx filename, regardless of what they plan to do with the content afterward. If a .pptx file needs to be opened, created, or touched, use this skill."
license: Proprietary. LICENSE.txt has complete terms
---

# PPTX Skill

## Quick Reference

| Task | Guide |
|------|-------|
| Read/analyze content | `python -m markitdown presentation.pptx` |
| Edit or create from template | Read [editing.md](editing.md) |
| Create from scratch | Read [pptxgenjs.md](pptxgenjs.md) |

---

## Reading Content

```bash
# Text extraction
python -m markitdown presentation.pptx

# Visual overview
python scripts/thumbnail.py presentation.pptx

# Raw XML
python scripts/office/unpack.py presentation.pptx unpacked/
```

---

## Editing Workflow

**Read [editing.md](editing.md) for full details.**

1. Analyze template with `thumbnail.py`
2. Unpack → manipulate slides → edit content → clean → pack

---

## Creating from Scratch

**Read [pptxgenjs.md](pptxgenjs.md) for full details.**

Use when no template or reference presentation is available.

---

## Template Mode

Presentations follow one of two brand templates. Determine which to use based on context:

| Mode | When to Use | Template Spec |
|------|-------------|---------------|
| **CyberAgent** (default) | General CA presentations, cross-company materials, external stakeholder decks | [ca-slide-template.md](reference/ca-slide-template.md) |
| **AID** | AIドリブン推進室 presentations, AI-focused internal decks, AID team materials | [aid-slide-template.md](reference/aid-slide-template.md) |

**How to detect**: If the user mentions AID, AIドリブン推進室, AI Driven Office, or the content is specifically about AID initiatives, use the AID template. Otherwise default to CyberAgent.

### What Changes Between Modes

| Element | CyberAgent | AID |
|---------|------------|-----|
| Accent color | Green (`82be28` / `298737`) | Blue-to-Red gradient (`3370FE` → `FF0413`) |
| Emphasis text | Green (`298737`) | AID Blue (`3370FE`) or AID Red (`FF0413`) |
| Separator bars | Green solid | Blue-to-Red gradient |
| Logo | CyberAgent logo (`reference/logos/cyberagent/`) | AID logomark (`reference/logos/aid/`) |
| Title slide bg | White (default) | Dark `0A0A0A` (preferred) or white |
| Callout boxes | Pale green `E7F5E9` | Light blue `E8EEFF` |
| Section numbers | Green `298737` | AID Blue `3370FE` |
| Footer | `©CyberAgent, Inc. All Rights Reserved` | `©CyberAgent, Inc. AIドリブン推進室` |
| Dark slides | Blue-gray `1E2430` bg | Near-black `0A0A0A` bg |
| Charts | Green shades | Blue, Red, Magenta, Purple |

Typography, text sizes, spacing, and margins are shared between both modes.

---

## Design Ideas

**Don't create boring slides.** Plain bullets on a white background won't impress anyone. Consider ideas from this list for each slide.

### Before Starting

- **Determine template mode**: CyberAgent (default) or AID — see [Template Mode](#template-mode) above. This sets your base palette, logos, and visual language.
- **Pick a bold, content-informed color palette**: The palette should feel designed for THIS topic. If swapping your colors into a completely different presentation would still "work," you haven't made specific enough choices.
- **Dominance over equality**: One color should dominate (60-70% visual weight), with 1-2 supporting tones and one sharp accent. Never give all colors equal weight.
- **Dark/light contrast**: Dark backgrounds for title + conclusion slides, light for content ("sandwich" structure). Or commit to dark throughout for a premium feel.
- **Commit to a visual motif**: Pick ONE distinctive element and repeat it — rounded image frames, icons in colored circles, thick single-side borders. Carry it across every slide.

### Color Palettes

Note: PPTX hex codes omit the `#` prefix.

**Default: CyberAgent Official Slide Colors** (from the official slide guideline template)

| Role | Color | Hex |
|------|-------|-----|
| Background — White | White | `ffffff` |
| Background — Gray | Light Gray | `F0F1F1` |
| Background — Green | Pale Green | `E7F5E9` |
| Accent | Yellow Green | `82be28` |
| Text — Primary | Black | `000000` |
| Text — Emphasis | Green | `298737` |
| Text — Secondary | Gray | `485055` |

Use this palette by default for all CyberAgent presentations. Limit colors and use green as the base accent for visual consistency.

**AID (AI Driven Office) Override** — when creating for AIドリブン推進室

| Role | Color | Hex |
|------|-------|-----|
| Background — White | White | `ffffff` |
| Background — Dark | Near Black | `0A0A0A` |
| Accent — Primary | AID Blue | `3370FE` |
| Accent — Secondary | AID Red | `FF0413` |
| Accent — Midpoint | AID Magenta | `E0247A` |
| Text — Primary (light bg) | Black | `000000` |
| Text — Primary (dark bg) | White | `ffffff` |
| Gradient | Blue → Red | `linear-gradient(135deg, 3370FE, FF0413)` |

**Spindle Design System Themes** (for topic-specific presentations)

| Theme | Primary | Secondary | Accent | Background | Text |
|-------|---------|-----------|--------|------------|------|
| **Ameba Green** | `2d8c3c` | `e7f5e9` | `82be28` | `ffffff` | `08121a` |
| **Deep Green** | `0f5c1f` | `c6e5c9` | `298737` | `ffffff` | `08121a` |
| **Fresh Lime** | `82be28` | `f0f7e6` | `477d00` | `ffffff` | `08121a` |
| **Uranai Purple** | `391e66` | `eee8f4` | `743faa` | `ffffff` | `08121a` |
| **Ocean Digital** | `203957` | `e3f4fa` | `4da2d6` | `ffffff` | `08121a` |
| **Teal Growth** | `003d2c` | `e0f5f1` | `00a688` | `ffffff` | `08121a` |
| **Neutral Pro** | `08121a` | `f5f6f6` | `2d8c3c` | `ffffff` | `08121a` |
| **Dark Mode** | `08121a` | `141e25` | `41ad4f` | `08121a` | `ffffff` |
| **Warm Sunset** | `8a2701` | `f6e7e5` | `de4d14` | `ffffff` | `08121a` |
| **Vibrant Pink** | `630f33` | `fce4e9` | `e02c53` | `ffffff` | `08121a` |

### For Each Slide

**Every slide needs a visual element** — image, chart, icon, or shape. Text-only slides are forgettable.

**Layout options:**
- Two-column (text left, illustration on right)
- Icon + text rows (icon in colored circle, bold header, description below)
- 2x2 or 2x3 grid (image on one side, grid of content blocks on other)
- Half-bleed image (full left or right side) with content overlay

**Data display:**
- Large stat callouts (big numbers 60-72pt with small labels below)
- Comparison columns (before/after, pros/cons, side-by-side options)
- Timeline or process flow (numbered steps, arrows)

**Visual polish:**
- Icons in small colored circles next to section headers
- Italic accent text for key stats or taglines

### Typography (CyberAgent Official)

**Primary fonts** (from the official CA slide guideline):

| Context | Font | Type |
|---------|------|------|
| Japanese text | **M PLUS 1p** | Google Font — gothic sans-serif. Must be installed. |
| English text | **Arial** | System font — cross-platform compatible. |

M PLUS 1p is the official CA presentation font. It requires installation from Google Fonts. If unavailable, fall back to Meiryo (Bold for headers).

**Text sizes** (official CA recommended scale):

| Element | Size | Weight |
|---------|------|--------|
| ワンセンテンス (Headline) | 24pt | Bold |
| 大見出し (Major Heading) | 18pt | Bold |
| 中見出し (Sub-Heading) | 14pt | Bold |
| 文章 (Body Text) | 12pt | Regular |
| 注釈 (Notes/Captions) | 8pt | Regular |

Recommended size stops: **8, 12, 14, 18, 24** pt. Adjust as needed for the slide design, but prefer these values.

**Emphasis**: Use green text (`298737`) for key terms (CyberAgent mode) or AID Blue (`3370FE`) / AID Red (`FF0413`) for key terms (AID mode) — not bold alone.

**AID display override**: For AID mode English headlines and display text, prefer **Inter Black** or **Archivo Black** (weight 900). Fall back to **Arial Black** if unavailable. Body text and Japanese text remain M PLUS 1p / Arial.

### Spacing & Layout

- **30px (~0.42") minimum margins** on all four sides (CA guideline standard)
- 0.3-0.5" between content blocks
- Leave breathing room — don't fill every inch
- **Line spacing**: 1.15 lines (CA standard for Google Slides; adjust for PPT if needed)
- **Text alignment**: Left-align by default. Center only for titles and short single-line text.
- **Headings**: Keep to 1 line. Max 4-5 points per slide.
- **Supplementary text**: Use smaller font (8pt notes) below headings

### Slide Structure

Follow the slide template layout for the selected mode. See the full spec in the template reference files.

**CyberAgent mode** ([ca-slide-template.md](reference/ca-slide-template.md)):

- **Title slide**: CyberAgent logo (top-left), large title text, subtitle, date (`YYYY.MM.DD`), copyright footer
- **Agenda slide**: Green "AGENDA" header + numbered items (green `01`, `02`, etc.)
- **Section divider**: Green section number + title, centered vertically on white background
- **Content slides**: Section header bar at top (`NN` | `セクション名` with green vertical bar separator), content below
- **Footer**: `©CyberAgent, Inc. All Rights Reserved` centered at bottom, page number bottom-right
- **Confidential slides**: Add `CONFIDENTIAL` badge (outlined box, green border) at top-right
- **Closing slide**: Centered CyberAgent logo on white background

**AID mode** ([aid-slide-template.md](reference/aid-slide-template.md)):

- **Title slide**: Dark bg (`0A0A0A`) preferred — AID logomark top-left, white title text, gradient bar accent
- **Agenda slide**: "AGENDA" in AID Blue (`3370FE`), numbered items with blue numbers
- **Section divider**: Dark or light — blue section number, optional gradient bar
- **Content slides**: Section header with gradient vertical bar (blue-to-red) replacing green bar
- **Key visual slide**: Full-bleed gradient background with large white headline
- **"AI := ___" slide**: Expandable logo format for campaign/event themes
- **Footer**: `©CyberAgent, Inc. AIドリブン推進室` in muted gray
- **Closing slide**: AID logomark centered on dark or white background

### Avoid (Common Mistakes)

- **Don't repeat the same layout** — vary columns, cards, and callouts across slides
- **Don't center body text** — left-align paragraphs and lists; center only titles
- **Don't skimp on size contrast** — titles need 18-24pt to stand out from 12pt body
- **Don't default to blue** — pick colors that reflect the specific topic
- **Don't mix spacing randomly** — choose 0.3" or 0.5" gaps and use consistently
- **Don't style one slide and leave the rest plain** — commit fully or keep it simple throughout
- **Don't create text-only slides** — add images, icons, charts, or visual elements; avoid plain title + bullets
- **Don't forget text box padding** — when aligning lines or shapes with text edges, set `margin: 0` on the text box or offset the shape to account for padding
- **Don't use low-contrast elements** — icons AND text need strong contrast against the background; avoid light text on light backgrounds or dark text on dark backgrounds
- **NEVER use accent lines under titles** — these are a hallmark of AI-generated slides; use whitespace or background color instead

---

## QA (Required)

**Assume there are problems. Your job is to find them.**

Your first render is almost never correct. Approach QA as a bug hunt, not a confirmation step. If you found zero issues on first inspection, you weren't looking hard enough.

### Content QA

```bash
python -m markitdown output.pptx
```

Check for missing content, typos, wrong order.

**When using templates, check for leftover placeholder text:**

```bash
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide).*layout"
```

If grep returns results, fix them before declaring success.

### Visual QA

**⚠️ USE SUBAGENTS** — even for 2-3 slides. You've been staring at the code and will see what you expect, not what's there. Subagents have fresh eyes.

Convert slides to images (see [Converting to Images](#converting-to-images)), then use this prompt:

```
Visually inspect these slides. Assume there are issues — find them.

Look for:
- Overlapping elements (text through shapes, lines through words, stacked elements)
- Text overflow or cut off at edges/box boundaries
- Decorative lines positioned for single-line text but title wrapped to two lines
- Source citations or footers colliding with content above
- Elements too close (< 0.3" gaps) or cards/sections nearly touching
- Uneven gaps (large empty area in one place, cramped in another)
- Insufficient margin from slide edges (< 0.42" / 30px)
- Columns or similar elements not aligned consistently
- Low-contrast text (e.g., light gray text on cream-colored background)
- Low-contrast icons (e.g., dark icons on dark backgrounds without a contrasting circle)
- Text boxes too narrow causing excessive wrapping
- Leftover placeholder content

For each slide, list issues or areas of concern, even if minor.

Read and analyze these images:
1. /path/to/slide-01.jpg (Expected: [brief description])
2. /path/to/slide-02.jpg (Expected: [brief description])

Report ALL issues found, including minor ones.
```

### Verification Loop

1. Generate slides → Convert to images → Inspect
2. **List issues found** (if none found, look again more critically)
3. Fix issues
4. **Re-verify affected slides** — one fix often creates another problem
5. Repeat until a full pass reveals no new issues

**Do not declare success until you've completed at least one fix-and-verify cycle.**

---

## Converting to Images

Convert presentations to individual slide images for visual inspection:

```bash
python scripts/office/soffice.py --headless --convert-to pdf output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

This creates `slide-01.jpg`, `slide-02.jpg`, etc.

To re-render specific slides after fixes:

```bash
pdftoppm -jpeg -r 150 -f N -l N output.pdf slide-fixed
```

---

## Reference Files

| File | Content |
|------|---------|
| `reference/ca-slide-template.md` | CyberAgent slide specs: slide types, layout patterns, colors, typography |
| `reference/aid-slide-template.md` | AID slide specs: dark themes, gradient accents, blue-red palette |
| `reference/cyberagent_guideline_slide_template.pptx` | Official CA slide template — use as base for template-based editing |
| `reference/cyberagent_guideline_slide_template.pdf` | PDF version for visual reference |
| `reference/logos/cyberagent/` | CyberAgent logos (standard + white variants) |
| `reference/logos/aid/` | AID logos (logomark "AI := Driven" + symbol mark `:=`, RGB + CMYK) |

When creating from scratch, read the appropriate template spec (`ca-slide-template.md` or `aid-slide-template.md`) based on the selected template mode. When editing from a template, prefer using `cyberagent_guideline_slide_template.pptx` as the base.

---

## Dependencies

- `pip install "markitdown[pptx]"` - text extraction
- `pip install Pillow` - thumbnail grids
- `npm install -g pptxgenjs` - creating from scratch
- LibreOffice (`soffice`) - PDF conversion (auto-configured for sandboxed environments via `scripts/office/soffice.py`)
- Poppler (`pdftoppm`) - PDF to images
