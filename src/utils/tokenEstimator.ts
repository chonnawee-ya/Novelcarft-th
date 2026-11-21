import type { NovelProject } from '../types/novel';

/**
 * Pragmatic token estimator for mixed Thai + English text.
 * Thai characters typically encode at ~1.3-1.6 chars per token across modern tokenizers,
 * while ASCII/Latin encodes at ~4 chars per token.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let thaiChars = 0;
  let otherChars = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0e00 && code <= 0x0e7f) {
      thaiChars++;
    } else {
      otherChars++;
    }
  }
  return Math.ceil(thaiChars / 1.4 + otherChars / 4);
}

export function estimateProjectContextTokens(
  project: NovelProject,
  economyMode = false
): {
  tokens: number;
  pinnedCount: number;
  isHighPinned: boolean;
} {
  const pinnedWorld = project.macroOutline.worldBuilding.filter((w) => w.isPinned);
  const pinnedChars = project.macroOutline.characters.filter((c) => c.isPinned);
  const pinnedCount = pinnedWorld.length + pinnedChars.length;

  let sample = project.metadata.title + project.macroOutline.logline + project.rollingSummary;
  sample += pinnedWorld.map((w) => `${w.category}:${w.detail}`).join('\n');

  if (economyMode) {
    // Economy mode sends compact roster + only ~3 active beats
    sample += pinnedChars.map((c) => `${c.name}(${c.role}):${c.goal}`).join('\n');
    sample += project.macroOutline.plotBeats
      .slice(0, 3)
      .map((b) => `${b.beatName}:${b.summary}`)
      .join('\n');
  } else {
    sample += pinnedChars
      .map((c) => `${c.name}${c.role}${c.goal}${c.flaw}${c.background}${c.relationships}`)
      .join('\n');
    sample += project.macroOutline.plotBeats
      .slice(0, 5)
      .map((b) => `${b.beatName}:${b.summary}`)
      .join('\n');
  }

  // Add ~250 base system instruction tokens
  const tokens = estimateTokens(sample) + 250;
  return {
    tokens,
    pinnedCount,
    isHighPinned: pinnedCount > 10,
  };
}
