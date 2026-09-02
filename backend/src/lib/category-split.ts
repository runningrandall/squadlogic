// The league's call-up list prints an oversized category's field across multiple sections —
// "<Category Name> Split 1", "Split 2", etc. — each with its own stage/start time. Callers that
// need the underlying category identity (matching it to a WaveConfig entry, aggregating field
// size for call-up depth) strip that suffix; callers that display the schedule keep it, since
// each split is a physically distinct heat with its own timing.
const SPLIT_SUFFIX_REGEX = /\s+Split\s+\d+$/i;

export function stripCategorySplitSuffix(categoryName: string): string {
  return categoryName.replace(SPLIT_SUFFIX_REGEX, '');
}
