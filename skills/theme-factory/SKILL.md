---
name: theme-factory
description: Toolkit for styling artifacts with CyberAgent/Ameba Spindle design system themes. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts based on Spindle tokens that you can apply to any artifact, or can generate a new theme on-the-fly.
license: Complete terms in LICENSE.txt
---


# Theme Factory Skill

This skill provides a curated collection of professional font and color themes based on CyberAgent's Spindle design system. Each theme uses carefully selected color palettes from official Spindle tokens and Meiryo font pairings. Once a theme is chosen, it can be applied to any artifact.

## Purpose

To apply consistent, professional styling to presentation slide decks, use this skill. Each theme includes:
- A cohesive color palette with hex codes
- Complementary font pairings for headers and body text
- A distinct visual identity suitable for different contexts and audiences

## Usage Instructions

To apply styling to a slide deck or other artifact:

1. **Show the theme showcase**: Display the `theme-showcase.pdf` file to allow users to see all available themes visually. Do not make any modifications to it; simply show the file for viewing.
2. **Ask for their choice**: Ask which theme to apply to the deck
3. **Wait for selection**: Get explicit confirmation about the chosen theme
4. **Apply the theme**: Once a theme has been chosen, apply the selected theme's colors and fonts to the deck/artifact

## Themes Available

The following 10 themes are available, each based on CyberAgent's Spindle design system:

1. **Ameba Green** - Official CyberAgent/Ameba brand theme with signature green
2. **Fresh Lime** - Energetic, vibrant theme using Yellow Green accents
3. **Deep Green** - Sophisticated, executive theme with dark green tones
4. **Neutral Pro** - Clean, versatile theme with minimal color accents
5. **Warm Sunset** - Warm, inviting theme with Expressive Orange palette
6. **Ocean Digital** - Cool, trustworthy theme with Expressive Blue palette
7. **Uranai Purple** - Mystical theme for the Uranai sub-brand
8. **Teal Growth** - Fresh, modern theme with Expressive Teal palette
9. **Vibrant Energy** - Bold, dynamic theme with Expressive Pink palette
10. **Dark Mode** - Premium dark theme for high-impact presentations

## Theme Details

Each theme is defined in the `themes/` directory with complete specifications including:
- Cohesive color palette with hex codes
- Complementary font pairings for headers and body text
- Distinct visual identity suitable for different contexts and audiences

## Application Process

After a preferred theme is selected:
1. Read the corresponding theme file from the `themes/` directory
2. Apply the specified colors and fonts consistently throughout the deck
3. Ensure proper contrast and readability
4. Maintain the theme's visual identity across all slides

## Create your Own Theme
To handle cases where none of the existing themes work for an artifact, create a custom theme. Based on provided inputs, generate a new theme similar to the ones above. Give the theme a similar name describing what the font/color combinations represent. Use any basic description provided to choose appropriate colors/fonts. After generating the theme, show it for review and verification. Following that, apply the theme as described above.
