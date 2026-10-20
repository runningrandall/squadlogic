import type {
  TeamWaveSchedule,
  AthleteLogistics,
} from '../domain/race-event.js';
import type { WaveConfig } from '../domain/wave-config.js';
import { stripCategorySplitSuffix } from '../lib/category-split.js';

export interface LogisticsConfig {
  arrivalOverrides: Map<string, number>; // waveName -> minutes
  warmupDurationMinutes: number;
  stagingBeforeMinutes: number;
}

// Fixed race-day timing constants (business rules, not configurable)
const WAVE_MEETING_LEAD = 60;   // wave meeting starts this many minutes before the first start
const MEETING_DURATION  = 10;   // wave meeting lasts 10 minutes → WU start = meeting + 10
const STAGING_BEFORE    = 15;   // staging opens 15 minutes before race start
const STAGING_BUFFER    = 5;    // buffer between WU end and staging (5 min transition)
// WU end = startTime - STAGING_BEFORE - STAGING_BUFFER = startTime - 20
const SPLIT_SHARED_MEETING_SPAN = 90; // splits starting within 90 min of each other share one wave meeting

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
  // Per-category timing (each category has its own start time):
  //   stagingTime  = categoryStart − 15 min
  //   warmupEnd    = stagingTime − 5 min (bathroom/walk-time buffer)
  // Exception: a category's splits ("<Category> Split N") often land in different waves. A
  // split starting within SPLIT_SHARED_MEETING_SPAN of its category's earliest split (same
  // day) attends that earliest split's wave meeting instead of its own wave's. Its warmup
  // start, warmup end, staging and start stay its own.
  enrichSchedule(schedule: TeamWaveSchedule): TeamWaveSchedule {
    const waveFirstStart = schedule.waves.map((wave) => {
      const waveStartMinutes = wave.categories
        .map((cat) => this.parseTime(cat.startTime))
        .filter((t) => t > 0);
      return waveStartMinutes.length > 0 ? Math.min(...waveStartMinutes) : 0;
    });
    const sharedMeetings = this.sharedSplitMeetings(schedule, waveFirstStart);

    return {
      ...schedule,
      waves: schedule.waves.map((wave, waveIndex) => {
        const firstStart = waveFirstStart[waveIndex];
        const waveMeetingTime = firstStart > 0 ? this.formatTime(firstStart - WAVE_MEETING_LEAD) : '';
        const warmupStart     = firstStart > 0 ? this.formatTime(firstStart - WAVE_MEETING_LEAD + MEETING_DURATION) : '';

        return {
          ...wave,
          categories: wave.categories.map((cat) => {
            const meeting = sharedMeetings.get(this.splitKey(wave.date, cat.categoryName, cat.startTime)) ?? waveMeetingTime;
            return {
              ...cat,
              athletes: cat.athletes.map((a) => ({
                ...a,
                logistics: this.calculateTimeline(cat.startTime, meeting, warmupStart),
              })),
            };
          }),
        };
      }),
    };
  }

  // Maps each split (keyed by day + split name + start) that borrows an earlier split's wave
  // meeting to that meeting time. Splits are clustered per day and base category, each cluster
  // spanning at most SPLIT_SHARED_MEETING_SPAN from its earliest start.
  private sharedSplitMeetings(schedule: TeamWaveSchedule, waveFirstStart: number[]): Map<string, string> {
    const splitsByCategory = new Map<string, { key: string; start: number; waveStart: number }[]>();
    schedule.waves.forEach((wave, waveIndex) => {
      for (const cat of wave.categories) {
        const base = stripCategorySplitSuffix(cat.categoryName);
        const start = this.parseTime(cat.startTime);
        if (base === cat.categoryName || start <= 0) continue;
        const groupKey = `${wave.date ?? ''}|${base}`;
        if (!splitsByCategory.has(groupKey)) splitsByCategory.set(groupKey, []);
        splitsByCategory.get(groupKey)!.push({
          key: this.splitKey(wave.date, cat.categoryName, cat.startTime),
          start,
          waveStart: waveFirstStart[waveIndex],
        });
      }
    });

    const meetings = new Map<string, string>();
    for (const splits of splitsByCategory.values()) {
      splits.sort((a, b) => a.start - b.start);
      let anchor: (typeof splits)[number] | undefined;
      for (const split of splits) {
        if (!anchor || split.start - anchor.start > SPLIT_SHARED_MEETING_SPAN) anchor = split;
        meetings.set(split.key, this.formatTime(anchor.waveStart - WAVE_MEETING_LEAD));
      }
    }
    return meetings;
  }

  private splitKey(date: string | undefined, categoryName: string, startTime: string): string {
    return `${date ?? ''}|${categoryName}|${startTime}`;
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
