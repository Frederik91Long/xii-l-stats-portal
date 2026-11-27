import { getAdminAuth } from '@/lib/admin/auth';

import {
  getFranchises,
  getFranchise,
  getFranchiseRosterId,
  getFranchiseSeasonName
} from '@/lib/franchises';

import {
  validateAdminSeason,
  getAdminSeasonError
} from '@/lib/admin/seasons';

export type AdminFranchiseOption = {
  franchiseId: string;
  franchiseName: string;
  currentName: string;
  season: string;
  rosterId: number;
};

export type AdminFranchiseResult = {
  season: string;
  seasonName: string;
  totalFranchises: number;
  returnedResults: number;
  query: string;
  franchises: AdminFranchiseOption[];
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createFranchiseOption(
  franchiseId: string,
  season: string
): AdminFranchiseOption | null {
  const franchise = getFranchise(franchiseId);

  if (!franchise) {
    return null;
  }

  const rosterId = getFranchiseRosterId(
    franchise.id,
    season
  );

  const franchiseName = getFranchiseSeasonName(
    franchise.id,
    season
  );

  if (
    typeof rosterId !== 'number' ||
    !Number.isInteger(rosterId) ||
    rosterId < 1 ||
    !franchiseName
  ) {
    return null;
  }

  return {
    franchiseId: franchise.id,
    franchiseName,
    currentName: franchise.name,
    season,
    rosterId
  };
}

export async function getAdminFranchises(
  season: string,
  query: string = ''
): Promise<AdminFranchiseResult> {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error(
      'Administrator access required.'
    );
  }

  const validation =
    validateAdminSeason(season);

  if (!validation.valid) {
    throw new Error(
      getAdminSeasonError(validation.reason)
    );
  }

  const selectedSeason =
    validation.season.year;

  const cleanQuery =
    query.trim().slice(0, 100);

  const normalizedQuery =
    normalizeText(cleanQuery);

  const franchises: AdminFranchiseOption[] = [];

  for (const franchise of getFranchises()) {
    const option = createFranchiseOption(
      franchise.id,
      selectedSeason
    );

    if (option) {
      franchises.push(option);
    }
  }

  franchises.sort((a, b) =>
    a.franchiseName.localeCompare(
      b.franchiseName,
      'en'
    ) ||
    a.franchiseId.localeCompare(
      b.franchiseId
    )
  );

  const filteredFranchises =
    cleanQuery === ''
      ? franchises
      : franchises.filter(franchise => {
          if (!normalizedQuery) {
            return false;
          }

          const searchableText = normalizeText(
            [
              franchise.franchiseId,
              franchise.franchiseName,
              franchise.currentName
            ].join(' ')
          );

          return normalizedQuery
            .split(' ')
            .every(word =>
              searchableText.includes(word)
            );
        });

  return {
    season: selectedSeason,
    seasonName: validation.season.name,
    totalFranchises: franchises.length,
    returnedResults: filteredFranchises.length,
    query: cleanQuery,
    franchises: filteredFranchises
  };
}

export async function getAdminFranchise(
  franchiseId: string,
  season: string
): Promise<AdminFranchiseOption | null> {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error(
      'Administrator access required.'
    );
  }

  const validation =
    validateAdminSeason(season);

  if (!validation.valid) {
    throw new Error(
      getAdminSeasonError(validation.reason)
    );
  }

  const cleanFranchiseId =
    franchiseId.trim().toUpperCase();

  if (!cleanFranchiseId) {
    return null;
  }

  return createFranchiseOption(
    cleanFranchiseId,
    validation.season.year
  );
}
