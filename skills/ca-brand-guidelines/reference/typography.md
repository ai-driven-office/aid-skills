# Typography Specifications

Complete font specifications for CyberAgent/Ameba branded content.

## Primary Font Stack

### Japanese Content

```css
font-family: "Meiryo", "Yu Gothic Medium", "Hiragino Sans", system-ui, -apple-system, sans-serif;
```

| Context | Font | Weight |
|---------|------|--------|
| Display Headlines | Meiryo | Bold (700) |
| Section Headers | Meiryo | Bold (700) |
| Body Text | Meiryo | Regular (400) |
| Captions | Meiryo | Regular (400) |

### English Content

```css
font-family: "Calibri", "Arial", system-ui, -apple-system, sans-serif;
```

| Context | Font | Weight |
|---------|------|--------|
| Display Headlines | Arial Black | Bold (900) |
| Section Headers | Calibri Bold | Bold (700) |
| Body Text | Calibri | Regular (400) |
| Captions | Calibri | Regular (400) |

## Font Pairings

### Professional

| Headers | Body |
|---------|------|
| Meiryo Bold | Meiryo |
| Arial Black | Calibri |
| Calibri Bold | Calibri Light |

### Modern

| Headers | Body |
|---------|------|
| Yu Gothic Bold | Yu Gothic Medium |
| Trebuchet MS Bold | Calibri |

### Elegant

| Headers | Body |
|---------|------|
| Cambria Bold | Calibri |
| Georgia Bold | Arial |

## Size Scale

### Web/Screen

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| display-xl | 60px | 1.1 | Hero headlines |
| display-lg | 48px | 1.2 | Page titles |
| h1 | 36px | 1.25 | Primary headings |
| h2 | 28px | 1.3 | Section headings |
| h3 | 24px | 1.35 | Subsection headings |
| h4 | 20px | 1.4 | Card titles |
| body-lg | 18px | 1.6 | Lead paragraphs |
| body | 16px | 1.6 | Body text |
| body-sm | 14px | 1.5 | Secondary text |
| caption | 12px | 1.4 | Captions, labels |
| micro | 10px | 1.3 | Legal, footnotes |

### Presentations (PPTX)

| Element | Size (pt) | Weight |
|---------|-----------|--------|
| Slide Title | 36-44 | Bold |
| Section Header | 24-28 | Bold |
| Body Text | 14-16 | Regular |
| Bullet Points | 14-16 | Regular |
| Captions | 10-12 | Regular |
| Footnotes | 8-10 | Regular |

### Print

| Element | Size (pt) | Weight |
|---------|-----------|--------|
| Display | 48-72 | Bold |
| H1 | 24-36 | Bold |
| H2 | 18-24 | Bold |
| Body | 10-12 | Regular |
| Caption | 8-9 | Regular |

## Character Spacing

| Context | Letter Spacing |
|---------|----------------|
| Headlines | -0.02em |
| Body Text | 0 |
| All Caps | 0.05em |
| Small Text | 0.01em |

## Japanese Text Considerations

### Line Breaking

- Allow line breaks between kanji
- Avoid orphaned particles (は、が、を) at line start
- Minimum 2 characters before break

### Spacing

- No extra spacing between CJK characters
- Add thin space between CJK and Latin characters
- Remove word-spacing for Japanese text

### Font Fallback Order

1. Meiryo (Windows primary)
2. Yu Gothic Medium (Windows secondary)
3. Hiragino Sans (macOS)
4. Noto Sans CJK JP (Cross-platform)
5. system-ui (System default)

## Cross-Platform Compatibility

### Windows

```css
font-family: "Meiryo", "Yu Gothic Medium", "MS Gothic", sans-serif;
```

### macOS

```css
font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif;
```

### Universal

```css
font-family: "Noto Sans CJK JP", "Noto Sans JP", sans-serif;
```

## Font Loading Strategy

For web implementations:

1. Use `font-display: swap` for body text
2. Use `font-display: optional` for decorative fonts
3. Preload primary fonts
4. Subset fonts for Japanese (JIS X 0208 coverage)
