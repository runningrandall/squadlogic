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

  enrichSchedule(
    schedule: TeamWaveSchedule,
    config: LogisticsConfig,
  ): TeamWaveSchedule {
    return {
      ...schedule,
      waves: schedule.waves.map((wave) => {
        // Wave meeting = 60 min before the earliest race start in this wave,
        // and is the same for every category within the wave.
        const startMinutes = wave.categories
          .map((cat) => this.parseTime(cat.startTime))
          .filter((t) => t > 0);
        const firstStart = startMinutes.length > 0 ? Math.min(...startMinutes) : 0;
        const waveMeetingTime = firstStart > 0 ? this.formatTime(firstStart - 60) : '';

        return {
          ...wave,
          categories: wave.categories.map((cat) => ({
            ...cat,
            athletes: cat.athletes.map((a) => ({
              ...a,
              logistics: this.calculateTimeline(
                cat.startTime,
                cat.stageTime,
                waveMeetingTime,
                config.warmupDurationMinutes,
              ),
            })),
          })),
        };
      }),
    };
  }

  calculateTimeline(
    startTime: string,
    stageTime: string,
    waveMeetingTime: string,
    warmupDurationMinutes: number,
  ): AthleteLogistics {
    if (!waveMeetingTime) {
      return { waveMeetingTime: '', warmupStart: '', warmupEnd: '', stagingTime: stageTime, raceStart: startTime };
    }
    const meetingMinutes = this.parseTime(waveMeetingTime);
    const warmupEndMinutes = meetingMinutes + warmupDurationMinutes;

    return {
      waveMeetingTime,
      warmupStart: waveMeetingTime,
      warmupEnd: this.formatTime(warmupEndMinutes),
      stagingTime: stageTime,
      raceStart: startTime,
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
