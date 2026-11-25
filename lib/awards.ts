export type AwardId =
  | 'playerOfTheWeek'
  | 'mvp'
  | 'offensivePlayerOfTheYear'
  | 'rookieOfTheYear'
  | 'gmOfTheYear'
  | 'championshipMvp'
  | 'hallOfFame';

export type AwardSelection =
  | 'automatic'
  | 'manual';

export type AwardFrequency =
  | 'weekly'
  | 'seasonal'
  | 'induction';

export type AwardRecipient =
  | 'player'
  | 'generalManager'
  | 'individual';

export type AwardDefinition = {
  id: AwardId;
  name: string;
  shortName: string;
  description: string;
  selection: AwardSelection;
  frequency: AwardFrequency;
  recipient: AwardRecipient;
  color: string;
  order: number;
};

export const AWARDS_FIRST_SEASON = '2026';

export const XII_AWARDS: AwardDefinition[] = [
  {
    id: 'playerOfTheWeek',
    name: 'Crown Player of the Week',
    shortName: 'POTW',
    description:
      'Recognizing the outstanding individual performance of the week.',
    selection: 'automatic',
    frequency: 'weekly',
    recipient: 'player',
    color: '#d4af37',
    order: 1
  },
  {
    id: 'mvp',
    name: 'Crown MVP',
    shortName: 'MVP',
    description:
      'The most valuable player of the XII-L regular season.',
    selection: 'manual',
    frequency: 'seasonal',
    recipient: 'player',
    color: '#d4af37',
    order: 2
  },
  {
    id: 'offensivePlayerOfTheYear',
    name: 'Offensive Player of the Year',
    shortName: 'OPOY',
    description:
      'Recognizing the outstanding offensive player of the regular season.',
    selection: 'manual',
    frequency: 'seasonal',
    recipient: 'player',
    color: '#d4af37',
    order: 3
  },
  {
    id: 'rookieOfTheYear',
    name: 'Rookie of the Year',
    shortName: 'ROTY',
    description:
      'Recognizing the outstanding rookie of the XII-L season.',
    selection: 'manual',
    frequency: 'seasonal',
    recipient: 'player',
    color: '#d4af37',
    order: 4
  },
  {
    id: 'gmOfTheYear',
    name: 'GM of the Year',
    shortName: 'GMOTY',
    description:
      'Recognizing outstanding franchise management during the XII-L season.',
    selection: 'manual',
    frequency: 'seasonal',
    recipient: 'generalManager',
    color: '#d4af37',
    order: 5
  },
  {
    id: 'championshipMvp',
    name: 'Championship MVP',
    shortName: 'CMVP',
    description:
      'Recognizing the outstanding individual performance in the XII-L Championship Game.',
    selection: 'automatic',
    frequency: 'seasonal',
    recipient: 'player',
    color: '#d4af37',
    order: 6
  },
  {
    id: 'hallOfFame',
    name: 'Hall of Fame',
    shortName: 'HOF',
    description:
      'Honoring individuals whose achievements have made a lasting impact on XII-L history.',
    selection: 'manual',
    frequency: 'induction',
    recipient: 'individual',
    color: '#d4af37',
    order: 7
  }
];

export type AwardRecord = {
  id: string;
  awardId: AwardId;
  season: string;
  week?: number;
  playerId?: string;
  gmId?: string;
  recipientName: string;
  position?: string;
  franchiseId?: string;
  franchiseName?: string;
  fantasyPoints?: number;
  notes?: string;
  awardedAt?: string;
  selection: AwardSelection;
};

export type HallOfFameInductee = {
  id: string;
  name: string;
  category: 'player' | 'generalManager' | 'contributor';
  playerId?: string;
  gmId?: string;
  position?: string;
  inductionSeason: string;
  careerStart?: string;
  careerEnd?: string;
  franchiseIds: string[];
  achievements: string[];
  biography: string;
  inductedAt?: string;
};

export function getAwards(): AwardDefinition[] {
  return [...XII_AWARDS].sort(
    (a, b) => a.order - b.order
  );
}

export function getAward(
  awardId: AwardId
): AwardDefinition | undefined {
  return XII_AWARDS.find(
    award => award.id === awardId
  );
}

export function getAutomaticAwards(): AwardDefinition[] {
  return getAwards().filter(
    award => award.selection === 'automatic'
  );
}

export function getManualAwards(): AwardDefinition[] {
  return getAwards().filter(
    award => award.selection === 'manual'
  );
}

export function getSeasonAwards(): AwardDefinition[] {
  return getAwards().filter(
    award => award.frequency === 'seasonal'
  );
}

export function getWeeklyAwards(): AwardDefinition[] {
  return getAwards().filter(
    award => award.frequency === 'weekly'
  );
}
