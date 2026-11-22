export type XIISeason = {
  year: string;
  leagueId: string;
  name: string;
};

export const XII_SEASONS: XIISeason[] = [
  {
    year: '2026',
    leagueId: '1317560135530344449',
    name: 'XII-L Inaugural Season'
  }
];

// The first season of XII-L
export const FIRST_SEASON = '2026';

// Current active XII-L season
export const CURRENT_SEASON = '2026';

// Get a season by year
export function getSeason(
  year: string
): XIISeason | undefined {
  return XII_SEASONS.find(
    season => season.year === year
  );
}

// Get all available seasons
export function getAvailableSeasons(): XIISeason[] {
  return [...XII_SEASONS].sort(
    (a, b) => Number(b.year) - Number(a.year)
  );
}

// Get the current season configuration
export function getCurrentSeason(): XIISeason {
  const season = getSeason(CURRENT_SEASON);

  if (!season) {
    throw new Error(
      'Current XII-L season is not configured'
    );
  }

  return season;
}
