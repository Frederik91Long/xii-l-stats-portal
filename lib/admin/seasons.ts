import {
  getSeason,
  getAvailableSeasons,
  CURRENT_SEASON
} from '@/lib/seasons';

import type { XIISeason } from '@/lib/seasons';

export type AdminSeasonValidation =
  | {
      valid: true;
      season: XIISeason;
      isCurrent: boolean;
    }
  | {
      valid: false;
      reason:
        | 'missing_season'
        | 'invalid_format'
        | 'unknown_season';
    };

export function validateAdminSeason(
  value: unknown
): AdminSeasonValidation {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return {
      valid: false,
      reason: 'missing_season'
    };
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}$/.test(value)
  ) {
    return {
      valid: false,
      reason: 'invalid_format'
    };
  }

  const season = getSeason(value);

  if (!season) {
    return {
      valid: false,
      reason: 'unknown_season'
    };
  }

  return {
    valid: true,
    season,
    isCurrent: season.year === CURRENT_SEASON
  };
}

export function resolveAdminSeason(
  value: unknown
): AdminSeasonValidation {
  if (value === undefined || value === null) {
    return validateAdminSeason(CURRENT_SEASON);
  }

  return validateAdminSeason(value);
}

export function getAdminSeasonOptions() {
  return getAvailableSeasons().map(season => ({
    year: season.year,
    name: season.name,
    isCurrent: season.year === CURRENT_SEASON
  }));
}

export function getAdminSeasonError(
  reason:
    | 'missing_season'
    | 'invalid_format'
    | 'unknown_season'
): string {
  switch (reason) {
    case 'missing_season':
      return 'A XII-L season must be selected.';

    case 'invalid_format':
      return 'The season must be a valid four-digit year.';

    case 'unknown_season':
      return 'The selected season is not registered in the XII-L.';
  }
}
