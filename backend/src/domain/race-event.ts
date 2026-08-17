import { z } from 'zod';

export const CallUpListUploadSchema = z.object({
  fileData: z.string().min(1, 'fileData (base64-encoded .xlsx or .pdf) is required'),
  eventName: z.string().optional(),
  eventLocation: z.string().optional(),
});

export type CallUpListUploadDto = z.output<typeof CallUpListUploadSchema>;

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
  callUpNumber: string | null;
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
  callUpNumber: string | null;
  logistics?: AthleteLogistics;
}

export interface AthleteLogistics {
  waveMeetingTime: string;
  warmupStart: string;
  warmupEnd: string;
  stagingTime: string;
  raceStart: string;
}
