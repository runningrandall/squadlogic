import type {
  RaceParticipant,
  TeamWaveSchedule,
  WaveGroup,
  WaveScheduleEntry,
  ScheduleAthlete,
} from '../domain/race-event.js';
import type { WaveConfig } from '../domain/wave-config.js';

export class WaveScheduleService {
  generateSchedule(
    teamName: string,
    participants: RaceParticipant[],
    waveConfig: WaveConfig[],
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

    // Build category-to-wave lookup from config
    const categoryMap = this.buildCategoryMap(waveConfig);

    // Group athletes by wave, then category
    const waveGroups = new Map<string, Map<string, ScheduleAthlete[]>>();
    const unassigned: ScheduleAthlete[] = [];

    for (const p of teamParticipants) {
      const athlete: ScheduleAthlete = {
        firstName: p.firstName,
        lastName: p.lastName,
        bibNumber: p.bibNumber,
      };

      const mapping = categoryMap.get(p.category);
      if (!mapping) {
        unassigned.push(athlete);
        continue;
      }

      const { waveName } = mapping;
      if (!waveGroups.has(waveName)) {
        waveGroups.set(waveName, new Map());
      }
      const categories = waveGroups.get(waveName)!;
      if (!categories.has(p.category)) {
        categories.set(p.category, []);
      }
      categories.get(p.category)!.push(athlete);
    }

    // Build sorted wave groups
    const waves: WaveGroup[] = [];

    // Sort waves by earliest start time from config
    const waveOrder = this.getWaveOrder(waveConfig);

    for (const waveName of waveOrder) {
      const categoriesMap = waveGroups.get(waveName);
      if (!categoriesMap) continue;

      const categories: WaveScheduleEntry[] = [];

      // Sort categories alphabetically within wave
      const sortedCategories = [...categoriesMap.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      );

      for (const [categoryName, athletes] of sortedCategories) {
        const configEntry = categoryMap.get(categoryName);

        // Sort athletes by lastName, then firstName
        athletes.sort((a, b) => {
          const lastCmp = a.lastName.localeCompare(b.lastName);
          return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
        });

        categories.push({
          categoryName,
          stageTime: configEntry?.stageTime ?? '',
          startTime: configEntry?.startTime ?? '',
          laps: configEntry?.laps ?? null,
          athletes,
        });
      }

      waves.push({ waveName, categories });
    }

    // Add unassigned group if any
    if (unassigned.length > 0) {
      unassigned.sort((a, b) => {
        const lastCmp = a.lastName.localeCompare(b.lastName);
        return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
      });

      waves.push({
        waveName: 'Unassigned',
        categories: [
          {
            categoryName: 'Unassigned',
            stageTime: '',
            startTime: '',
            laps: null,
            athletes: unassigned,
          },
        ],
      });
    }

    return {
      teamName,
      eventName,
      eventDate,
      totalAthletes: teamParticipants.length,
      waves,
    };
  }

  private buildCategoryMap(
    waveConfig: WaveConfig[],
  ): Map<string, { waveName: string; stageTime: string; startTime: string; laps: number | null }> {
    const map = new Map<string, { waveName: string; stageTime: string; startTime: string; laps: number | null }>();

    for (const wave of waveConfig) {
      for (const entry of wave.entries) {
        map.set(entry.categoryName, {
          waveName: wave.waveName,
          stageTime: entry.stageTime,
          startTime: entry.startTime,
          laps: entry.laps ?? null,
        });
      }
    }

    return map;
  }

  private getWaveOrder(waveConfig: WaveConfig[]): string[] {
    return waveConfig
      .map((w) => ({
        waveName: w.waveName,
        earliestStart: w.entries.reduce(
          (min, e) => (e.startTime < min ? e.startTime : min),
          '99:99',
        ),
      }))
      .sort((a, b) => a.earliestStart.localeCompare(b.earliestStart))
      .map((w) => w.waveName);
  }
}
