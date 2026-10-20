import type { TeamWaveSchedule } from '../domain/race-event.js';
import type { SheetsPort, SheetRow, SheetFormatting } from '../ports/sheets-port.js';
import { formatTime12Hour } from '../lib/time-format.js';

const COLUMN_HEADERS = [
  'Wave',
  'Category',
  'Athlete Name',
  'Staging #',
  'Bib #',
  'Wave Meeting',
  'Warmup Start',
  'Warmup End',
  'Staging',
  'Race Start',
  'Laps',
];

const COLUMN_WIDTHS = [140, 150, 180, 70, 70, 80, 110, 100, 80, 100, 60];

export class SheetsExportService {
  constructor(private readonly sheetsPort: SheetsPort) {}

  async exportSchedule(schedule: TeamWaveSchedule): Promise<string> {
    const title = this.buildTitle(schedule);
    const { rows, waveHeaderRows } = this.buildRows(schedule);

    const formatting: SheetFormatting = {
      headerRowCount: 1,
      waveHeaderRows,
      columnWidths: COLUMN_WIDTHS,
    };

    return this.sheetsPort.createSpreadsheet(title, rows, formatting);
  }

  buildTitle(schedule: TeamWaveSchedule): string {
    return `${schedule.teamName} - ${schedule.eventName} - ${schedule.eventDate}`;
  }

  buildRows(schedule: TeamWaveSchedule): {
    rows: SheetRow[];
    waveHeaderRows: number[];
  } {
    const rows: SheetRow[] = [];
    const waveHeaderRows: number[] = [];

    // Header row
    rows.push({ values: COLUMN_HEADERS });

    for (const wave of schedule.waves) {
      // Wave header row (merged)
      waveHeaderRows.push(rows.length);
      rows.push({
        values: [wave.waveName, '', '', '', '', '', '', '', '', '', ''],
      });

      for (const category of wave.categories) {
        for (const athlete of category.athletes) {
          const laps = category.laps;
          const logistics = athlete.logistics;

          rows.push({
            values: [
              wave.waveName,
              category.categoryName,
              `${athlete.firstName} ${athlete.lastName}`,
              athlete.callUpNumber ?? '',
              athlete.bibNumber,
              logistics?.waveMeetingTime ? formatTime12Hour(logistics.waveMeetingTime) : '',
              logistics?.warmupStart ? formatTime12Hour(logistics.warmupStart) : '',
              logistics?.warmupEnd ? formatTime12Hour(logistics.warmupEnd) : '',
              logistics?.stagingTime ? formatTime12Hour(logistics.stagingTime) : '',
              logistics?.raceStart ? formatTime12Hour(logistics.raceStart) : '',
              laps ?? '',
            ],
          });
        }
      }
    }

    return { rows, waveHeaderRows };
  }
}
