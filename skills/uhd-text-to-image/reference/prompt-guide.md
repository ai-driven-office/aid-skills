# Prompt Guide — Seedream v4.5 & Nano Banana Pro

## Seedream v4.5 Prompting

Seedream responds best to structured, descriptive prompts. Aim for **30-100 words** with five components:

### Prompt Structure

```
[Subject] + [Style] + [Composition] + [Lighting] + [Technical]
```

**Order matters** — the model emphasizes concepts mentioned first. Lead with the most important element.

### Key Modifiers

| Category | Examples |
|----------|---------|
| **Artistic styles** | oil painting, watercolor, pencil sketch, digital art, anime, ukiyo-e |
| **Photo styles** | portrait photography, macro, aerial view, street photography |
| **Aesthetics** | cinematic, photorealistic, stylized, minimalist, dreamy, ethereal |
| **Lighting** | golden hour, dramatic side lighting, soft diffused, moody low-key, bright high-key, neon, studio |
| **Camera** | shot on 85mm lens, shallow depth of field, wide-angle, close-up, overhead |
| **Composition** | rule of thirds, symmetrical, foreground detail with blurred background, centered |

### Example Prompts

**Portrait (creative)**:
> Professional headshot of a female CEO with short blonde hair, confident expression, navy blue suit, neutral office background, studio lighting, shallow depth of field, high-end corporate photography

**Landscape (artistic)**:
> Vast mountain valley at golden hour, dramatic clouds catching pink and orange light, a winding river reflecting the sky, foreground wildflowers, cinematic wide-angle, 4K detail

**Cute/Character**:
> An adorable round robot sitting in a field of sunflowers, big expressive eyes, soft pastel colors, Studio Ghibli inspired, warm afternoon light, gentle watercolor texture

**Food**:
> Overhead flat-lay of a Japanese breakfast spread on dark slate, miso soup steaming, grilled salmon, pickled vegetables, natural window light from the left, food photography style

### Troubleshooting Seedream

| Problem | Fix |
|---------|-----|
| Wrong style | Be more explicit: "photorealistic photograph, not illustration" |
| Cluttered composition | Simplify the scene, specify "clean background" or "minimalist" |
| Wrong mood | Add lighting keywords: "moody low-key" vs "bright and airy" |
| Bad anatomy | Add "anatomically correct, professional portrait" |
| Text needed | **Switch to Nano Banana Pro** — Seedream is poor at text |

---

## Nano Banana Pro Prompting

Nano Banana understands language holistically — write **narrative descriptions**, not keyword lists. It excels at following complex, detailed instructions.

### Core Principle

Describe the scene as if explaining it to a photographer or designer. Include spatial relationships, specific details, and precise requirements.

### Prompt Strategies

#### 1. Photorealistic Scenes

Use photography terminology: camera angles, lens specs, lighting setups.

> A candid street photograph of an elderly Japanese craftsman shaping pottery in his workshop, shot at f/2.8 on a 50mm lens, warm tungsten lighting from overhead pendants, shallow depth of field with clay dust particles visible in the light, documentary style

#### 2. Text in Images

Be prescriptive about font characteristics. Nano Banana has **excellent text rendering**.

> A modern event poster with the title "TECH SUMMIT 2026" in bold condensed sans-serif at the top, subtitle "The Future of AI" in thin weight below, dark navy background with abstract circuit-board pattern, accent color electric blue, clean professional layout

#### 3. Illustrations and Stickers

Specify line style, shading, color palette, and background treatment.

> A cute cartoon sticker of a shiba inu wearing sunglasses and a Hawaiian shirt, thick black outline, flat colors with minimal shading, transparent background, kawaii style, slightly tilted pose

#### 4. Product Photography

Use studio lighting terminology and composition language.

> A premium skincare bottle on a marble surface, three-point softbox setup with key light from upper left, subtle reflection on surface, shallow depth of field, clean white background, commercial product photography, luxury brand aesthetic

#### 5. Complex Multi-Element Scenes

Provide spatial relationships and layered detail.

> A bustling night market scene in Taipei: foreground shows a vendor grilling skewers with visible steam, middle ground has crowds of people with colorful lanterns overhead, background shows neon signs with Chinese characters, warm orange and red tones dominating, street photography style with motion blur on passersby

### Web Search Prompts

Enable `enable_web_search: true` when the prompt references:
- Current events, recent people, or trending topics
- Specific real-world locations or landmarks (for accuracy)
- Branded products or recognizable designs
- Weather, seasons, or time-specific content

> A photo-realistic rendering of the latest Tokyo Station Christmas illumination display, accurate architectural details, evening atmosphere with crowds, shot on 35mm lens — `enable_web_search: true`

### Troubleshooting Nano Banana

| Problem | Fix |
|---------|-----|
| Too generic | Add unique details, specific references, unusual combinations |
| Missing elements | Be explicit about spatial placement: "in the foreground", "top-left corner" |
| Wrong text | Wrap text in quotes, specify font style: `"HELLO" in bold serif` |
| Bland style | Add stronger artistic direction: reference specific aesthetics or decades |

---

## Model Comparison — Same Prompt

**Prompt**: "A cozy Japanese cafe interior, afternoon light through frosted glass, wooden furniture, a latte with latte art on the table"

| Aspect | Seedream Result | Nano Banana Result |
|--------|----------------|-------------------|
| Mood | More atmospheric, painterly warmth | More precise, photographic clarity |
| Details | Artistic interpretation of latte art | More accurate latte art rendering |
| Light | Dreamier, more diffused | More realistic light physics |
| Overall | Feels like a memory | Feels like a photograph |

**Rule of thumb**: If you want it to *feel* right, use Seedream. If you want it to *look* right, use Nano Banana.

---

## Universal Tips

1. **Prompt length**: 30-100 words for Seedream, can go longer (up to 50K chars) for Nano Banana
2. **Negation**: Both models understand "not X" but Seedream is less reliable with negations
3. **Iterative refinement**: Generate, review, adjust prompt, regenerate
4. **Seed for consistency**: Set a `seed` value when iterating on the same concept to keep other elements stable
5. **Aspect ratio matters**: Match the aspect ratio to the content (portrait for people, landscape for scenes, square for social media)
