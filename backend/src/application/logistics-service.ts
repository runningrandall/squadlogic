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
        // Wave meeting = warmup start of the earliest-staging category in this wave.
        // warmup start = stageTime - warmupDurationMinutes, and is the same event as
        // "meet here to begin your warmup."
        const stageMinutesArr = wave.categories
          .map((cat) => this.parseTime(cat.stageTime))
          .filter((t) => t > 0);
        const firstStage = stageMinutesArr.length > 0 ? Math.min(...stageMinutesArr) : 0;
        const waveMeetingTime = firstStage > 0
          ? this.formatTime(firstStage - config.warmupDurationMinutes)
          : '';

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
    const stageMinutes = this.parseTime(stageTime);
    const warmupStartMinutes = stageMinutes - warmupDurationMinutes;

    return {
      waveMeetingTime,
      warmupStart: this.formatTime(warmupStartMinutes),
      warmupEnd: stageTime,
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
