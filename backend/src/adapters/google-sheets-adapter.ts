import { google } from 'googleapis';
import type { SheetsPort, SheetRow, SheetFormatting } from '../ports/sheets-port.js';

export class GoogleSheetsAuthError extends Error {
  public readonly statusCode = 401;

  constructor(message = 'Google Sheets authentication failed') {
    super(message);
    this.name = 'GoogleSheetsAuthError';
  }
}

export class GoogleSheetsAdapter implements SheetsPort {
  private readonly credentials: string | undefined;

  constructor(credentials?: string) {
    this.credentials = credentials ?? process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  }

  async createSpreadsheet(
    title: string,
    data: SheetRow[],
    formatting: SheetFormatting,
  ): Promise<string> {
    const auth = this.getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create the spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          {
            properties: {
              title: 'Schedule',
              gridProperties: {
                rowCount: data.length + 1,
                columnCount: data[0]?.values.length ?? 10,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error('Failed to create spreadsheet — no ID returned');
    }

    // Write data
    const rows = data.map((row) =>
      row.values.map((v) => (v === null ? '' : v)),
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Schedule!A1',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    // Apply formatting
    const requests = this.buildFormatRequests(formatting, spreadsheetId);
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    // Make it accessible via link
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }

  private getAuth() {
    if (!this.credentials) {
      throw new GoogleSheetsAuthError(
        'Google service account credentials not configured. Use PDF export as an alternative.',
      );
    }

    try {
      const parsed = JSON.parse(this.credentials);
      return new google.auth.GoogleAuth({
        credentials: parsed,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });
    } catch {
      throw new GoogleSheetsAuthError(
        'Invalid Google service account credentials. Use PDF export as an alternative.',
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildFormatRequests(formatting: SheetFormatting, _spreadsheetId: string): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requests: any[] = [];

    // Bold + background for header row
    if (formatting.headerRowCount > 0) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: 0,
            startRowIndex: 0,
            endRowIndex: formatting.headerRowCount,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.4, blue: 0.65 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
    }

    // Bold + merge for wave header rows
    for (const rowIndex of formatting.waveHeaderRows) {
      const colCount = formatting.columnWidths.length || 10;
      requests.push({
        mergeCells: {
          range: {
            sheetId: 0,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          mergeType: 'MERGE_ALL',
        },
      });
      requests.push({
        repeatCell: {
          range: {
            sheetId: 0,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.85, green: 0.92, blue: 0.83 },
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
    }

    // Column widths
    for (let i = 0; i < formatting.columnWidths.length; i++) {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: i,
            endIndex: i + 1,
          },
          properties: { pixelSize: formatting.columnWidths[i] },
          fields: 'pixelSize',
        },
      });
    }

    return requests;
  }
}
