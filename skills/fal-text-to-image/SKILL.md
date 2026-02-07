---
name: fal-text-to-image
description: AI image generation using fal.ai. Generates images from text prompts using Seedream v4.5 (creative/photos/cute/artistic) or Nano Banana Pro (accurate text rendering/complex prompts/intelligent). Use when you need to generate, create, or produce images from descriptions.
vm0_secrets:
  - FAL_KEY
---

# fal.ai Image Generator

Generate images from text prompts using two best-in-class models. Choose the right model for the job, set your mode, and generate.

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
mkdir -p /tmp/fal
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

## Usage — curl

### Seedream: Generate a creative image

Write to `/tmp/fal/request.json`:

```json
{
  "prompt": "A white kitten sleeping inside a teacup on a sunlit windowsill, soft bokeh background, warm golden light, shallow depth of field, 85mm lens",
  "image_size": "auto_2K",
  "num_images": 1
}
```

Then:

```bash
bash -c 'curl -s -X POST "https://fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image" -H "Authorization: Key ${FAL_KEY}" -H "Content-Type: application/json" -d @/tmp/fal/request.json' > /tmp/fal/response.json
```

### Nano Banana: Generate with text and web search

Write to `/tmp/fal/request.json`:

```json
{
  "prompt": "A professional conference badge design with the text 'AI Summit 2026' in bold sans-serif, blue gradient background, modern tech aesthetic",
  "resolution": "2K",
  "aspect_ratio": "3:4",
  "num_images": 1,
  "enable_web_search": true
}
```

Then:

```bash
bash -c 'curl -s -X POST "https://fal.run/fal-ai/nano-banana-pro" -H "Authorization: Key ${FAL_KEY}" -H "Content-Type: application/json" -d @/tmp/fal/request.json' > /tmp/fal/response.json
```

### Extract image URL and download

```bash
bash -c 'cat /tmp/fal/response.json | jq -r ".images[0].url"'
```

```bash
bash -c 'cat /tmp/fal/response.json | jq -r ".images[0].url" | xargs curl -sL -o /tmp/fal/image.png'
```

### Batch: Generate 4 images at 4K

Write to `/tmp/fal/request.json`:

```json
{
  "prompt": "Abstract geometric art, neon blue and magenta on black, flowing particles",
  "image_size": "auto_4K",
  "num_images": 4
}
```

```bash
bash -c 'curl -s -X POST "https://fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image" -H "Authorization: Key ${FAL_KEY}" -H "Content-Type: application/json" -d @/tmp/fal/request.json' > /tmp/fal/response.json
```

Download all images from the response:

```bash
bash -c 'for i in $(seq 0 3); do url=$(jq -r ".images[$i].url" /tmp/fal/response.json); [ "$url" != "null" ] && curl -sL -o "/tmp/fal/image_${i}.png" "$url" && echo "Saved image_${i}.png"; done'
```

### Generate with both models (comparison)

Write Seedream request to `/tmp/fal/req_seedream.json` and Nano Banana request to `/tmp/fal/req_banana.json`, then run both:

```bash
bash -c 'curl -s -X POST "https://fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image" -H "Authorization: Key ${FAL_KEY}" -H "Content-Type: application/json" -d @/tmp/fal/req_seedream.json' > /tmp/fal/resp_seedream.json &
bash -c 'curl -s -X POST "https://fal.run/fal-ai/nano-banana-pro" -H "Authorization: Key ${FAL_KEY}" -H "Content-Type: application/json" -d @/tmp/fal/req_banana.json' > /tmp/fal/resp_banana.json &
wait
```

## Usage — Node.js SDK

For batch operations or better error handling, use the `@fal-ai/client` npm package.

```bash
npm install @fal-ai/client
```

```js
import { fal } from "@fal-ai/client";

// Seedream
const result = await fal.subscribe("fal-ai/bytedance/seedream/v4.5/text-to-image", {
  input: {
    prompt: "A dreamy watercolor landscape of Mount Fuji at sunrise",
    image_size: "auto_4K",
    num_images: 4
  }
});

// Nano Banana Pro
const result = await fal.subscribe("fal-ai/nano-banana-pro", {
  input: {
    prompt: "Infographic showing '5 Steps to AI Adoption' with icons",
    resolution: "2K",
    aspect_ratio: "9:16",
    num_images: 1,
    enable_web_search: true
  }
});

// Access results
result.data.images.forEach((img, i) => console.log(`Image ${i}: ${img.url}`));
```

## MCP Integration

fal.ai provides an MCP server for direct IDE integration. Add to your MCP config:

```json
{
  "mcpServers": {
    "fal": {
      "url": "https://docs.fal.ai/mcp"
    }
  }
}
```

This gives the agent access to fal documentation and model details directly.

## File Handling

| Purpose | Path |
|---------|------|
| Request JSON | `/tmp/fal/request.json` |
| Response JSON | `/tmp/fal/response.json` |
| Downloaded images | `/tmp/fal/image.png`, `/tmp/fal/image_0.png` ... |
| Project output | `./generated/` (create if in a project context) |

Always `mkdir -p /tmp/fal` before first use. Images at fal CDN URLs expire after 30 days.

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
