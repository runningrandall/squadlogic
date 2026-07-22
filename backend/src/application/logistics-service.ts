import type {
  TeamWaveSchedule,
  AthleteLogistics,
} from '../domain/race-event.js';
import type { WaveConfig } from '../domain/wave-config.js';

export interface LogisticsConfig {
  arrivalOverrides: Map<string, number>; // waveName -> minutes
  warmupDurationMinutes: number;
  stagingBeforeMinutes: number;
}

// Fixed race-day timing constants (business rules, not configurable)
const WAVE_MEETING_LEAD = 60;   // wave meeting starts this many minutes before the first start
const MEETING_DURATION  = 10;   // wave meeting lasts 10 minutes → WU start = meeting + 10
const STAGING_BEFORE    = 20;   // staging opens 20 minutes before race start
const STAGING_BUFFER    = 5;    // buffer between WU end and staging (5 min transition)
// WU end = startTime - STAGING_BEFORE - STAGING_BUFFER = startTime - 25

const VARSITY_JVA_PATTERN = /varsity|jv\s*a/i;

export class LogisticsService {
  calculateDefaults(
    waveConfig: WaveConfig[],
    overrides?: Partial<{
      arrivalOverrides: Record<string, number>;
      warmupDurationMinutes: number;
      stagingBeforeMinutes: number;
    }>,
  ): LogisticsConfig {
    const arrivalOverrides = new Map<string, number>();

    for (const wave of waveConfig) {
      if (overrides?.arrivalOverrides?.[wave.waveName] !== undefined) {
        arrivalOverrides.set(wave.waveName, overrides.arrivalOverrides[wave.waveName]);
      } else {
        const hasVarsityOrJvA = wave.entries.some((e) =>
          VARSITY_JVA_PATTERN.test(e.categoryName),
        );
        arrivalOverrides.set(wave.waveName, hasVarsityOrJvA ? 70 : 60);
      }
    }

    return {
      arrivalOverrides,
      warmupDurationMinutes: overrides?.warmupDurationMinutes ?? 30,
      stagingBeforeMinutes: overrides?.stagingBeforeMinutes ?? 20,
    };
  }

  // Per-wave timing (same for every category within a wave):
  //   waveMeeting  = earliest start in that wave − 60 min
  //   warmupStart  = waveMeeting + 10 min  (after 10-min team meeting)
  // Per-category timing:
  //   warmupEnd    = categoryStart − 25 min (staging − 5 min buffer)
  //   stagingTime  = categoryStart − 20 min
  enrichSchedule(schedule: TeamWaveSchedule): TeamWaveSchedule {
    return {
      ...schedule,
      waves: schedule.waves.map((wave) => {
        const waveStartMinutes = wave.categories
          .map((cat) => this.parseTime(cat.startTime))
          .filter((t) => t > 0);
        const firstStart = waveStartMinutes.length > 0 ? Math.min(...waveStartMinutes) : 0;
        const waveMeetingTime = firstStart > 0 ? this.formatTime(firstStart - WAVE_MEETING_LEAD) : '';
        const warmupStart     = firstStart > 0 ? this.formatTime(firstStart - WAVE_MEETING_LEAD + MEETING_DURATION) : '';

        return {
          ...wave,
          categories: wave.categories.map((cat) => ({
            ...cat,
            athletes: cat.athletes.map((a) => ({
              ...a,
              logistics: this.calculateTimeline(cat.startTime, waveMeetingTime, warmupStart),
            })),
          })),
        };
      }),
    };
  }

  calculateTimeline(startTime: string, waveMeetingTime: string, warmupStart: string): AthleteLogistics {
    if (!waveMeetingTime) {
      return { waveMeetingTime: '', warmupStart: '', warmupEnd: '', stagingTime: startTime, raceStart: startTime };
    }
    const startMinutes = this.parseTime(startTime);
    return {
      waveMeetingTime,
      warmupStart,
      warmupEnd:   this.formatTime(startMinutes - STAGING_BEFORE - STAGING_BUFFER),
      stagingTime: this.formatTime(startMinutes - STAGING_BEFORE),
      raceStart:   startTime,
    };
  }

  private parseTime(hhmm: string): number {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private formatTime(totalMinutes: number): string {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
