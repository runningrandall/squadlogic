export interface SheetRow {
  values: (string | number | null)[];
}

export interface SheetFormatting {
  headerRowCount: number;
  waveHeaderRows: number[];
  columnWidths: number[];
}

export interface SheetsPort {
  createSpreadsheet(
    title: string,
    data: SheetRow[],
    formatting: SheetFormatting,
  ): Promise<string>;
}
