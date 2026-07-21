import { describe, it, expect } from 'vitest';
import { parseCsvParticipants } from '../csv-participant-parser.js';

const sampleCsv = `Varsity Girls,,,,,
,ASHLYN ADAMS,11,12,Varsity Girls,Varsity Girls
,BRIELLE ADAMS,11,12,Varsity Girls,Varsity Girls
,CARLY HOWELL,10,11,JV A Girls,Varsity Girls
,,,,,
JV A Boys,,,,,
,*LIAM ELLIS,10,11,JV A Boys,Varsity Boys
,ADAM J ANDERSON,9,10,Freshman C Boys,JV C Boys
,LENORA COLLETTE,,9,,JV D Girls`;

describe('parseCsvParticipants', () => {
  it('parses athlete rows and skips headers and blanks', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    expect(result).toHaveLength(6);
  });

  it('assigns the provided team name to all participants', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    expect(result.every((p) => p.team === 'Lehi HS')).toBe(true);
  });

  it('uses this-year category (col 5) for each athlete', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    const ashlyn = result.find((p) => p.lastName === 'Adams' && p.firstName === 'Ashlyn');
    expect(ashlyn?.category).toBe('Varsity Girls');
    const carly = result.find((p) => p.lastName === 'Howell');
    expect(carly?.category).toBe('Varsity Girls'); // promoted from JV A Girls
  });

  it('strips leading asterisk from name', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    const liam = result.find((p) => p.lastName === 'Ellis');
    expect(liam?.firstName).toBe('Liam');
    expect(liam?.lastName).toBe('Ellis');
  });

  it('title-cases names', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    expect(result[0].firstName).toBe('Ashlyn');
    expect(result[0].lastName).toBe('Adams');
  });

  it('handles middle initials in name (last word = last name)', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    const adam = result.find((p) => p.lastName === 'Anderson');
    expect(adam?.firstName).toBe('Adam J');
    expect(adam?.lastName).toBe('Anderson');
  });

  it('includes athletes with missing grade/last-year data', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    const lenora = result.find((p) => p.lastName === 'Collette');
    expect(lenora).toBeDefined();
    expect(lenora?.category).toBe('JV D Girls');
  });

  it('sets bibNumber to empty string', () => {
    const result = parseCsvParticipants(sampleCsv, 'Lehi HS');
    expect(result.every((p) => p.bibNumber === '')).toBe(true);
  });

  it('returns empty array for empty CSV', () => {
    expect(parseCsvParticipants('', 'Team A')).toEqual([]);
  });

  it('skips single-word names (no firstName)', () => {
    const csv = ',ADAMS,,,, Varsity Boys';
    const result = parseCsvParticipants(csv, 'Team A');
    expect(result).toHaveLength(0);
  });

  it('skips rows with fewer than 6 columns (no category)', () => {
    const csv = ',JOHN SMITH,10,11,Old Cat';
    const result = parseCsvParticipants(csv, 'Team A');
    expect(result).toHaveLength(0);
  });
});
