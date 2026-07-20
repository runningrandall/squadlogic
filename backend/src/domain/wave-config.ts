import { z } from 'zod';

const timeFormatRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface WaveConfigEntry {
  categoryName: string;
  stageTime: string;
  startTime: string;
  laps: number | null;
}

export interface WaveConfig {
  configId: string;
  organizationId: string;
  waveName: string;
  entries: WaveConfigEntry[];
  createdAt: string;
  updatedAt: string;
}

const WaveConfigEntrySchema = z.object({
  categoryName: z.string().min(1).max(255),
  stageTime: z
    .string()
    .regex(timeFormatRegex, 'stageTime must be in HH:MM 24-hour format'),
  startTime: z
    .string()
    .regex(timeFormatRegex, 'startTime must be in HH:MM 24-hour format'),
  laps: z.number().int().positive().nullable().default(null),
});

export const CreateWaveConfigSchema = z.object({
  waveName: z.string().min(1).max(255),
  entries: z
    .array(WaveConfigEntrySchema)
    .min(1)
    .superRefine((entries, ctx) => {
      const names = entries.map((e) => e.categoryName);
      const seen = new Set<string>();
      for (let i = 0; i < names.length; i++) {
        if (seen.has(names[i])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate categoryName: ${names[i]}`,
            path: [i, 'categoryName'],
          });
        }
        seen.add(names[i]);
      }
    }),
});

export type CreateWaveConfigDto = z.output<typeof CreateWaveConfigSchema>;

export const UpdateWaveConfigSchema = z.object({
  waveName: z.string().min(1).max(255).optional(),
  entries: z
    .array(WaveConfigEntrySchema)
    .min(1)
    .superRefine((entries, ctx) => {
      const names = entries.map((e) => e.categoryName);
      const seen = new Set<string>();
      for (let i = 0; i < names.length; i++) {
        if (seen.has(names[i])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate categoryName: ${names[i]}`,
            path: [i, 'categoryName'],
          });
        }
        seen.add(names[i]);
      }
    })
    .optional(),
});

export type UpdateWaveConfigDto = z.infer<typeof UpdateWaveConfigSchema>;
