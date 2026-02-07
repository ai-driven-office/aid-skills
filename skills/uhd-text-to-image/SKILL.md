---
name: uhd-text-to-image
description: UHD image generation system. Generates images from text prompts using Seedream v4.5 (creative/photos/cute/artistic) or Nano Banana Pro (accurate text rendering/complex prompts/intelligent). Use when you need to generate, create, or produce images from descriptions. Includes session-based workflow with browser review picker, refinement loops, and finalization.
---

# UHD Image Generator

Generate images from text prompts using two best-in-class models. UHD provides a session-based workflow: generate, review in-browser, refine, and finalize.

## Workflow

```
 1. GENERATE          2. REVIEW           3. REFINE          4. FINALIZE
 ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
 │ AI crafts │──────>│ Browser  │──────>│ Regen    │──────>│ Copy to  │
 │ prompts + │       │ picker:  │       │ modified │       │ project  │
 │ generates │       │ keep /   │  ┌───>│ prompts  │       │ folder   │
 │ images    │       │ reject / │  │    │          │       │          │
 └──────────┘       │ regen    │──┘    └────┬─────┘       └──────────┘
                    └──────────┘            │
                         ^                  │
                         └──────────────────┘
                           review again
```

## Model Selection

| | Seedream v4.5 | Nano Banana Pro |
|---|---|---|
| **Endpoint** | `fal-ai/bytedance/seedream/v4.5/text-to-image` | `fal-ai/nano-banana-pro` |
| **Best for** | Photos, creative, cute, artistic, real content | Text in images, complex prompts, accuracy, professional |
| **Weakness** | Poor text rendering in images | Can feel generic/overused, less originality |
| **Cost** | $0.04/image | $0.15/image ($0.30 at 4K) |
| **Max images** | 6 per call | 4 per call |
| **Web search** | No | Yes (+$0.015) |
| **Text quality** | Poor | Excellent (multi-language, multi-font) |

### When to use which

- **Seedream**: photographs, portraits, landscapes, anime/illustration, cute characters, food photography, product lifestyle shots, artistic/painterly styles, anything where vibe matters more than precision
- **Nano Banana**: text/typography in images, infographics, diagrams, accurate multi-element scenes, professional/commercial, when following complex spatial instructions, when current real-world info is needed (web search)
- **Both**: generate with both to compare, especially for ambiguous tasks or when quality is critical

## Modes

### Normal Mode (default)

| Model | Setting |
|-------|---------|
| Seedream | `"image_size": "auto_2K"` |
| Nano Banana | `"resolution": "2K"` |

### Big / 4K Mode

| Model | Setting |
|-------|---------|
| Seedream | `"image_size": "auto_4K"` |
| Nano Banana | `"resolution": "4K"` (2x cost) |

## API Reference

> **Important:** Wrap curl commands using `$VAR` in `bash -c '...'` to prevent env var clearing in pipes.

### Setup

```bash
export FAL_KEY="your-api-key"
```

### Seedream v4.5 Parameters

```json
{
  "prompt": "required — the text description",
  "image_size": "auto_2K | auto_4K | square_hd | square | portrait_4_3 | portrait_16_9 | landscape_4_3 | landscape_16_9",
  "num_images": 1,
  "seed": null,
  "enable_safety_checker": true
}
```

### Nano Banana Pro Parameters

```json
{
  "prompt": "required — the text description (3-50,000 chars)",
  "resolution": "1K | 2K | 4K",
  "aspect_ratio": "1:1 | 16:9 | 9:16 | 4:3 | 3:4 | 3:2 | 2:3 | 5:4 | 4:5 | 21:9 | auto",
  "num_images": 1,
  "output_format": "png | jpeg | webp",
  "enable_web_search": false,
  "seed": null,
  "safety_tolerance": 4
}
```

## Session Storage

All generated images and metadata are stored in `.uhd/` (project-local, gitignored):

```
.uhd/
└── sessions/
    └── 20260207-143052-sunset/    # Session ID: YYYYMMDD-HHMMSS-<slug>
        ├── meta.json              # Jobs, results, costs, status
        ├── selections.json        # User choices from review
        └── images/                # All generated images
            ├── sunset-1.png
            └── sunset-2.png
```

## CLI Tool (Bun/TypeScript)

Full CLI for session-based generation, browser review, refinement loops, and finalization.

### Setup

```bash
cd skills/uhd-text-to-image/scripts && bun install
export FAL_KEY="your-api-key"
```

### Commands

```bash
# Generate from a single prompt (auto-selects model)
bun uhd.ts generate "A white kitten in a teacup" --num 2

# Force a specific model
bun uhd.ts generate "Badge with 'AI Summit'" -m banana --web-search

# Compare both models side-by-side
bun uhd.ts compare "A cozy cafe at sunset"

# Batch generate from a manifest file
bun uhd.ts batch manifest.json -c 4

# Open browser review picker (latest session)
bun uhd.ts review

# Regenerate images marked for regen in review
bun uhd.ts refine

# Copy selected images to project directory
bun uhd.ts finalize --dest ./images

# List all sessions
bun uhd.ts sessions

# Delete a session or all sessions
bun uhd.ts clean [session-id]
bun uhd.ts clean --all

# Preview cost without generating (dry-run)
bun uhd.ts generate "A sunset" --dry-run

# JSON output for automation (skips confirmation)
bun uhd.ts generate "A sunset" --json --yes
```

Every command shows a cost estimate and asks for confirmation before generating. Use `--yes` to skip (for agents), `--json` for structured output, or `--dry-run` to preview only.

### Auto-Model Selection

When `--model auto` (default), the CLI inspects the prompt for text-rendering cues (quoted strings, "typography", "badge", "infographic", etc.) and routes to **Banana** for text-heavy prompts or **Seedream** for everything else.

### Review Picker

`bun uhd.ts review` starts a local Bun HTTP server and auto-opens the browser. The dark-themed UI shows:
- Responsive grid of image cards with model badges
- Click any image for a lightbox view
- Three actions per card: **Keep** (green) / **Reject** (red) / **Regen** (yellow)
- Regen expands a panel with editable prompt and count selector
- Sticky summary bar with counts and "Save & Close" button

### Refinement Loop

1. After review, run `bun uhd.ts refine` to regenerate images marked "regen"
2. New images are generated in the same session with modified prompts
3. Run `bun uhd.ts review` again to see all images (originals + refined)
4. Repeat until satisfied

### Finalization

`bun uhd.ts finalize -d ./output` copies all "keep" images to the destination directory.

## Aspect Ratio Quick Reference

| Use Case | Seedream | Nano Banana |
|----------|----------|-------------|
| Square | `square_hd` | `1:1` |
| Landscape wide | `landscape_16_9` | `16:9` |
| Portrait tall | `portrait_16_9` | `9:16` |
| Photo standard | `landscape_4_3` | `4:3` |
| Ultrawide | — | `21:9` |


## Reference Files

| File | Content |
|------|---------|
| `reference/prompt-guide.md` | Detailed prompting techniques for both models |
