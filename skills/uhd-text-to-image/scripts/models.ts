import type { ModelConfig, ModelId } from "./types.ts";

export const MODELS: Record<ModelId, ModelConfig> = {
  seedream: {
    id: "seedream",
    endpoint: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    displayName: "Seedream v4.5",
    maxImages: 6,
    costPerImage: 0.04,
  },
  banana: {
    id: "banana",
    endpoint: "fal-ai/nano-banana-pro",
    displayName: "Nano Banana Pro",
    maxImages: 4,
    costPerImage: 0.15,
    costPerImage4K: 0.30,
    webSearchCost: 0.015,
  },
};

/** Keywords that suggest text rendering is needed → prefer Banana */
const TEXT_CUES = [
  "text",
  "typography",
  "infographic",
  "badge",
  "poster",
  "logo with text",
  "lettering",
  "font",
  "headline",
  "title card",
  "sign",
  "label",
  "caption",
  "diagram",
  "chart",
];

/** Detect quoted strings like "Hello World" inside the prompt */
const QUOTED_PATTERN = /'[^']{2,}'|"[^"]{2,}"/;

/**
 * Auto-select model based on prompt content.
 * Returns "banana" if prompt has text-rendering cues, otherwise "seedream".
 */
export function autoSelectModel(prompt: string): ModelId {
  const lower = prompt.toLowerCase();

  if (QUOTED_PATTERN.test(prompt)) return "banana";

  for (const cue of TEXT_CUES) {
    if (lower.includes(cue)) return "banana";
  }

  return "seedream";
}

export function getModel(id: ModelId): ModelConfig {
  return MODELS[id];
}
