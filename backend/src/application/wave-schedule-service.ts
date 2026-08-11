import type {
  RaceParticipant,
  TeamWaveSchedule,
  WaveGroup,
  WaveScheduleEntry,
  ScheduleAthlete,
} from '../domain/race-event.js';
import type { WaveConfig } from '../domain/wave-config.js';

export interface CategorySchedule {
  stageTime: string;
  startTime: string;
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
      };

      const waveName = groupMap.get(p.category)?.waveName ?? p.category;
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
        const laps = groupMap.get(categoryName)?.laps ?? null;

        // Sort athletes by lastName, then firstName
        athletes.sort((a, b) => {
          const lastCmp = a.lastName.localeCompare(b.lastName);
          return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
        });

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
