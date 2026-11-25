export type FranchiseSeason = {
  rosterId: number;
  name: string;
};

export type XIIFranchise = {
  id: string;
  name: string;
  seasons: Record<string, FranchiseSeason>;
};

export const XII_FRANCHISES: XIIFranchise[] = [
  {
    id: 'AUS',
    name: 'Austin Ironhorns',
    seasons: {
      '2026': {
        rosterId: 1,
        name: 'Austin Ironhorns'
      }
    }
  },
  {
    id: 'MEM',
    name: 'Memphis Pharaohs',
    seasons: {
      '2026': {
        rosterId: 2,
        name: 'Memphis Pharaohs'
      }
    }
  },
  {
    id: 'MIA',
    name: 'Miami Viceroys',
    seasons: {
      '2026': {
        rosterId: 3,
        name: 'Miami Viceroys'
      }
    }
  },
  {
    id: 'ANC',
    name: 'Anchorage Killer Whales',
    seasons: {
      '2026': {
        rosterId: 4,
        name: 'Anchorage Killer Whales'
      }
    }
  },
  {
    id: 'SEA',
    name: 'Seattle Sunshines',
    seasons: {
      '2026': {
        rosterId: 5,
        name: 'Seattle Sunshines'
      }
    }
  },
  {
    id: 'BRV',
    name: 'Baton Rouge Voodoo',
    seasons: {
      '2026': {
        rosterId: 6,
        name: 'Baton Rouge Voodoo'
      }
    }
  },
  {
    id: 'SAF',
    name: 'San Antonio Fiesta',
    seasons: {
      '2026': {
        rosterId: 7,
        name: 'San Antonio Fiesta'
      }
    }
  },
  {
    id: 'HON',
    name: 'Honolulu Night Marchers',
    seasons: {
      '2026': {
        rosterId: 8,
        name: 'Honolulu Night Marchers'
      }
    }
  },
  {
    id: 'SDB',
    name: 'South Dakota Buffaloes',
    seasons: {
      '2026': {
        rosterId: 9,
        name: 'South Dakota Buffaloes'
      }
    }
  },
  {
    id: 'NYE',
    name: 'New York Empire',
    seasons: {
      '2026': {
        rosterId: 10,
        name: 'New York Empire'
      }
    }
  },
  {
    id: 'SFO',
    name: 'San Francisco Gold',
    seasons: {
      '2026': {
        rosterId: 11,
        name: 'San Francisco Gold'
      }
    }
  },
  {
    id: 'NEV',
    name: 'Nevada Vipers',
    seasons: {
      '2026': {
        rosterId: 12,
        name: 'Nevada Vipers'
      }
    }
  }
];

// Return all registered franchises
export function getFranchises(): XIIFranchise[] {
  return [...XII_FRANCHISES].sort(
    (a, b) => a.name.localeCompare(b.name)
  );
}

// Find a franchise by its permanent XII-L ID
export function getFranchise(
  franchiseId: string
): XIIFranchise | undefined {
  return XII_FRANCHISES.find(
    franchise =>
      franchise.id === franchiseId.toUpperCase()
  );
}

// Find a franchise using a season and Sleeper roster ID
export function getFranchiseByRoster(
  season: string,
  rosterId: number
): XIIFranchise | undefined {
  return XII_FRANCHISES.find(
    franchise =>
      franchise.seasons[season]?.rosterId === rosterId
  );
}

// Return the Sleeper roster ID for a specific season
export function getFranchiseRosterId(
  franchiseId: string,
  season: string
): number | undefined {
  return getFranchise(franchiseId)
    ?.seasons[season]?.rosterId;
}

// Return the historical franchise name
export function getFranchiseSeasonName(
  franchiseId: string,
  season: string
): string | undefined {
  return getFranchise(franchiseId)
    ?.seasons[season]?.name;
}

// Return all franchises active in a specific season
export function getFranchisesForSeason(
  season: string
): XIIFranchise[] {
  return getFranchises().filter(
    franchise => Boolean(franchise.seasons[season])
  );
}

// Return all registered seasons for a franchise
export function getFranchiseSeasons(
  franchiseId: string
): string[] {
  const franchise = getFranchise(franchiseId);

  if (!franchise) {
    return [];
  }

  return Object.keys(franchise.seasons).sort(
    (a, b) => Number(b) - Number(a)
  );
}
