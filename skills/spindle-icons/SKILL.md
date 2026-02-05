---
name: spindle-icons
description: Access to 374 Spindle design system icons for CyberAgent/Ameba branded content. Use when adding icons to presentations, designs, documents, or UI components needing CyberAgent brand iconography.
license: Creative Commons BY-NC-ND 4.0 (icons), MIT (source). Complete terms in LICENSE.txt
---

# Spindle Icons

The official icon library from CyberAgent's Spindle design system with 374 icons.

## Installation

```bash
# For SVG icons
npm install @openameba/spindle-icons

# For React components
npm install @openameba/spindle-ui
```

## Icon Location

After installation, icons are available at:
```
node_modules/@openameba/spindle-icons/dist/svg/
```

## Icon Naming Convention

- Lowercase with underscores: `arrow_right`, `person_fill`
- `_fill` suffix: Solid/filled variant
- `_bold` suffix: Heavier stroke weight
- `_slash` suffix: Disabled/crossed-out state
- `_circle` suffix: Circular container

## Quick Reference

### Navigation

| Icon | Name | Usage |
|------|------|-------|
| ← | `arrow_left` | Back navigation |
| → | `arrow_right` | Forward navigation |
| ↑ | `arrow_up` | Upward action |
| ↓ | `arrow_down` | Downward action |
| ‹ | `chevron_left` | Collapse/previous |
| › | `chevron_right` | Expand/next |
| ⌂ | `home_fill` | Home/dashboard |
| ☰ | `menu_hamburger` | Menu toggle |

### Actions

| Icon | Name | Usage |
|------|------|-------|
| + | `plus` | Add/create |
| × | `cross` | Close/remove |
| ✓ | `check` | Confirm/complete |
| ↻ | `refresh` | Reload/update |
| ↩ | `undo` | Undo action |
| ↪ | `redo` | Redo action |
| ⬇ | `download` | Download file |
| ✎ | `pencil` | Edit |
| 🗑 | `trashcan` | Delete |

### Content

| Icon | Name | Usage |
|------|------|-------|
| 📄 | `article` | Document/post |
| 🖼 | `image_fill` | Image/photo |
| 📁 | `folder` | Folder/category |
| 📄 | `file` | Generic file |
| 🔗 | `link` | Hyperlink |
| 🔖 | `bookmark` | Save/bookmark |
| ❤ | `heart` | Like/favorite |
| ⭐ | `star` | Rating/featured |

### Social

| Icon | Name | Usage |
|------|------|-------|
| 👤 | `person` | User profile |
| 👥 | `person_two_fill` | Multiple users |
| 💬 | `comment` | Comments |
| ✉ | `mail` | Email/message |
| 🔔 | `bell` | Notifications |
| 📤 | `share` | Share content |

### Ameba Specific

| Icon | Name | Usage |
|------|------|-------|
| 📝 | `blog` | Blog/Ameba Blog |
| 🪙 | `amebacoin` | Ameba Coin |
| 🛍 | `amebapick` | Ameba Pick |
| 👤 | `amember` | Ameba Member |
| 📺 | `abematv` | ABEMA TV |
| 🐸 | `abemakun` | ABEMA mascot |
| ⭐ | `officialstar` | Official account |
| 🏆 | `topblogger_medal` | Top blogger |

## Size Guidelines

| Context | Size | Usage |
|---------|------|-------|
| Inline | 16px | Within text |
| Standard | 24px | Default UI |
| Touch | 32px | Mobile targets |
| Feature | 48px | Hero elements |

## Color Application

Icons inherit color from `currentColor`. Apply Spindle colors:

| Context | Color | Hex |
|---------|-------|-----|
| Default | Gray 60 | `#686e73` |
| Active | Ameba Green | `#2d8c3c` |
| Hover | Primary Green 80 | `#237b31` |
| Disabled | Gray 40 | `#9ca0a3` |
| Error | Caution Red | `#d91c0b` |

## Usage in Different Contexts

### Web/HTML (img element)

```html
<button>
  <img alt="Settings" height="24" role="img"
       src="https://unpkg.com/@openameba/spindle-icons/dist/svg/clock.svg" width="24">
</button>
```

### Inline SVG

For color control, embed SVG directly:
```html
<button aria-label="Settings">
  <!-- Include SVG content from node_modules/@openameba/spindle-icons/dist/svg/clock.svg -->
</button>
```

### React Components

```javascript
import Clock from '@openameba/spindle-ui/Icon/Clock';

export function SomeButton() {
  return <button aria-label="Settings" type="button"><Clock /></button>
}
```

### SVG Sprite

Generate a sprite with only needed icons:
```bash
npx svg-sprite --symbol --symbol-dest=. --symbol-sprite=sprite.svg \
  'node_modules/@openameba/spindle-icons/dist/svg/+(check|clock).svg'
```

### Presentations (PPTX)

Copy icons from installed package to working directory:
```bash
cp node_modules/@openameba/spindle-icons/dist/svg/check.svg ./
```

### Design Tools

Import SVG files from `node_modules/@openameba/spindle-icons/dist/svg/` into Figma, Sketch, or Adobe tools.

## Reference

See `reference/icon-catalog.md` for the complete list of all 374 icons organized by category.
