# Dark Theme Specifications

Token mappings for dark mode implementations.

## Surface Colors

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Surface Primary | `#ffffff` | `#08121a` (Gray 100) |
| Surface Secondary | `#f5f6f6` (Gray 5) | `#141e25` (Gray 90) |
| Surface Tertiary | `#ebeced` (Gray 10) | `#394148` (Gray 80) |
| Surface Elevated | `#ffffff` | `#141e25` (Gray 90) |

## Text Colors

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Text Primary | `#08121a` (Gray 100) | `#ffffff` |
| Text Secondary | `#464d53` (Gray 70) | `#b5b8ba` (Gray 30) |
| Text Tertiary | `#686e73` (Gray 60) | `#9ca0a3` (Gray 40) |
| Text Disabled | `#9ca0a3` (Gray 40) | `#686e73` (Gray 60) |
| Text Inverse | `#ffffff` | `#08121a` |

## Brand Colors in Dark Mode

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Brand Primary | `#2d8c3c` (Ameba Green) | `#41ad4f` (Primary Green 50) |
| Brand Secondary | `#82be28` (Yellow Green) | `#95c84d` (Secondary Green 40) |
| Brand Surface | `#e7f5e9` (Primary Green 5) | `#186b27` (Primary Green 90) |

## Interactive States

### Light Mode

| State | Color |
|-------|-------|
| Default | `#2d8c3c` |
| Hover | `#237b31` (Primary Green 80) |
| Active | `#186b27` (Primary Green 90) |
| Focus Ring | `#0091ff` (Focus Blue) |

### Dark Mode

| State | Color |
|-------|-------|
| Default | `#41ad4f` (Primary Green 50) |
| Hover | `#5eb969` (Primary Green 40) |
| Active | `#7bc583` (Primary Green 30) |
| Focus Ring | `#0091ff` (Focus Blue) |

## Border Colors

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Border Default | `#d8d9da` (Gray 20) | `#464d53` (Gray 70) |
| Border Strong | `#b5b8ba` (Gray 30) | `#686e73` (Gray 60) |
| Border Subtle | `#ebeced` (Gray 10) | `#394148` (Gray 80) |

## Semantic Colors in Dark Mode

### Caution/Error

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Caution Primary | `#d91c0b` | `#ff6a59` (Vivid) |
| Caution Surface | `#d91c0b0d` (5 alpha) | `#ff6a5933` (20 alpha) |

### Rating/Warning

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Rating Primary | `#ee7b00` | `#ee7b00` |
| Rating Surface | `#ee7b000d` (5 alpha) | `#ee7b0033` (20 alpha) |

### Focus/Info

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Focus Primary | `#0091ff` | `#0091ff` |
| Focus Ring | `#0091ff4d` (30 alpha) | `#0091ff4d` (30 alpha) |

## Shadow Tokens

### Light Mode

```css
/* Level 2 - Cards */
box-shadow: 0 2px 4px rgba(8, 18, 26, 0.08);

/* Level 4 - Dropdowns */
box-shadow: 0 4px 8px rgba(8, 18, 26, 0.12);

/* Level 6 - Modals */
box-shadow: 0 8px 16px rgba(8, 18, 26, 0.16);
```

### Dark Mode

```css
/* Level 2 - Cards */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.24);

/* Level 4 - Dropdowns */
box-shadow: 0 4px 8px rgba(0, 0, 0, 0.32);

/* Level 6 - Modals */
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.40);
```

## Dark Mode Theme Preset

For presentations and documents:

| Role | Hex |
|------|-----|
| Background | `#08121a` |
| Surface | `#141e25` |
| Accent | `#41ad4f` |
| Text Primary | `#ffffff` |
| Text Secondary | `#b5b8ba` |
| Border | `#464d53` |

## Implementation Notes

1. **Contrast ratios**: Ensure 4.5:1 minimum for body text, 3:1 for large text
2. **Color inversion**: Don't simply invert colors; use semantic mappings above
3. **Images**: Consider adding subtle dark overlays or using alternative assets
4. **Transitions**: Use `prefers-color-scheme` media query for automatic switching
5. **Testing**: Verify readability at various brightness levels
