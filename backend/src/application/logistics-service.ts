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
      waves: schedule.waves.map((wave) => ({
        ...wave,
        categories: wave.categories.map((cat) => {
          const arrivalBefore =
            config.arrivalOverrides.get(wave.waveName) ?? 60;

          const logistics = this.calculateTimeline(
            cat.startTime,
            cat.stageTime,
            arrivalBefore,
            config.warmupDurationMinutes,
          );

          return {
            ...cat,
            athletes: cat.athletes.map((a) => ({
              ...a,
              logistics,
            })),
          };
        }),
      })),
    };
  }

  calculateTimeline(
    startTime: string,
    stageTime: string,
    arrivalBeforeMinutes: number,
    warmupDurationMinutes: number,
  ): AthleteLogistics {
    const startMinutes = this.parseTime(startTime);
    const arrivalMinutes = startMinutes - arrivalBeforeMinutes;
    const warmupEndMinutes = arrivalMinutes + warmupDurationMinutes;

    return {
      arrivalTime: this.formatTime(arrivalMinutes),
      warmupStart: this.formatTime(arrivalMinutes),
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
