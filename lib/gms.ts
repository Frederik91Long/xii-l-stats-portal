import { getFranchise } from '@/lib/franchises';

export type GMRole = 'GM' | 'Co-GM';

export type GMStatus = 'active' | 'former';

export type GMAssignment = {
  franchiseId: string;
  season: string;
  role: GMRole;
  status: GMStatus;
  startWeek?: number;
  endWeek?: number;
};

export type XIIGeneralManager = {
  id: string;
  displayName: string;
  sleeperUserId: string | null;
  previousNames: string[];
  assignments: GMAssignment[];
};

export const GMS_FIRST_SEASON = '2026';

export const XII_GMS: XIIGeneralManager[] = [
  {
    id: 'GM001',
    displayName: 'steelersbyjoey',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'ANC',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM002',
    displayName: 'Longhorn91',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'AUS',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM003',
    displayName: 'Jmanna',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'BRV',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM004',
    displayName: 'Kdbevere',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'HON',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM005',
    displayName: 'JensDM',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'MEM',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM006',
    displayName: 'XaviH',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'MIA',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM007',
    displayName: 'Potpipe',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'NEV',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM008',
    displayName: 'SadRebel',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'NYE',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM009',
    displayName: 'Tourie',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'SAF',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM010',
    displayName: 'Termotsky',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'SAF',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM011',
    displayName: 'Yardgoat',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'SFO',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM012',
    displayName: 'Sanderdecuyeper',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'SEA',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  },
  {
    id: 'GM013',
    displayName: 'Boubacar91',
    sleeperUserId: null,
    previousNames: [],
    assignments: [
      {
        franchiseId: 'SDB',
        season: '2026',
        role: 'GM',
        status: 'active'
      }
    ]
  }
];

export function getGMs(): XIIGeneralManager[] {
  return [...XII_GMS].sort(
    (a, b) =>
      a.displayName.localeCompare(
        b.displayName,
        'en',
        { sensitivity: 'base' }
      ) || a.id.localeCompare(b.id)
  );
}

export function getGM(
  gmId: string
): XIIGeneralManager | undefined {
  const normalizedId =
    gmId.trim().toUpperCase();

  return XII_GMS.find(
    gm => gm.id === normalizedId
  );
}

export function getGMBySleeperUserId(
  sleeperUserId: string
): XIIGeneralManager | undefined {
  const normalizedId =
    sleeperUserId.trim();

  if (!normalizedId) {
    return undefined;
  }

  return XII_GMS.find(
    gm =>
      gm.sleeperUserId === normalizedId
  );
}

export function getGMAssignments(
  gmId: string,
  season?: string
): GMAssignment[] {
  const gm = getGM(gmId);

  if (!gm) {
    return [];
  }

  return gm.assignments
    .filter(
      assignment =>
        !season ||
        assignment.season === season
    )
    .sort(
      (a, b) =>
        b.season.localeCompare(a.season) ||
        (a.startWeek ?? 0) -
        (b.startWeek ?? 0)
    );
}

export function getGMsForSeason(
  season: string
): XIIGeneralManager[] {
  return getGMs().filter(
    gm =>
      gm.assignments.some(
        assignment =>
          assignment.season === season
      )
  );
}

export function getActiveGMsForSeason(
  season: string
): XIIGeneralManager[] {
  return getGMs().filter(
    gm =>
      gm.assignments.some(
        assignment =>
          assignment.season === season &&
          assignment.status === 'active'
      )
  );
}

export function getGMsByFranchise(
  franchiseId: string,
  season?: string,
  activeOnly: boolean = false
): XIIGeneralManager[] {
  const normalizedId =
    franchiseId.trim().toUpperCase();

  if (!getFranchise(normalizedId)) {
    return [];
  }

  return getGMs().filter(
    gm =>
      gm.assignments.some(
        assignment =>
          assignment.franchiseId ===
            normalizedId &&
          (
            !season ||
            assignment.season === season
          ) &&
          (
            !activeOnly ||
            assignment.status === 'active'
          )
      )
  );
}

export function getGMSeasons(
  gmId: string
): string[] {
  const gm = getGM(gmId);

  if (!gm) {
    return [];
  }

  return Array.from(
    new Set(
      gm.assignments.map(
        assignment => assignment.season
      )
    )
  ).sort(
    (a, b) => b.localeCompare(a)
  );
}

export function getGMFranchiseIds(
  gmId: string
): string[] {
  const gm = getGM(gmId);

  if (!gm) {
    return [];
  }

  return Array.from(
    new Set(
      gm.assignments.map(
        assignment =>
          assignment.franchiseId
      )
    )
  ).sort();
}

export function getGMFirstSeason(
  gmId: string
): string | null {
  const seasons = getGMSeasons(gmId);

  return seasons.length > 0
    ? seasons[seasons.length - 1]
    : null;
}

export function getGMLatestSeason(
  gmId: string
): string | null {
  const seasons = getGMSeasons(gmId);

  return seasons.length > 0
    ? seasons[0]
    : null;
}
