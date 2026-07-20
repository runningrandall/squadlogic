import { z } from 'zod';

const RACERESULT_URL_REGEX = /^https:\/\/my\.raceresult\.com\/(\d+)\/?$/;

export const RaceResultUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .regex(
    RACERESULT_URL_REGEX,
    'URL must be a valid RaceResult event URL (e.g., https://my.raceresult.com/411620/)',
  )
  .transform((url) => {
    const match = url.match(RACERESULT_URL_REGEX)!;
    const eventId = match[1];
    const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
    return { url: normalizedUrl, eventId };
  });

export type ValidatedRaceResultUrl = z.output<typeof RaceResultUrlSchema>;

export interface RaceEventMetadata {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventId: string;
  sourceUrl: string;
  teams: string[];
}

export interface RaceParticipant {
  firstName: string;
  lastName: string;
  team: string;
  category: string;
  bibNumber: string;
}

export interface WaveScheduleEntry {
  categoryName: string;
  stageTime: string;
  startTime: string;
  laps: number | null;
  athletes: ScheduleAthlete[];
}

export interface WaveGroup {
  waveName: string;
  categories: WaveScheduleEntry[];
}

export interface TeamWaveSchedule {
  teamName: string;
  eventName: string;
  eventDate: string;
  totalAthletes: number;
  waves: WaveGroup[];
}

export interface ScheduleAthlete {
  firstName: string;
  lastName: string;
  bibNumber: string;
  logistics?: AthleteLogistics;
}

export interface AthleteLogistics {
  waveMeetingTime: string;
  warmupStart: string;
  warmupEnd: string;
  stagingTime: string;
  raceStart: string;
}

export const ImportRaceEventSchema = z.object({
  url: RaceResultUrlSchema,
});

export type ImportRaceEventDto = z.input<typeof ImportRaceEventSchema>;
