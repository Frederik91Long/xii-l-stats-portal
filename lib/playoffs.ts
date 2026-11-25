export type PlayoffConfig = {
  season: string;
  franchiseCount: number;
  playoffTeams: number;
  byeTeams: number;
  regularSeasonStart: number;
  regularSeasonEnd: number;
  wildCardWeek: number;
  semiFinalWeek: number;
  championshipWeek: number;
  reseeding: boolean;
};

export const XII_PLAYOFF_CONFIGS: Record<
  string,
  PlayoffConfig
> = {
  '2026': {
    season: '2026',
    franchiseCount: 12,
    playoffTeams: 6,
    byeTeams: 2,
    regularSeasonStart: 1,
    regularSeasonEnd: 14,
    wildCardWeek: 15,
    semiFinalWeek: 16,
    championshipWeek: 17,
    reseeding: true
  }
};

export function getPlayoffConfig(
  season: string
): PlayoffConfig | undefined {
  return XII_PLAYOFF_CONFIGS[season];
}

export type PlayoffRound =
  | 'regularSeason'
  | 'wildCard'
  | 'semiFinal'
  | 'championship'
  | 'offseason';

export function getPlayoffRound(
  season: string,
  week: number
): PlayoffRound {
  const config = getPlayoffConfig(season);

  if (!config) {
    throw new Error(
      `Playoff configuration missing for ${season}`
    );
  }

  if (
    week >= config.regularSeasonStart &&
    week <= config.regularSeasonEnd
  ) {
    return 'regularSeason';
  }

  if (week === config.wildCardWeek) {
    return 'wildCard';
  }

  if (week === config.semiFinalWeek) {
    return 'semiFinal';
  }

  if (week === config.championshipWeek) {
    return 'championship';
  }

  return 'offseason';
}

export type PlayoffStatus =
  | 'clinchedBye'
  | 'clinchedPlayoffs'
  | 'inTheHunt'
  | 'eliminated';

export const PLAYOFF_STATUS_LABELS: Record<
  PlayoffStatus,
  string
> = {
  clinchedBye: 'Clinched First-Round Bye',
  clinchedPlayoffs: 'Clinched Playoffs',
  inTheHunt: 'In the Hunt',
  eliminated: 'Eliminated'
};

export function getWildCardMatchups() {
  return [
    { homeSeed: 3, awaySeed: 6 },
    { homeSeed: 4, awaySeed: 5 }
  ];
}

export function getReseededSemiFinals(
  wildCardWinners: number[]
) {
  if (
    wildCardWinners.length !== 2 ||
    new Set(wildCardWinners).size !== 2 ||
    wildCardWinners.some(
      seed => ![3, 4, 5, 6].includes(seed)
    ) ||
    wildCardWinners.filter(
      seed => [3, 6].includes(seed)
    ).length !== 1
  ) {
    throw new Error(
      'Invalid Wild Card winners'
    );
  }

  const sorted = [...wildCardWinners].sort(
    (a, b) => a - b
  );

  return [
    { homeSeed: 1, awaySeed: sorted[1] },
    { homeSeed: 2, awaySeed: sorted[0] }
  ];
}
