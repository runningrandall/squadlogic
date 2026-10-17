import type {
  RaceParticipant,
  TeamWaveSchedule,
  WaveGroup,
  WaveScheduleEntry,
  ScheduleAthlete,
} from '../domain/race-event.js';
import type { WaveConfig } from '../domain/wave-config.js';
import { stripCategorySplitSuffix } from '../lib/category-split.js';
import { assignWaves, type WaveAssignment } from '../lib/wave-grouping.js';

export interface CategorySchedule {
  date: string; // ISO yyyy-mm-dd race day (multi-day races like State span more than one)
  stageTime: string;
  startTime: string;
}

// How many riders are called up by name at the start line scales with field size — a bigger
// field gets a deeper call-up to keep the front row meaningful.
function callUpThreshold(fieldSize: number): number {
  if (fieldSize <= 24) return 5;
  if (fieldSize <= 49) return 10;
  if (fieldSize <= 74) return 15;
  return 20;
}

export class WaveScheduleService {
  generateSchedule(
    teamName: string,
    participants: RaceParticipant[],
    waveConfig: WaveConfig[],
    categorySchedule: Record<string, CategorySchedule>,
    eventName: string,
    eventDate: string,
    eventDates: string[] = eventDate ? [eventDate] : [],
  ): TeamWaveSchedule {
    // Filter to selected team
    const teamParticipants = participants.filter(
      (p) => p.team.toLowerCase() === teamName.toLowerCase(),
    );

    if (teamParticipants.length === 0) {
      return {
        teamName,
        eventName,
        eventDate,
        eventDates,
        totalAthletes: 0,
        waves: [],
      };
    }

    // Field size for the call-up threshold is the whole race's start-line headcount for a
    // category (every team combined) — not just this team's contingent — since call-up depth
    // reflects who gets called out by name at the actual start, not a per-team subset. Keyed by
    // base category name (a "Split N" suffix stripped): an oversized field printed across
    // multiple split sections still ranks callUpNumber continuously across all of them, so the
    // call-up depth must reflect the combined field, not just whichever split a rider is in.
    const categoryFieldSize = new Map<string, number>();
    for (const p of participants) {
      const base = stripCategorySplitSuffix(p.category);
      categoryFieldSize.set(base, (categoryFieldSize.get(base) ?? 0) + 1);
    }

    // Waves come straight from the official call-up list: categories that stage/start within a
    // few minutes of each other form one wave, numbered per race day. Assigned from the whole
    // race's schedule (not just this team's categories) so wave numbers match the official race —
    // a team with no riders in an official wave simply skips that number. WaveConfig now only
    // supplies each category's lap count.
    const waveAssignments = assignWaves(categorySchedule);
    const lapsMap = this.buildCategoryLapsMap(waveConfig);

    // Group athletes by wave, then category. A category with no stage/start time on the call-up
    // list can't be placed in a wave, so it becomes its own standalone wave (named after the
    // category) rather than silently disappearing.
    const waveGroups = new Map<string, { assignment: WaveAssignment | null; categories: Map<string, ScheduleAthlete[]> }>();

    for (const p of teamParticipants) {
      const athlete: ScheduleAthlete = {
        firstName: p.firstName,
        lastName: p.lastName,
        bibNumber: p.bibNumber,
        callUpNumber: p.callUpNumber,
        calledUp: false, // set below once each category's field size is known
      };

      const assignment = waveAssignments.get(p.category) ?? null;
      const waveName = assignment?.waveName ?? p.category;
      if (!waveGroups.has(waveName)) {
        waveGroups.set(waveName, { assignment, categories: new Map() });
      }
      const categories = waveGroups.get(waveName)!.categories;
      if (!categories.has(p.category)) {
        categories.set(p.category, []);
      }
      categories.get(p.category)!.push(athlete);
    }

    const waves: WaveGroup[] = [];

    for (const [waveName, { assignment, categories: categoriesMap }] of waveGroups) {
      const categories: WaveScheduleEntry[] = [];

      for (const [categoryName, athletes] of categoriesMap) {
        const sched = categorySchedule[categoryName];
        const laps = lapsMap.get(categoryName) ?? lapsMap.get(stripCategorySplitSuffix(categoryName)) ?? null;

        // Sort athletes by lastName, then firstName
        athletes.sort((a, b) => {
          const lastCmp = a.lastName.localeCompare(b.lastName);
          return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
        });

        // Field size (this category's whole-race start-line headcount) determines how many
        // riders are called up by name; callUpNumber ranks the field, so the lowest N are called up.
        // categoryFieldSize is keyed by base category name (see above) and is guaranteed to have
        // it: it's built from `participants`, and categoryName only exists here because at least
        // one teamParticipants row (a subset of participants) has it.
        const threshold = callUpThreshold(categoryFieldSize.get(stripCategorySplitSuffix(categoryName))!);
        for (const a of athletes) {
          const n = a.callUpNumber === null ? NaN : Number(a.callUpNumber);
          a.calledUp = Number.isInteger(n) && n > 0 && n <= threshold;
        }

        categories.push({
          categoryName,
          stageTime: sched?.stageTime ?? '',
          startTime: sched?.startTime ?? '',
          laps,
          athletes,
        });
      }

      // Within a wave, categories go off in start order (a split's sections stay in sequence).
      categories.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.categoryName.localeCompare(b.categoryName));

      waves.push({
        waveName,
        waveNumber: assignment?.waveNumber ?? null,
        day: assignment?.day ?? null,
        date: assignment?.date ?? '',
        categories,
      });
    }

    // Race order: by day, then official wave number. Waves with no known start time (category
    // missing times on the call-up list) sort last, alphabetically.
    waves.sort((a, b) => {
      if (a.waveNumber === null && b.waveNumber === null) return a.waveName.localeCompare(b.waveName);
      if (a.waveNumber === null) return 1;
      if (b.waveNumber === null) return -1;
      return a.date.localeCompare(b.date) || a.waveNumber - b.waveNumber;
    });

    return {
      teamName,
      eventName,
      eventDate,
      eventDates,
      totalAthletes: teamParticipants.length,
      waves,
    };
  }

  private buildCategoryLapsMap(waveConfig: WaveConfig[]): Map<string, number | null> {
    const map = new Map<string, number | null>();
    for (const wave of waveConfig) {
      for (const entry of wave.entries) {
        map.set(entry.categoryName, entry.laps ?? null);
      }
    }
    return map;
  }
}
