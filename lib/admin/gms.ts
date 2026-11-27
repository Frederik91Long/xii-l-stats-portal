import { getAdminAuth } from '@/lib/admin/auth';

import {
  getGM,
  getGMsForSeason
} from '@/lib/gms';

import type {
  GMRole,
  GMStatus
} from '@/lib/gms';

import {
  getFranchise,
  getFranchiseSeasonName,
  getFranchiseRosterId
} from '@/lib/franchises';

import {
  validateAdminSeason,
  getAdminSeasonError
} from '@/lib/admin/seasons';

export type AdminGMOption = {
  gmId: string;
  displayName: string;
  previousNames: string[];
  sleeperUserId: string | null;
  franchiseId: string;
  franchiseName: string;
  rosterId: number;
  season: string;
  role: GMRole;
  status: GMStatus;
  startWeek: number | null;
  endWeek: number | null;
};

export type AdminGMStatusFilter =
  'ALL' | 'active' | 'former';

export type AdminGMResult = {
  season: string;
  seasonName: string;
  query: string;
  franchiseId: string | null;
  status: AdminGMStatusFilter;
  totalGMs: number;
  totalAssignments: number;
  returnedResults: number;
  gms: AdminGMOption[];
};

function normalizeText(
  value: string
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createGMOptions(
  gmId: string,
  season: string
): AdminGMOption[] {
  const gm = getGM(gmId);

  if (!gm) {
    return [];
  }

  const options: AdminGMOption[] = [];

  for (const assignment of gm.assignments) {
    if (assignment.season !== season) {
      continue;
    }

    const franchise = getFranchise(
      assignment.franchiseId
    );

    if (!franchise) {
      throw new Error(
        `Invalid franchise assignment for ${gm.id}.`
      );
    }

    const franchiseName =
      getFranchiseSeasonName(
        franchise.id,
        season
      );

    const rosterId =
      getFranchiseRosterId(
        franchise.id,
        season
      );

    if (
      !franchiseName ||
      typeof rosterId !== 'number' ||
      !Number.isInteger(rosterId) ||
      rosterId < 1
    ) {
      throw new Error(
        `Invalid season assignment for ${gm.id}.`
      );
    }

    options.push({
      gmId: gm.id,
      displayName: gm.displayName,
      previousNames: [...gm.previousNames],
      sleeperUserId: gm.sleeperUserId,
      franchiseId: franchise.id,
      franchiseName,
      rosterId,
      season,
      role: assignment.role,
      status: assignment.status,
      startWeek: assignment.startWeek ?? null,
      endWeek: assignment.endWeek ?? null
    });
  }

  return options;
}

function sortGMOptions(
  options: AdminGMOption[]
): AdminGMOption[] {
  return [...options].sort(
    (a, b) =>
      a.displayName.localeCompare(
        b.displayName,
        'en',
        { sensitivity: 'base' }
      ) ||
      a.gmId.localeCompare(b.gmId) ||
      a.franchiseName.localeCompare(
        b.franchiseName,
        'en'
      ) ||
      (a.startWeek ?? 0) -
      (b.startWeek ?? 0)
  );
}

export async function getAdminGMs(
  season: string,
  query: string = '',
  franchiseId: string = '',
  status: AdminGMStatusFilter = 'ALL'
): Promise<AdminGMResult> {
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

  const cleanFranchiseId =
    franchiseId.trim().toUpperCase();

  if (
    status !== 'ALL' &&
    status !== 'active' &&
    status !== 'former'
  ) {
    throw new Error(
      'Invalid GM status filter.'
    );
  }

  if (cleanFranchiseId) {
    const franchise =
      getFranchise(cleanFranchiseId);

    if (!franchise) {
      throw new Error(
        'Unknown franchise.'
      );
    }

    const rosterId =
      getFranchiseRosterId(
        cleanFranchiseId,
        selectedSeason
      );

    if (
      typeof rosterId !== 'number' ||
      !Number.isInteger(rosterId) ||
      rosterId < 1
    ) {
      throw new Error(
        'The selected franchise is not registered for this season.'
      );
    }
  }

  const seasonGMs =
    getGMsForSeason(selectedSeason);

  const allOptions: AdminGMOption[] = [];

  for (const gm of seasonGMs) {
    allOptions.push(
      ...createGMOptions(
        gm.id,
        selectedSeason
      )
    );
  }

  const filteredOptions =
    allOptions.filter(gm => {
      if (
        cleanFranchiseId &&
        gm.franchiseId !== cleanFranchiseId
      ) {
        return false;
      }

      if (
        status !== 'ALL' &&
        gm.status !== status
      ) {
        return false;
      }

      if (cleanQuery === '') {
        return true;
      }

      if (!normalizedQuery) {
        return false;
      }

      const searchableText = normalizeText(
        [
          gm.gmId,
          gm.displayName,
          ...gm.previousNames,
          gm.sleeperUserId ?? '',
          gm.franchiseId,
          gm.franchiseName
        ].join(' ')
      );

      return normalizedQuery
        .split(' ')
        .every(word =>
          searchableText.includes(word)
        );
    });

  const sortedOptions =
    sortGMOptions(filteredOptions);

  return {
    season: selectedSeason,
    seasonName: validation.season.name,
    query: cleanQuery,
    franchiseId: cleanFranchiseId || null,
    status,
    totalGMs: seasonGMs.length,
    totalAssignments: allOptions.length,
    returnedResults: sortedOptions.length,
    gms: sortedOptions
  };
}

export async function getAdminGM(
  gmId: string,
  season: string
): Promise<AdminGMOption[]> {
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

  const cleanGMId =
    gmId.trim().toUpperCase();

  if (!cleanGMId) {
    return [];
  }

  return sortGMOptions(
    createGMOptions(
      cleanGMId,
      validation.season.year
    )
  );
}
