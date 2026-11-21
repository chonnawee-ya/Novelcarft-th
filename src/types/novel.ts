import { z } from 'zod';

export const SCHEMA_VERSION = 2;

export const WorldBuildingItemSchema = z.object({
  id: z.string(),
  category: z.string().min(1),
  detail: z.string().min(1),
  isPinned: z.boolean().default(true),
});

export const CharacterItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.string().min(1),
  archetype: z.string().default(''),
  goal: z.string().min(1),
  flaw: z.string().min(1),
  background: z.string().min(1),
  relationships: z.string().default(''),
  isPinned: z.boolean().default(true),
});

export const PlotBeatSchema = z.object({
  id: z.string().optional(),
  beatName: z.string().min(1),
  act: z.string().min(1),
  summary: z.string().min(1),
});

export const ChapterBeatSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string().min(1),
  linkedBeat: z.string().default(''),
  goal: z.string().min(1),
  conflict: z.string().min(1),
  outcome: z.string().min(1),
  cliffhanger: z.string().min(1),
  summary: z.string().min(1),
});

export const ProjectMetadataSchema = z.object({
  title: z.string().min(1),
  genres: z.array(z.string()).min(1),
  structureTemplate: z.string().min(1),
  tone: z.string().min(1),
  targetAudience: z.string().min(1),
  targetChapterCount: z.number().int().min(1).max(200),
  seedIdea: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MacroOutlineSchema = z.object({
  logline: z.string().min(1),
  worldBuilding: z.array(WorldBuildingItemSchema),
  characters: z.array(CharacterItemSchema),
  plotBeats: z.array(PlotBeatSchema),
});

export const NovelProjectSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  projectId: z.string(),
  metadata: ProjectMetadataSchema,
  macroOutline: MacroOutlineSchema,
  rollingSummary: z.string().default(''),
  chapters: z.array(ChapterBeatSchema).default([]),
});

export type WorldBuildingItem = z.infer<typeof WorldBuildingItemSchema>;
export type CharacterItem = z.infer<typeof CharacterItemSchema>;
export type PlotBeat = z.infer<typeof PlotBeatSchema>;
export type ChapterBeat = z.infer<typeof ChapterBeatSchema>;
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type MacroOutline = z.infer<typeof MacroOutlineSchema>;
export type NovelProject = z.infer<typeof NovelProjectSchema>;

// AI Response validation schemas (raw from Gemini before attaching IDs)
export const MacroOutlineResponseSchema = z.object({
  suggestedTitle: z.string().min(1).optional(),
  logline: z.string().min(1),
  worldBuilding: z
    .array(
      z.object({
        category: z.string().min(1),
        detail: z.string().min(1),
      })
    )
    .min(1),
  characters: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        archetype: z.string().default(''),
        goal: z.string().min(1),
        flaw: z.string().min(1),
        background: z.string().min(1),
        relationships: z.string().default(''),
      })
    )
    .min(1),
  plotBeats: z
    .array(
      z.object({
        beatName: z.string().min(1),
        act: z.string().min(1),
        summary: z.string().min(1),
      })
    )
    .min(1),
});

export const ChapterBatchResponseSchema = z.object({
  chapters: z.array(ChapterBeatSchema).min(1),
  updatedRollingSummary: z.string().min(1),
});

export type AIProviderType = 'gemini' | 'openai-compatible' | 'anthropic';

export interface AISettings {
  provider: AIProviderType;
  presetId: string;
  baseUrl: string;
  model: string;
  temperature: number;
  useCorsProxy?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

export type AppView = 'dashboard' | 'wizard' | 'workspace';
export type WorkspaceTab = 'overview' | 'world' | 'characters' | 'chapters';
