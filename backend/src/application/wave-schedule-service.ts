import type {
  RaceParticipant,
  TeamWaveSchedule,
  WaveGroup,
  WaveScheduleEntry,
  ScheduleAthlete,
} from '../domain/race-event.js';
import type { WaveConfig } from '../domain/wave-config.js';
import { stripCategorySplitSuffix } from '../lib/category-split.js';

export interface CategorySchedule {
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

    // WaveConfig now only supplies which named wave a category belongs to, and its lap count.
    // Per-category stage/start times come from categorySchedule (the uploaded call-up list).
    const groupMap = this.buildCategoryGroupMap(waveConfig);

    // Group athletes by wave, then category. A category with no WaveConfig grouping entry
    // becomes its own standalone wave (named after the category) rather than a catch-all
    // "Unassigned" bucket — so nothing silently disappears when WaveConfig hasn't been
    // updated to match this week's category names.
    const waveGroups = new Map<string, Map<string, ScheduleAthlete[]>>();

    for (const p of teamParticipants) {
      const athlete: ScheduleAthlete = {
        firstName: p.firstName,
        lastName: p.lastName,
        bibNumber: p.bibNumber,
        callUpNumber: p.callUpNumber,
        calledUp: false, // set below once each category's field size is known
      };

      // A split section's category name ("... Split 1") won't itself appear in WaveConfig,
      // which only knows the base category — fall back to that to still find the right wave.
      const waveEntry = groupMap.get(p.category) ?? groupMap.get(stripCategorySplitSuffix(p.category));
      const waveName = waveEntry?.waveName ?? p.category;
      if (!waveGroups.has(waveName)) {
        waveGroups.set(waveName, new Map());
      }
      const categories = waveGroups.get(waveName)!;
      if (!categories.has(p.category)) {
        categories.set(p.category, []);
      }
      categories.get(p.category)!.push(athlete);
    }

    // Build wave groups, sorted by each wave's earliest category start time
    const waveEntries: { waveName: string; categories: WaveScheduleEntry[]; earliestStart: string }[] = [];

    for (const [waveName, categoriesMap] of waveGroups) {
      const categories: WaveScheduleEntry[] = [];

      // Sort categories alphabetically within wave
      const sortedCategories = [...categoriesMap.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      );

      for (const [categoryName, athletes] of sortedCategories) {
        const sched = categorySchedule[categoryName];
        const laps = (groupMap.get(categoryName) ?? groupMap.get(stripCategorySplitSuffix(categoryName)))?.laps ?? null;

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

      const earliestStart = categories.reduce(
        (min, c) => (c.startTime && (min === '' || c.startTime < min) ? c.startTime : min),
        '',
      );
      waveEntries.push({ waveName, categories, earliestStart });
    }

    // Waves with a known start time sort first (earliest first); waves with no known
    // start time (category missing from the uploaded schedule) sort last.
    waveEntries.sort((a, b) => {
      if (!a.earliestStart && !b.earliestStart) return 0;
      if (!a.earliestStart) return 1;
      if (!b.earliestStart) return -1;
      return a.earliestStart.localeCompare(b.earliestStart);
    });

    const waves: WaveGroup[] = waveEntries.map(({ waveName, categories }) => ({
      waveName,
      categories,
    }));

    return {
      teamName,
      eventName,
      eventDate,
      totalAthletes: teamParticipants.length,
      waves,
    };
  }

  private buildCategoryGroupMap(
    waveConfig: WaveConfig[],
  ): Map<string, { waveName: string; laps: number | null }> {
    const map = new Map<string, { waveName: string; laps: number | null }>();

    for (const wave of waveConfig) {
      for (const entry of wave.entries) {
        map.set(entry.categoryName, {
          waveName: wave.waveName,
          laps: entry.laps ?? null,
        });
      }
    }

    return map;
  }
}
