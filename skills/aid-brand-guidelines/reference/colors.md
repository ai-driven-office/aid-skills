# AID Color Reference

AID-specific color tokens. For gray scales, semantic colors, and third-party colors, use `ca-brand-guidelines` tokens.

## Brand Colors

| Name | Hex | Role |
|------|-----|------|
| AID Red | `#FF0413` | Primary — energy, action |
| AID Blue | `#3370FE` | Primary — intelligence, origin |
| AID Magenta | `#E0247A` | Gradient midpoint — transition |
| AID Purple | `#8A3CB8` | Gradient midpoint — depth |

## AID Red Scale

| Token | Hex |
|-------|-----|
| AID Red 100 | `#8A020A` |
| AID Red 90 | `#A5030C` |
| AID Red 80 | `#CC040F` |
| AID Red 70 | `#E50412` |
| AID Red 60 | `#FF0413` |
| AID Red 50 | `#FF2D3A` |
| AID Red 40 | `#FF5660` |
| AID Red 30 | `#FF8087` |
| AID Red 20 | `#FFAAB0` |
| AID Red 10 | `#FFD5D7` |
| AID Red 5 | `#FFEBEC` |

## AID Blue Scale

| Token | Hex |
|-------|-----|
| AID Blue 100 | `#1A3A8A` |
| AID Blue 90 | `#2048A5` |
| AID Blue 80 | `#2858C0` |
| AID Blue 70 | `#2D64D9` |
| AID Blue 60 | `#3370FE` |
| AID Blue 50 | `#5C8DFE` |
| AID Blue 40 | `#7BA3FE` |
| AID Blue 30 | `#9BBAFF` |
| AID Blue 20 | `#BDD2FF` |
| AID Blue 10 | `#DEE8FF` |
| AID Blue 5 | `#EFF4FF` |

## AID Gradient Stops

Standard 4-stop gradient from Blue → Red:

| Position | Hex | Name |
|----------|-----|------|
| 0% | `#3370FE` | AID Blue |
| 40% | `#8A3CB8` | AID Purple |
| 70% | `#E0247A` | AID Magenta |
| 100% | `#FF0413` | AID Red |

```css
/* Standard AID gradient */
background: linear-gradient(135deg, #3370FE 0%, #8A3CB8 40%, #E0247A 70%, #FF0413 100%);

/* Simplified two-stop */
background: linear-gradient(135deg, #3370FE, #FF0413);
```

Direction is always **bottom-left → top-right** (135deg). Blue anchors the cool/origin side, Red anchors the warm/action side.

## Theme Color Mappings

| Theme | Primary | Secondary | Accent | Background |
|-------|---------|-----------|--------|------------|
| AID Gradient | `#3370FE` | `#FF0413` | `#E0247A` | `#ffffff` |
| AID Dark | `#3370FE` | `#FF0413` | `#E0247A` | `#0A0A0A` |
| AID Blue | `#3370FE` | `#E8EEFF` | `#FF0413` | `#ffffff` |
| AID Red | `#FF0413` | `#FFE5E7` | `#3370FE` | `#ffffff` |
| AID Mono | `#000000` | `#F5F5F5` | `#3370FE` | `#ffffff` |
| AID Night | `#5C8DFE` | `#FF3640` | `#C055E0` | `#08121a` |

## Inherited from CyberAgent

Use `ca-brand-guidelines` for:
- Gray scale (solid and alpha variants)
- White/Black alpha scales
- Semantic colors (Caution Red, Rating Orange, Focus Blue, Highlight Yellow)
- Third-party platform colors
- Expressive color scales
